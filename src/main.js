import './styles.css';
import { content } from './content.js';
import { setupMotion } from './motion.js';
import { setupIntro } from './intro.js';

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const star = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 1c0 11-4 15-15 15 11 0 15 4 15 15 0-11 4-15 15-15C20 16 16 12 16 1Z"/></svg>';
const chapter = (number, english, chinese) => `<div class="chapter"><span>${number}</span><span class="chapter-line"></span><span>${english}</span><span class="chapter-chinese">${chinese}</span></div>`;
const asset = (file) => `${import.meta.env.BASE_URL}assets/${file}`;
const learningTopics = content.learning.map((topic, index) => `
  <details class="learning-topic" id="learning-${topic.id}">
    <summary>
      <span class="topic-number" aria-hidden="true">0${index + 1}</span>
      <span class="topic-overview"><span class="topic-english">${escapeHTML(topic.english)}</span><span class="topic-title">${escapeHTML(topic.title)}</span><span class="topic-preview">${topic.preview.map(escapeHTML).join(' / ')}</span></span>
      <span class="topic-action"><span class="learning-status">已学习</span><span class="expand-label"><span class="when-closed">展开清单</span><span class="when-open">收起清单</span><span class="expand-icon" aria-hidden="true"></span></span></span>
    </summary>
    <div class="topic-details"><p>已学习的知识与工具</p><ul>${topic.tools.map((tool) => `<li>${escapeHTML(tool)}</li>`).join('')}</ul></div>
  </details>`).join('');

