// One silent video drives the landscape. Pause decoding outside the first screen.
export function setupHeroBackground() {
  const hero = document.querySelector('#hero');
  const video = hero.querySelector('[data-hero-video]');
  const toggle = hero.querySelector('[data-toggle-background]');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const listen = (target, type, handler) => target.addEventListener(type, handler, { signal: events.signal });
  let active = false;
  let inView = false;
  let pageAvailable = true;
  let wantsMotion = !preference.matches;
  let blocked = false;
  let failed = false;
  let pending = false;
  let attempt = 0;
  let disposed = false;

  const shouldPlay = () => !disposed && active && inView && pageAvailable && !document.hidden && wantsMotion && !failed;
  function updateButton() {
    toggle.hidden = failed;
    toggle.textContent = wantsMotion && !blocked ? '暂停背景' : '播放背景';
    toggle.setAttribute('aria-label', `${toggle.textContent}动画`);
  }
  function stop() {
    attempt += 1;
    pending = false;
    video.pause();
  }
  async function sync() {
    updateButton();
    if (!shouldPlay()) { stop(); return; }
    if (blocked || pending || !video.paused) return;
    const id = ++attempt;
    pending = true;
    try {
      if (!video.hasAttribute('src')) {
        video.src = video.dataset.heroSrc;
        video.preload = 'auto';
        video.load();
      }
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      await video.play();
      if (id !== attempt || disposed) return;
      if (!shouldPlay()) stop();
    } catch (error) {
      if (id !== attempt || disposed) return;
      // Keep the poster and offer a direct user gesture when autoplay is denied.
      if (error.name !== 'AbortError') blocked = true;
    } finally {
      if (id === attempt && !disposed) { pending = false; updateButton(); }
    }
  }
  listen(video, 'playing', () => {
    if (!shouldPlay()) { stop(); return; }
    blocked = false;
    video.classList.add('is-ready');
    updateButton();
  });
  listen(video, 'error', () => {
    failed = true;
    video.classList.remove('is-ready');
    sync();
  });
  listen(toggle, 'click', () => {
    wantsMotion = blocked || !wantsMotion;
    blocked = false;
    sync();
  });
  listen(preference, 'change', () => {
    wantsMotion = !preference.matches;
    blocked = false;
    sync();
  });
  listen(document, 'visibilitychange', sync);
  listen(window, 'pagehide', () => { pageAvailable = false; stop(); });
  listen(window, 'pageshow', () => { pageAvailable = true; sync(); });

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  observer.observe(hero);
  updateButton();

  return {
    pause() { active = false; stop(); },
    resume() {
      active = true;
      // The intro can restore scroll position before IntersectionObserver fires.
      const bounds = hero.getBoundingClientRect();
      inView = bounds.bottom > 0 && bounds.top < innerHeight;
      sync();
    },
    dispose() {
      disposed = true;
      events.abort();
      observer.disconnect();
      stop();
      video.removeAttribute('src');
      video.load();
    },
  };
}
