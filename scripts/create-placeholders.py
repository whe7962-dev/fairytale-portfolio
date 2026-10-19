"""Create original, static local placeholders. Never run over final user assets.
Optional tooling for maintainers: Pillow, numpy, imageio-ffmpeg.
The app itself needs only npm install; generated assets are already included.
"""
from pathlib import Path
import math
import random
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets'
if (ROOT / 'docs' / 'media-manifest.json').exists():
    raise SystemExit('已接入用户素材，停止生成，避免覆盖视频与静帧。请使用 source-assets/ 中的原件进行后续处理。')
ART = OUT / 'placeholders'
ART.mkdir(parents=True, exist_ok=True)
random.seed(23)
W, H = 1920, 1080
Y, X = np.mgrid[0:H, 0:W]
rng = np.random.default_rng(11)
base = np.zeros((H, W, 3), dtype=float)
for c, (top, bottom) in enumerate(zip((29, 57, 47), (28, 49, 30))):
    base[:, :, c] = top + (bottom - top) * Y / H
light = np.exp(-(((X - 1370) / 430) ** 2 + ((Y - 300) / 310) ** 2))
for c, power in enumerate((82, 94, 78)):
    base[:, :, c] += light * power
base += rng.normal(0, 1.1, (H, W, 1))
im = Image.fromarray(np.uint8(np.clip(base, 0, 255)))

# Soft clouds and cool atmospheric shafts; all light is white / muted green.
clouds = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(clouds)
for _ in range(90):
    x = random.randint(200, W + 200); y = random.randint(180, 630)
    rx = random.randint(80, 280); ry = random.randint(10, 42)
    d.ellipse((x-rx, y-ry, x+rx, y+ry), fill=(200, 218, 198, random.randint(2, 12)))
im = Image.alpha_composite(im.convert('RGBA'), clouds.filter(ImageFilter.GaussianBlur(28)))
rays = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(rays)
for dx, width, opacity in [(0, 110, 11), (120, 48, 15), (-110, 28, 13)]:
    d.polygon([(1390+dx, 150), (1420+dx, 160), (1030+dx+width, H), (950+dx, H)], fill=(236, 246, 232, opacity))
im = Image.alpha_composite(im, rays.filter(ImageFilter.GaussianBlur(18)))

# Distant forest: many irregular boughs and multiple depth planes.
def pine(draw, x, bottom, height, color):
    draw.line([(x, bottom), (x, bottom-height)], fill=color, width=max(1, int(height/65)))
    for j in range(13):
        t = (j+1)/14
        yy = bottom-height+height*t
        half = height*.2*t*random.uniform(.75, 1.15)
        draw.polygon([(x, yy-height*.13), (x-half, yy+height*.075), (x+half, yy+height*.08)], fill=color)

for layer, (ground, height_range, color, blur) in enumerate([
    (660, (140, 280), (54, 83, 64, 150), 5),
    (705, (200, 390), (31, 63, 44, 205), 2),
    (780, (250, 470), (18, 46, 30, 255), 1),
]):
    trees = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(trees)
    for x in range(-30, W+40, 22):
        if 1100 < x < 1530 and layer > 0: continue
        h = random.randint(*height_range)
        # open sky around the light, dense trees on both sides
        if x < 900: h *= .65
        pine(d, x, ground+random.randint(-35, 30), h, color)
    im = Image.alpha_composite(im, trees.filter(ImageFilter.GaussianBlur(blur)))

# Curved meadow and footpath.
meadow = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(meadow)
points = [(0,H),(0,825)] + [(x,int(742+70*math.sin(x/390))) for x in range(0,W+1,12)] + [(W,H)]
d.polygon(points, fill=(30, 57, 34, 255))
path = [(1350, 702), (1359, 705), (1305, 758), (1250, 808), (1275, 850), (1420, 901), (1500, 1080), (1300, 1080), (1275, 930), (1170, 870), (1190, 810), (1280, 755)]
d.polygon(path, fill=(118, 139, 108, 100))
for _ in range(26000):
    x = random.randrange(W); y = random.randint(760, H-1)
    boundary = 742+70*math.sin(x/390)
    if y < boundary: continue
    h = random.uniform(2, 11)*(y/H)**2
    lightness = random.randrange(8, 31)
    if x > 1100: lightness += 12
    d.line([(x, y), (x+random.randint(-3, 3), y-h)], fill=(35+lightness, 58+lightness, 33+lightness, random.randrange(65, 180)), width=1)