document.querySelector('#app').innerHTML = `
  <a class="skip-link" href="#main">跳至主要内容</a>

  <!-- 00 · 序章：由 intro.js 编排；静态分镜仍可单独预览。 -->
  <section id="loader" class="loader" role="dialog" aria-modal="true" aria-labelledby="loader-title" hidden>
    <header class="loader-header"><span id="loader-title">PROLOGUE <span>故事，由此开始</span></span><button class="text-button" type="button" data-skip-intro>跳过开场 <span>SKIP ↗</span></button></header>
    <div class="loader-scenes">
      <div class="loader-scene loader-black" data-loader-stage="black" role="tabpanel" id="scene-black" aria-labelledby="tab-black"></div>
      <div class="loader-scene loader-wand" data-loader-stage="wand" role="tabpanel" id="scene-wand" aria-labelledby="tab-wand" hidden>
        <img src="${asset('loader-wand-poster.jpg')}" alt="所提供魔杖视频中的月光白水晶魔杖" width="1920" height="1080" />
        <video data-intro-src="${asset('loader-wand.mp4')}" poster="${asset('loader-wand-poster.jpg')}" muted playsinline preload="none" aria-hidden="true" tabindex="-1" hidden></video>
      </div>
      <div class="loader-scene loader-identity" data-loader-stage="identity" role="tabpanel" id="scene-identity" aria-labelledby="tab-identity" hidden>
        <p class="eyebrow">A STORY OF MY OWN</p><h2>${escapeHTML(content.name)}</h2><p>${escapeHTML(content.loaderIntro)}</p>
      </div>
      <div class="loader-scene loader-landscape" data-loader-stage="landscape" role="tabpanel" id="scene-landscape" aria-labelledby="tab-landscape" hidden>
        <img src="${asset('hero-grassland.jpg')}" alt="所提供草地视频的月光色调静帧" width="1280" height="720" />
        <!-- 完整草地镜头持续到蝴蝶阶段，播放一次后保留尾帧。 -->
        <video data-intro-src="${asset('hero-godrays.mp4')}" poster="${asset('hero-grassland.jpg')}" data-composition="full-scene" muted playsinline preload="none" aria-hidden="true" tabindex="-1" hidden></video>
      </div>
      <div class="loader-scene loader-butterflies" data-loader-stage="butterflies" role="tabpanel" id="scene-butterflies" aria-labelledby="tab-butterflies" hidden>
        <img class="loader-background" src="${asset('hero-grassland.jpg')}" alt="月光下的草地视频静帧" width="1280" height="720" />
        <img class="butterfly-image" src="${asset('placeholders/butterflies.svg')}" alt="月光白蝴蝶静态占位" />
        <div class="intro-butterflies" aria-hidden="true">
          ${[0, 1, 2].map((i) => `<span class="intro-butterfly intro-butterfly-${i}" data-intro-butterfly><svg viewBox="-40 -40 80 80"><g class="butterfly-wings"><path d="M0 0C-14-33-39-32-33-7-30 6-16 7 0 0ZM0 0C14-33 39-32 33-7 30 6 16 7 0 0ZM0 1C-21-5-27 17-13 16-5 16-2 8 0 1ZM0 1C21-5 27 17 13 16 5 16 2 8 0 1Z"/></g><path class="butterfly-body" d="M0-8V15"/></svg></span>`).join('')}
        </div>
        <!-- 独立蝴蝶 MP4 仍为纯色占位，不加载；暂用三只月光白 SVG。 -->
      </div>
    </div>
    <footer class="loader-footer">
      <p class="loader-status" role="status">01 / 黑场</p>
      <div class="intro-progress" aria-hidden="true">${Array.from({ length: 5 }, () => '<span></span>').join('')}</div>
      <div class="storyboard" role="tablist" aria-label="静态开场分镜">
        ${[['black', '黑场'], ['wand', '白魔杖'], ['identity', '姓名'], ['landscape', '草地与神光'], ['butterflies', '白蝴蝶']].map(([id, title], i) => `<button type="button" role="tab" id="tab-${id}" data-scene="${id}" aria-controls="scene-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}"><span>0${i + 1}</span>${title}</button>`).join('')}
      </div>
      <button type="button" class="text-button" data-skip-intro>进入主页 ${arrow}</button>
    </footer>
  </section>

  <div id="site-shell">
    <header class="site-header">
      <a href="#hero" class="brand" aria-label="何选 · 回到首页"><span class="brand-symbol">${star}</span><span>${escapeHTML(content.englishName)}<small>AI · PRODUCT · POSSIBILITY</small></span></a>
      <nav class="main-nav" aria-label="主导航">
        <a href="#learning"><span>01</span> 学习与实践</a><a href="#works"><span>02</span> 项目记录</a><a href="#about"><span>03</span> 关于我</a><a href="#contact"><span>04</span> 联系</a>
      </nav>
      <a href="mailto:${escapeHTML(content.contact.email)}" class="header-contact" aria-label="给何选发邮件">LET’S CONNECT ${arrow}</a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav">目录 <span>＋</span></button>
    </header>
    <nav id="mobile-nav" class="mobile-nav" aria-label="移动端导航" hidden>
      <a href="#hero">序章 / 首页</a><a href="#learning">01 / 学习与实践</a><a href="#works">02 / 项目记录</a><a href="#about">03 / 关于我</a><a href="#contact">04 / 联系</a>
    </nav>

    <main id="main" tabindex="-1">
      <!-- 01 · Hero：底图、神光、蝴蝶分层，视频留给下一阶段。 -->
      <section id="hero" class="hero" aria-labelledby="hero-title" data-chapter="hero">
        <div class="hero-backdrop" aria-hidden="true">
          <img class="hero-landscape" src="${asset('hero-grassland.jpg')}" alt="" width="1280" height="720" fetchpriority="high" />
          <div class="hero-shade"></div>
          <video data-media="godrays" src="${asset('hero-godrays.mp4')}" poster="${asset('hero-grassland.jpg')}" data-composition="full-scene" muted playsinline loop preload="none" tabindex="-1" hidden></video>
          <video data-media="butterflies" src="${asset('butterflies-loop.mp4')}" muted playsinline loop preload="none" tabindex="-1" hidden></video>
        </div>
        <div class="hero-content">
          <p class="eyebrow"><span class="tiny-star">✦</span> FROM CURIOSITY TO POSSIBILITY</p>
          <div class="hero-name"><h1 id="hero-title">${escapeHTML(content.name)}</h1><span aria-hidden="true">He Xuan</span></div>
          <p class="hero-role"><span>求职方向</span>${escapeHTML(content.role)}</p>
          <div class="hero-copy"><span class="vertical-rule"></span><div><p>${escapeHTML(content.intro)}</p><p>${escapeHTML(content.heroNote)}</p></div></div>
          <div class="hero-actions"><a class="button button-primary" href="#learning">学习与实践 ${arrow}</a><a class="text-link" href="#contact">联系我 <span>↗</span></a></div>
        </div>
        <div class="hero-side-note" aria-hidden="true"><span>THE FIRST CHAPTER</span><span class="side-line"></span><span>01 — 05</span></div>
        <div class="hero-bottom"><p><span class="status-dot"></span> ${escapeHTML(content.target)} · 求职中</p><a class="scroll-cue" href="#learning"><span class="scroll-icon"></span> SCROLL TO DISCOVER</a><span class="hero-edition">LEARNING <span>·</span> PRACTICE <span>·</span> REFLECTION</span></div>
      </section>

      <!-- 02 · 学习与实践：按已学习展示，完整清单按需展开。 -->
      <section id="learning" class="learning section" aria-labelledby="learning-title" data-chapter="learning">
        ${chapter('01', 'LEARNING & PRACTICE', '学习与实践')}
        <div class="section-heading"><div><p class="eyebrow">CONNECTING THE DOTS</p><h2 id="learning-title">把知识连起来，<br>再走向实践。</h2></div><p>这些，是我已经学习的内容。<br><span>具体应用记录将随笔记、练习与项目逐步补充。</span></p></div>
        <div class="learning-topics">${learningTopics}</div>
      </section>

      <!-- 03 · 项目记录：尚无完成项目，只保留一处预告。金色仅在南瓜车本体。 -->
      <section id="works" class="works section" aria-labelledby="works-title" data-chapter="works">
        ${chapter('02', 'IDEAS INTO PRACTICE', '项目记录')}
        <div class="project-preview"><div class="project-preview-copy"><p class="eyebrow">THE NEXT CHAPTER</p><h2 id="works-title">${escapeHTML(content.projectPreview.title)}</h2><p class="section-english">A new chapter, <em>to be written.</em></p><p class="project-preview-description">${escapeHTML(content.projectPreview.description)}</p></div><div class="project-preview-art" aria-hidden="true"><img src="${asset('placeholders/carriage.svg')}" alt="" width="800" height="1000" loading="lazy"/><video data-media="pumpkin" src="${asset('pumpkin-spawn.mp4')}" muted playsinline preload="none" tabindex="-1" hidden></video></div></div>
      </section>

      <!-- 04 · 关于我：只展示已经确认的背景，不保留虚构经历和照片占位。 -->
      <section id="about" class="about section" aria-labelledby="about-title" data-chapter="about">
        ${chapter('03', 'THE PERSON BEHIND', '关于我')}
        <div class="about-grid"><div class="about-copy"><p class="eyebrow">A LITTLE ABOUT ME</p><h2 id="about-title">${content.about.heading.map(escapeHTML).join('<br>')}</h2><div class="body-copy">${content.about.paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join('')}</div></div><div class="about-profile"><span class="profile-name">${escapeHTML(content.name)} <small>${escapeHTML(content.englishName)}</small></span><dl class="profile-facts"><div><dt>求职方向</dt><dd>${escapeHTML(content.target)}</dd></div><div><dt>学历</dt><dd>${escapeHTML(content.about.education)}</dd></div><div><dt>公众号</dt><dd>${escapeHTML(content.about.publicAccount)}</dd></div></dl><a class="text-link underlined" href="#contact">与我联系 ${arrow}</a></div></div>
      </section>

      <!-- 05 · 联系与结尾 -->
      <section id="contact" class="contact section" aria-labelledby="contact-title" data-chapter="contact">
        ${chapter('04', 'THE NEXT CHAPTER', '联系 / 结尾')}
        <div class="contact-content"><span class="contact-star">${star}</span><p class="eyebrow">GOOD STORIES BEGIN WITH A HELLO</p><h2 id="contact-title">聊聊 AI，<br>也聊聊下一步。</h2><p class="contact-english">Every possibility <em>begins with a hello.</em></p><p class="muted">${escapeHTML(content.contact.note)}</p>
          <div class="contact-methods"><div class="contact-method"><a href="mailto:${escapeHTML(content.contact.email)}"><span class="method-label">EMAIL / 邮箱</span><span class="method-value">${escapeHTML(content.contact.email)} ${arrow}</span></a><button type="button" class="text-button" data-copy="email" aria-describedby="copy-status">复制邮箱</button></div><div class="contact-method"><a href="tel:${escapeHTML(content.contact.phone)}"><span class="method-label">PHONE / 电话</span><span class="method-value">${escapeHTML(content.contact.phone)} ${arrow}</span></a><button type="button" class="text-button" data-copy="phone" aria-describedby="copy-status">复制电话</button></div></div>
          <p id="copy-status" class="copy-status" role="status"></p>
        </div>
        <footer class="site-footer"><div><span>${escapeHTML(content.englishName)}</span><small>© ${new Date().getFullYear()} · LEARNING, BUILDING, BECOMING</small></div><span class="footer-note">何选 · AI 产品学习与实践</span><div class="footer-links"><button type="button" class="text-button" data-open-intro>重播开场</button><a href="#hero">回到首页 ↑</a></div></footer>
      </section>
    </main>
  </div>`;

