import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const motionConfig = Object.freeze({
  smoothScroll: true,
  duration: 1.25,
  revealDuration: 0.9,
  revealDistance: 18,
  ease: 'sine.inOut',
});

// Animate meaningful blocks, never an entire long section or individual words.
// Hero is owned by the intro; page motion begins with the following chapters.
const REVEAL_BLOCKS = [
  '.section > .chapter', '.section-heading > *', '.learning-topic',
  '.project-preview-copy', '.project-preview-art',
  '.about-copy > .eyebrow', '.about-copy > h2', '.body-copy > p', '.about-profile',
  '.contact-content > .contact-star', '.contact-content > .eyebrow',
  '.contact-content > h2', '.contact-content > .contact-english',
  '.contact-content > .muted', '.contact-methods',
].join(', ');
const cinematicEase = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export function setupMotion() {
  const root = document.querySelector('#main');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const listen = (element, type, handler) => element.addEventListener(type, handler, { signal: events.signal });
  const blocks = [...root.querySelectorAll(REVEAL_BLOCKS)];
  const revealed = new WeakSet();
  const animations = new Map();
  const chapters = [...root.querySelectorAll('[data-chapter]')];
  const originalTabIndexes = chapters.map((chapter) => chapter.getAttribute('tabindex'));
  chapters.forEach((chapter) => chapter.setAttribute('tabindex', '-1'));
  let lenis;
  let context;
  let active = false;
  let disposed = false;
  let pageAvailable = true;
  let refreshFrame = 0;

  const tick = (time) => lenis?.raf(time * 1000);

  function revealNow(block) {
    revealed.add(block);
    animations.get(block)?.progress(1);
  }

  function revealDestination(target) {
    const section = target.closest('[data-chapter]');
    if (!section) return;
    blocks.filter((block) => section.contains(block)).forEach(revealNow);
  }

  function currentHashTarget() {
    try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch { return null; }
  }

  function queueRefresh() {
    if (!active || disposed || preference.matches || refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      if (!active || disposed || preference.matches) return;
      lenis?.resize();
      ScrollTrigger.refresh();
    });
  }

  function teardown() {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = 0;
    gsap.ticker.remove(tick);
    if (lenis) {
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      lenis = undefined;
    }
    // Revert restores original styles and removes only this context's triggers.
    context?.revert();
    context = undefined;
    animations.clear();
  }

  function start() {
    if (!active || disposed || preference.matches || context) return;
    if (motionConfig.smoothScroll) {
      lenis = new Lenis({
        duration: motionConfig.duration,
        easing: cinematicEase,
        smoothWheel: true,
        syncTouch: false,
        autoRaf: false,
        // Custom anchors preserve URL history, focus and modifier-click behavior.
        // Installed Lenis reads CSS scroll-padding-top for the fixed header.
        anchors: false,
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }
    context = gsap.context(() => {
      blocks.forEach((block) => {
        if (revealed.has(block) || !block.getClientRects().length) return;
        if (block.getBoundingClientRect().top < innerHeight * 0.88) {
          revealed.add(block);
          return;
        }
        const tween = gsap.fromTo(block, {
          opacity: 0,
          y: innerWidth <= 760 ? 12 : motionConfig.revealDistance,
        }, {
          opacity: 1,
          y: 0,
          duration: motionConfig.revealDuration,
          ease: motionConfig.ease,
          onComplete: () => {
            revealed.add(block);
            gsap.set(block, { clearProps: 'opacity,transform,translate,rotate,scale' });
          },
          scrollTrigger: {
            trigger: block,
            start: 'top 88%',
            once: true,
            onLeave: (trigger) => trigger.animation?.progress(1),
          },
        });
        animations.set(block, tween);
      });
    }, root);
    queueRefresh();
  }

  function pause() {
    active = false;
    // Release momentum before the intro fixes the body so replay cannot pull
    // the page back to the footer after it returns to the hero.
    teardown();
  }

  function resume() {
    if (disposed || !pageAvailable) return;
    active = true;
    start();
    queueRefresh();
  }

  listen(document, 'click', (event) => {
    if (!lenis || !active || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); }
    catch { return; }
    if (!target) return;
    event.preventDefault();
    if (url.hash !== location.hash) history.pushState(history.state, '', url.hash);
    lenis.scrollTo(target, {
      immediate: link.classList.contains('skip-link'),
      onComplete: () => {
        if (!active || disposed) return;
        revealDestination(target);
        target.focus({ preventScroll: true });
      },
    });
  });

  // Reveal a focused block immediately. Native navigation keys can interrupt
  // wheel inertia; neither opacity nor animation may hide a keyboard target.
  listen(root, 'focusin', (event) => {
    blocks.filter((block) => block.contains(event.target)).forEach(revealNow);
  });
  listen(document, 'keydown', (event) => {
    if (!lenis || !active || event.defaultPrevented || event.target.isContentEditable || event.target.closest('input, textarea, select')) return;
    if (lenis.isScrolling === 'smooth' && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
      lenis.stop();
      lenis.start();
    }
  });
  const syncHistory = () => {
    lenis?.scrollTo(window.scrollY, { immediate: true });
    const target = currentHashTarget();
    if (target) revealDestination(target);
    queueRefresh();
  };
  listen(window, 'popstate', syncHistory);
  listen(window, 'hashchange', syncHistory);
  listen(preference, 'change', () => { teardown(); start(); });
  listen(window, 'pagehide', () => { pageAvailable = false; pause(); });
  listen(window, 'pageshow', () => {
    pageAvailable = true;
    if (document.querySelector('#loader').hidden) resume();
  });

  const resizeObserver = new ResizeObserver(queueRefresh);
  resizeObserver.observe(root);
  resizeObserver.observe(document.querySelector('.site-header'));
  root.querySelectorAll('details').forEach((details) => listen(details, 'toggle', queueRefresh));
  document.fonts.ready.then(queueRefresh);
  const initialTarget = currentHashTarget();
  if (initialTarget) revealDestination(initialTarget);

  return {
    pause,
    resume,
    dispose() {
      disposed = true;
      pause();
      events.abort();
      resizeObserver.disconnect();
      chapters.forEach((chapter, index) => {
        if (originalTabIndexes[index] === null) chapter.removeAttribute('tabindex');
        else chapter.setAttribute('tabindex', originalTabIndexes[index]);
      });
    },
  };
}