im = Image.alpha_composite(im, meadow)

# Low fog, softly lit in the clearing.
fog = Image.new('RGBA', (W,H)); d = ImageDraw.Draw(fog)
for y, rx, alpha in [(660, 800, 20), (715, 680, 24), (780, 490, 14)]:
    d.ellipse((1300-rx,y-22,1300+rx,y+30),fill=(191,212,182,alpha))
im = Image.alpha_composite(im,fog.filter(ImageFilter.GaussianBlur(24)))

# Foreground framing branches, kept out of the title's negative space.
foreground = Image.new('RGBA',(W,H)); d = ImageDraw.Draw(foreground)
d.polygon([(0,0),(92,0),(77,350),(46,730),(0,1000)],fill=(7,24,16,255))
d.line([(30,270),(180,120),(410,40),(530,-10)], fill=(8,26,17,255), width=24)
d.line([(1870,0),(1885,325),(1920,690)],fill=(8,25,16,255),width=58)
for side in [0,1]:
    for _ in range(560):
        x=random.gauss(160 if side==0 else 1840,170); y=random.gauss(20,95)
        r=random.randint(6,23)
        d.ellipse((x-r,y-r,x+r,y+r),fill=(random.randint(7,15),random.randint(24,38),random.randint(17,25),235))
im = Image.alpha_composite(im,foreground.filter(ImageFilter.GaussianBlur(.6)))
im.convert('RGB').save(OUT/'hero-grassland.jpg', quality=90, optimize=True)

SVG_HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">'
ART.joinpath('portal.svg').write_text(SVG_HEAD + '''
<defs><radialGradient id="bg"><stop stop-color="#45664e"/><stop offset="1" stop-color="#11291d"/></radialGradient><linearGradient id="door" x2="0" y2="1"><stop stop-color="#a1b59b"/><stop offset="1" stop-color="#2b4931"/></linearGradient><linearGradient id="floor" x2="0" y2="1"><stop stop-color="#9eaf93" stop-opacity=".5"/><stop offset="1" stop-color="#152e20" stop-opacity="0"/></linearGradient></defs>
<path fill="url(#bg)" d="M0 0h800v1000H0z"/><path d="M189 790V402a211 211 0 0 1 422 0v388" fill="#142d20" stroke="#789073" stroke-width="2"/><path d="M210 790V402a190 190 0 0 1 380 0v388" fill="none" stroke="#58704f" stroke-width="1"/><path d="M240 790V402a160 160 0 0 1 320 0v388" fill="url(#door)"/><path d="M260 790 90 1000h620L540 790" fill="url(#floor)"/><path d="M240 775h320M240 790h320M225 810h350" stroke="#8eaa82" fill="none"/>
<g stroke="#cad5c2" stroke-opacity=".36" fill="none"><path d="M400 240v550M240 415h320"/><circle cx="400" cy="410" r="57"/><path d="M382 410h36m-18-18v36"/></g><path d="M88 850c45-120 32-270 74-394M712 848c-37-100-20-240-72-350" stroke="#344d35" fill="none" stroke-width="7"/><g fill="#314b33"><ellipse cx="115" cy="664" rx="19" ry="65" transform="rotate(-34 115 664)"/><ellipse cx="145" cy="560" rx="20" ry="60" transform="rotate(27 145 560)"/><ellipse cx="675" cy="658" rx="22" ry="70" transform="rotate(28 675 658)"/></g></svg>''')