// 导航与当前章节标记；平滑定位和章节入场由 motion.js 管理。
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const closeMenu = () => {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
};
menuToggle.addEventListener('click', () => {
  mobileNav.hidden = !mobileNav.hidden;
  menuToggle.setAttribute('aria-expanded', String(!mobileNav.hidden));
});
mobileNav.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
const desktopQuery = window.matchMedia('(min-width: 761px)');
desktopQuery.addEventListener('change', (event) => { if (event.matches) closeMenu(); });

const sections = [...document.querySelectorAll('[data-chapter]')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll('.main-nav a, .mobile-nav a').forEach((link) => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-20% 0px -55% 0px', threshold: 0 });
sections.forEach((section) => observer.observe(section));

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    const key = button.dataset.copy;
    const label = key === 'email' ? '邮箱' : '电话';
    try {
      await navigator.clipboard.writeText(content.contact[key]);
      status.textContent = `${label}已复制。`;
    } catch {
      status.textContent = `暂时无法复制，请选中${label}手动复制。`;
    }
  });
});

const motion = setupMotion();
const disposeIntro = setupIntro({ closeMenu, onOpen: motion.pause, onClose: motion.resume });
if (document.querySelector('#loader').hidden) motion.resume();
if (import.meta.hot) import.meta.hot.dispose(() => { motion.dispose(); disposeIntro(); observer.disconnect(); });
