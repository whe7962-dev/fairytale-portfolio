import { gsap } from 'gsap';

const SEEN_KEY = 'hexuan.intro.seen.v1';
const STAGES = ['black', 'wand', 'identity', 'landscape', 'butterflies'];
const LABELS = ['黑场', '白魔杖', '何选', '草地与神光', '白蝴蝶'];
const EASE = 'sine.inOut';

// Every asynchronous operation belongs to one run. Skip settles pending work,
// kills its tweens, and prevents late media events from reopening the overlay.
function operation(run, subscribe) {
  return new Promise((resolve) => {
    let settled = false;
    let cleanup;
    const finish = (value = true) => {
      if (settled) return;
      settled = true;
      run.signal.removeEventListener('abort', abort);
      cleanup?.();
      resolve(value);
    };
    const abort = () => finish(false);
    if (run.signal.aborted) return abort();
    run.signal.addEventListener('abort', abort, { once: true });
    cleanup = subscribe(finish);
    if (settled) cleanup?.();
  });
}

const hold = (run, seconds) => operation(run, (finish) => {
  const timer = setTimeout(finish, seconds * 1000);
  return () => clearTimeout(timer);
});

const fade = (run, target, vars) => operation(run, (finish) => {
  const tween = gsap.to(target, { ease: EASE, ...vars, onComplete: finish });
  return () => tween.kill();
});