ART.joinpath('carriage.svg').write_text(SVG_HEAD + '''
<defs><radialGradient id="bg"><stop stop-color="#294a34"/><stop offset="1" stop-color="#0f2519"/></radialGradient><radialGradient id="pumpkin"><stop stop-color="#c9a227" stop-opacity=".23"/><stop offset="1" stop-color="#c9a227" stop-opacity=".01"/></radialGradient></defs><path fill="url(#bg)" d="M0 0h800v1000H0z"/>
<ellipse cx="400" cy="730" rx="240" ry="25" fill="#091c12" opacity=".7"/>
<!-- GOLD IS EXCLUSIVELY THE PUMPKIN CARRIAGE ITSELF. -->
<g stroke="#C9A227" fill="none" stroke-width="2" opacity=".88"><ellipse cx="401" cy="515" rx="161" ry="168" fill="url(#pumpkin)"/><ellipse cx="401" cy="515" rx="113" ry="168"/><ellipse cx="401" cy="515" rx="54" ry="168"/><path d="M253 471c69-22 223-22 294 0M260 576c82 32 198 32 280 0M290 654h224M275 667h252M311 681h180M350 352c8-43 95-43 103 0M383 322c-26-32 23-58 36-31 15 31-20 22-13 5"/>
<path fill="#183322" d="M357 592v-105a44 44 0 0 1 88 0v105Z"/><path d="M400 450v142M359 503h85"/><circle cx="316" cy="700" r="59"/><circle cx="316" cy="700" r="49"/><circle cx="506" cy="700" r="59"/><circle cx="506" cy="700" r="49"/><circle cx="316" cy="700" r="7"/><circle cx="506" cy="700" r="7"/>
<path d="M316 642v116M258 700h116M275 659l82 82M275 741l82-82M506 642v116M448 700h116M465 659l82 82M465 741l82-82M373 700h75M565 698c76-3 86-52 60-59-23-6-28 20-10 21M245 650c-77-14-91-74-56-87 35-13 46 30 23 33"/>
<path d="m397 344-3-18 9-7 10 7-3 18M256 437l-24-24m-3-16v32m-14-16h28M550 435l23-22m3-16v32m-14-16h28"/></g>
<g stroke="#a8b5a0" opacity=".16" fill="none"><path d="M70 820c35-69 31-128 10-190M730 820c-35-69-31-128-10-190M115 855h570"/><circle cx="400" cy="500" r="270"/></g></svg>''')

ART.joinpath('botanical.svg').write_text(SVG_HEAD + '''
<defs><radialGradient id="bg"><stop stop-color="#3a5840"/><stop offset="1" stop-color="#12291e"/></radialGradient><linearGradient id="leaf"><stop stop-color="#6d896a"/><stop offset="1" stop-color="#243f2c"/></linearGradient></defs><path fill="url(#bg)" d="M0 0h800v1000H0z"/>
<circle cx="420" cy="395" r="119" fill="#ced8c7" opacity=".1"/><circle cx="420" cy="395" r="94" fill="#dfe5d7" opacity=".08"/>
<g stroke="#a8b5a0" fill="none" opacity=".4"><path d="M160 780V370a240 240 0 0 1 480 0v410M178 780V370a222 222 0 0 1 444 0v410"/><path d="M200 800h400"/></g>
<path d="M378 820c15-93 62-175 21-270-31-72-14-133 45-190" fill="none" stroke="#8caa80" stroke-width="3"/>
<g fill="url(#leaf)" stroke="#8caa80" stroke-width=".6"><path d="M403 690c-120-6-166-64-149-122 105 1 160 41 149 122Z"/><path d="M415 637c109-3 157-68 138-122-106 11-148 57-138 122Z"/><path d="M398 548c-82-12-127-73-97-118 90 21 114 60 97 118Z"/><path d="M397 476c83-2 128-43 118-94-82 7-118 46-118 94Z"/><path d="M416 395c-42-53-23-105 28-127 39 55 19 99-28 127Z"/></g>
<g stroke="#b5c4a8" stroke-width="1" fill="none" opacity=".5"><path d="m272 587 131 103m12-53 124-103m-221-87 80 101m-1-72 102-79m-69-111-14 109"/></g></svg>''')

