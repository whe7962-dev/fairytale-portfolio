"""Create a forward-playing, softly joined loop from the graded landscape clip.

Run after replacing hero-godrays.mp4. Requires imageio-ffmpeg.
The intro clip and original supplied media are never modified.
"""
from pathlib import Path
import subprocess
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/hero-godrays.mp4'
OUTPUT = ROOT / 'public/assets/hero-ambient.mp4'
STAGING = OUTPUT.with_suffix('.tmp.mp4')
reader = imageio_ffmpeg.read_frames(str(SOURCE))
metadata = next(reader)
reader.close()
fps = 24
duration = round(metadata['duration'] * fps) / fps
fade = min(0.75, int(duration * fps / 4) / fps)
if fade < 1 / fps:
    raise SystemExit('The landscape clip is too short to loop.')

# Blend the tail into the head, then rotate the cycle to start after the head.
# All motion stays forward; the loop boundary joins consecutive source frames.
graph = (
    f'[0:v]fps={fps},settb=AVTB,split=3[m][t][h];'
    f'[m]trim=start={fade}:end={duration - fade},setpts=PTS-STARTPTS[middle];'
    f'[t]trim=start={duration - fade}:end={duration},setpts=PTS-STARTPTS,fps={fps},settb=AVTB[tail];'
    f'[h]trim=end={fade},setpts=PTS-STARTPTS,fps={fps},settb=AVTB[head];'
    f'[tail][head]xfade=transition=fade:duration={fade}:offset=0[blend];'
    '[middle][blend]concat=n=2:v=1:a=0,format=yuv420p[out]'
)
try:
    subprocess.run([
        imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y',
        '-i', str(SOURCE), '-filter_complex', graph, '-map', '[out]', '-an',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-r', str(fps),
        '-movflags', '+faststart', str(STAGING),
    ], check=True)
    STAGING.replace(OUTPUT)
finally:
    STAGING.unlink(missing_ok=True)
print(f'Created {OUTPUT.name}: {duration - fade:.2f}s, {OUTPUT.stat().st_size:,} bytes')