export function setupIntro({ closeMenu, onOpen = () => {}, onReveal = () => {}, onClose = () => {} }) {
  const loader = document.querySelector('#loader');
  const shell = document.querySelector('#site-shell');
  const skipLink = document.querySelector('.skip-link');
  const main = document.querySelector('#main');
  const heroContent = document.querySelector('.hero-content');
  const replay = document.querySelector('[data-open-intro]');
  const skip = loader.querySelector('[data-skip-intro]');
  const scenes = Object.fromEntries(STAGES.map((stage) => [stage, loader.querySelector(`[data-loader-stage="${stage}"]`)]));
  const tabs = [...loader.querySelectorAll('[data-scene]')];
  const progress = [...loader.querySelectorAll('.intro-progress span')];
  const videos = [...loader.querySelectorAll('video')];
  const butterflies = [...loader.querySelectorAll('[data-intro-butterfly]')];
  const wings = [...loader.querySelectorAll('.butterfly-wings')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const listen = (element, event, handler) => element.addEventListener(event, handler, { signal: events.signal });
  let active;
  const alive = (run) => active === run && !run.signal.aborted;

  function setStage(stage) {
    loader.dataset.stage = stage;
    const index = STAGES.indexOf(stage);
    loader.querySelector('.loader-status').textContent = index < 0 ? '故事，正在继续' : `${String(index + 1).padStart(2, '0')} / ${LABELS[index]}`;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      scenes[STAGES[i]].setAttribute('aria-hidden', String(i !== index));
    });
    progress.forEach((segment, i) => segment.classList.toggle('is-reached', i <= index || stage === 'home'));
  }

  function selectScene(stage) {
    Object.entries(scenes).forEach(([id, scene]) => { scene.hidden = id !== stage; });
    setStage(stage);
  }

  function finish({ focus = true } = {}) {
    const run = active;
    if (!run) return;
    active = null;
    run.controller.abort();
    clearTimeout(run.deadline);
    run.ambient.forEach((tween) => tween.kill());
    videos.forEach((video) => {
      video.pause();
      video.hidden = true;
      video.removeAttribute('src');
      video.preload = 'none';
      video.load();
    });
    gsap.set([loader, heroContent, ...Object.values(scenes), ...butterflies, ...wings], { clearProps: 'opacity,transform,translate,rotate,scale,visibility' });
    loader.hidden = true;
    loader.dataset.stage = 'home';
    shell.inert = run.shellInert;
    skipLink.inert = run.skipInert;
    Object.assign(document.body.style, run.bodyStyle);
    document.documentElement.classList.remove('intro-open', 'intro-pending');
    window.scrollTo({ top: run.mode === 'preview' ? run.scrollY : 0, left: 0, behavior: 'instant' });
    onClose();
    if (focus) {
      const target = run.mode === 'preview' && run.trigger instanceof HTMLElement && run.trigger !== document.body ? run.trigger : main;
      target.focus({ preventScroll: true });
    }
  }

  function prepareVideo(run, video) {
    return operation(run, (done) => {
      const ready = () => done(true);
      const failed = () => done(false);
      const timeout = setTimeout(failed, 2500);
      video.addEventListener('loadeddata', ready, { once: true });
      video.addEventListener('error', failed, { once: true });
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = video.dataset.introSrc;
      video.load();
      return () => {
        clearTimeout(timeout);
        video.removeEventListener('loadeddata', ready);
        video.removeEventListener('error', failed);
      };
    });
  }

  async function startVideo(run, video, ready) {
    if (!await ready || !alive(run)) return false;
    const started = await operation(run, (done) => {
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; done(false); }, 1400);
      try {
        Promise.resolve(video.play()).then(() => {
          // A timed-out play() may resolve after the poster fallback began.
          if (!alive(run) || timedOut) {
            if (!active || active === run) video.pause();
            return;
          }
          done(true);
        }, () => done(false));
      } catch { done(false); }
      return () => clearTimeout(timeout);
    });
    if (!alive(run)) return false;
    if (started) video.hidden = false;
    else video.pause();
    return started;
  }

  function waitForVideoEnd(run, video) {
    if (video.ended || video.error) return Promise.resolve();
    return operation(run, (done) => {
      const ended = () => done();
      const remaining = Number.isFinite(video.duration) ? video.duration - video.currentTime + 0.8 : 5;
      const timeout = setTimeout(ended, Math.min(6, Math.max(1, remaining)) * 1000);
      video.addEventListener('ended', ended, { once: true });
      video.addEventListener('error', ended, { once: true });
      return () => {
        clearTimeout(timeout);
        video.removeEventListener('ended', ended);
        video.removeEventListener('error', ended);
      };
    });
  }

  async function transition(run, from, to, duration = 0.9, keepBackground = false) {
    if (!alive(run)) return;
    scenes[to].hidden = false;
    gsap.set(scenes[to], { opacity: 0 });
    setStage(to);
    await Promise.all([
      fade(run, scenes[to], { opacity: 1, duration }),
      keepBackground ? Promise.resolve() : fade(run, scenes[from], { opacity: 0, duration }),
    ]);
    if (alive(run) && !keepBackground) scenes[from].hidden = true;
  }

  async function play(run) {
    const wand = scenes.wand.querySelector('video');
    const landscape = scenes.landscape.querySelector('video');
    const wandReady = prepareVideo(run, wand);
    const landscapeReady = prepareVideo(run, landscape);
    await hold(run, 0.5);
    if (!alive(run)) return;
    const wandStarted = await startVideo(run, wand, wandReady);
    if (!alive(run)) return;
    await transition(run, 'black', 'wand', 0.65);
    if (!alive(run)) return;
    await (wandStarted ? waitForVideoEnd(run, wand) : hold(run, 1.5));
    if (!alive(run)) return;
    await transition(run, 'wand', 'identity', 1);
    if (!alive(run)) return;
    wand.pause();
    await hold(run, 1.5);
    if (!alive(run)) return;
    await startVideo(run, landscape, landscapeReady);
    if (!alive(run)) return;
    await transition(run, 'identity', 'landscape', 1.1);
    await hold(run, 1.7);
    if (!alive(run)) return;

    // A few foreground silhouettes pass over the same landscape. The source
    // already has distant flying elements; do not duplicate its video layer.
    gsap.set(butterflies, { y: 38, x: -18, opacity: 0 });
    butterflies.forEach((butterfly, index) => {
      run.ambient.push(gsap.to(butterfly, { y: -38 - index * 12, x: 20 + index * 10, opacity: 0.85, duration: 3.4, delay: index * 0.18, ease: 'sine.out' }));
      run.ambient.push(gsap.to(wings[index], { scaleX: 0.3, svgOrigin: '0 0', duration: 0.42 + index * 0.09, repeat: -1, yoyo: true, ease: EASE }));
    });
    await transition(run, 'landscape', 'butterflies', 0.8, true);
    await hold(run, 1.6);
    if (!alive(run)) return;
    setStage('home');
    onReveal();
    gsap.set(heroContent, { opacity: 0, y: 16 });
    await Promise.all([
      fade(run, loader, { opacity: 0, duration: 1.25 }),
      fade(run, heroContent, { opacity: 1, y: 0, duration: 1.25 }),
    ]);
    if (alive(run)) finish();
  }

  function open(mode = 'play') {
    if (active) finish({ focus: false });
    closeMenu();
    const controller = new AbortController();
    const bodyStyle = Object.fromEntries(['position', 'top', 'width', 'overflow'].map((key) => [key, document.body.style[key]]));
    const run = {
      controller, signal: controller.signal, ambient: [], mode,
      bodyStyle, scrollY: window.scrollY, trigger: document.activeElement,
      shellInert: shell.inert, skipInert: skipLink.inert,
    };
    onOpen();
    active = run;
    loader.dataset.mode = mode;
    loader.querySelector('#loader-title > span').textContent = mode === 'preview' ? '序章 · 静态分镜' : '故事，由此开始';
    selectScene('black');
    loader.hidden = false;
    shell.inert = true;
    skipLink.inert = true;
    document.documentElement.classList.add('intro-open');
    // The boot guard hides #app; remove it before trying to focus Skip.
    document.documentElement.classList.remove('intro-pending');
    Object.assign(document.body.style, { position: 'fixed', top: mode === 'preview' ? `-${run.scrollY}px` : '0px', width: '100%', overflow: 'hidden' });
    skip.focus({ preventScroll: true });
    if (mode === 'play') {
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* Storage may be disabled. */ }
      // A hard ceiling also covers an unexpected decoder or animation failure.
      run.deadline = setTimeout(() => { if (alive(run)) finish(); }, 25000);
      play(run).catch((error) => {
        console.warn('开场已回退到主页。', error);
        if (alive(run)) finish();
      });
    }
  }

  listen(replay, 'click', () => open(preference.matches ? 'preview' : 'play'));
  loader.querySelectorAll('[data-skip-intro]').forEach((button) => listen(button, 'click', () => finish()));
  tabs.forEach((tab) => listen(tab, 'click', () => { if (active?.mode === 'preview') selectScene(tab.dataset.scene); }));
  listen(loader, 'keydown', (event) => {
    if (active?.mode === 'preview' && event.target.matches('[data-scene]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const index = tabs.indexOf(event.target);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectScene(tabs[next].dataset.scene);
      tabs[next].focus();
    }
    if (event.key === 'Tab') {
      const focusable = [...loader.querySelectorAll('button:not([tabindex="-1"])')].filter((button) => button.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  listen(document, 'keydown', (event) => {
    if (active && event.key === 'Escape') { event.preventDefault(); finish(); }
  });
  listen(document, 'focusin', (event) => { if (active && !loader.contains(event.target)) skip.focus({ preventScroll: true }); });
  const updatePreference = () => {
    if (preference.matches && active?.mode === 'play') finish();
    replay.textContent = preference.matches ? '查看开场分镜' : '重播开场';
  };
  listen(preference, 'change', updatePreference);
  // A return from the back-forward cache should never restore a locked intro.
  listen(window, 'pagehide', () => finish({ focus: false }));
  updatePreference();
  const query = new URLSearchParams(location.search).get('intro');
  let seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* Play with normal fallback. */ }
  if (query === 'preview') open('preview');
  else if (!preference.matches && (query === 'play' || (!seen && !location.hash && query !== 'skip'))) open();
  document.documentElement.classList.remove('intro-pending');

  return () => {
    events.abort();
    finish({ focus: false });
  };
}