ART.joinpath('portrait.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800"><defs><radialGradient id="bg" cx="50%" cy="36%" r="65%"><stop stop-color="#57745a"/><stop offset=".5" stop-color="#2d4b36"/><stop offset="1" stop-color="#132a1c"/></radialGradient><linearGradient id="shape" x2="0" y2="1"><stop stop-color="#6b8668"/><stop offset="1" stop-color="#223d28"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="20"/></filter></defs><path fill="url(#bg)" d="M0 0h640v800H0z"/><ellipse cx="330" cy="285" rx="135" ry="175" fill="#b7c8a7" opacity=".09" filter="url(#blur)"/><circle cx="320" cy="300" r="76" fill="url(#shape)"/><path d="M145 676c0-159 58-255 175-255s175 96 175 255" fill="url(#shape)"/><path d="M100 690V300a220 220 0 0 1 440 0v390" fill="none" stroke="#b2c2a5" opacity=".15"/><path d="M60 800c35-92 44-183 12-282m508 282c-35-92-44-183-12-282" fill="none" stroke="#6a8560" opacity=".4"/><g fill="#243f2a"><ellipse cx="70" cy="640" rx="15" ry="55" transform="rotate(-35 70 640)"/><ellipse cx="90" cy="703" rx="18" ry="60" transform="rotate(26 90 703)"/><ellipse cx="565" cy="654" rx="18" ry="68" transform="rotate(30 565 654)"/></g></svg>''')

ART.joinpath('wand.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><radialGradient id="glow"><stop stop-color="#f7faf6" stop-opacity=".18"/><stop offset="1" stop-color="#f7faf6" stop-opacity="0"/></radialGradient><linearGradient id="crystal"><stop stop-color="#f7faf6"/><stop offset=".5" stop-color="#adc3b8"/><stop offset="1" stop-color="#f7faf6"/></linearGradient></defs><ellipse cx="805" cy="360" rx="230" ry="220" fill="url(#glow)"/><g transform="rotate(25 800 450)"><path d="M795 350h10l-2 310h-6Z" fill="url(#crystal)"/><path d="m800 223 23 76-23 54-23-54Z" stroke="#f7faf6" fill="#f7faf6" fill-opacity=".19"/><path d="m800 223 0 130m-23-54h46" stroke="#f7faf6" stroke-opacity=".8"/><path d="M786 355h28m-26 8h24" stroke="#f7faf6"/></g><g fill="#f7faf6"><circle cx="731" cy="301" r="1.3"/><circle cx="860" cy="254" r="1"/><circle cx="909" cy="349" r="1.5"/><circle cx="727" cy="411" r="1"/></g></svg>''')

ART.joinpath('butterflies.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><g id="butterfly" fill="#f7faf6"><path d="M0 0c-14-33-39-32-33-7 3 13 17 14 33 7Z"/><path d="M0 0c14-33 39-32 33-7C30 6 16 7 0 0Z"/><path d="M0 1c-21-5-27 17-13 16C-5 16-2 8 0 1Zm0 0c21-5 27 17 13 16C5 16 2 8 0 1Z"/><path d="M0-8v23" stroke="#f7faf6" stroke-width="2"/></g></defs><use href="#butterfly" transform="translate(1010 390) rotate(-18)" opacity=".88"/><use href="#butterfly" transform="translate(1175 510) rotate(24) scale(.6)" opacity=".7"/><use href="#butterfly" transform="translate(800 540) rotate(-30) scale(.4)" opacity=".55"/><use href="#butterfly" transform="translate(1280 280) rotate(8) scale(.35)" opacity=".6"/></svg>''')

# Valid, silent, one-second still MP4s; hidden/preload=none in this stage.
# They provide real replaceable files, not empty files or broken URLs.
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
for filename, color in [('loader-wand.mp4','0x080d0a'),('hero-godrays.mp4','0x1f3d2e'),('butterflies-loop.mp4','0x0c1a14'),('pumpkin-spawn.mp4','0x12291b')]:
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','lavfi','-i',f'color=c={color}:s=640x360:r=24:d=1','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/filename)], check=True)
print('Created 5 replaceable media assets and 6 original static SVG placeholders.')
