const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Language (VI is written in the HTML, EN comes from i18n.js) ----------
let lang = 'vi';
try { lang = localStorage.getItem('lang') === 'en' ? 'en' : 'vi'; } catch (e) { /* storage blocked */ }

function numberSuffix(el) {
  return (lang === 'en' && el.dataset.suffixEn !== undefined ? el.dataset.suffixEn : el.dataset.suffix) || '';
}

const META = {
  vi: { title: 'Long Thị Tuyết Trinh | Content Creator Portfolio', emptyLink: 'Đường dẫn trang sẽ được cập nhật' },
  en: { title: 'Long Thi Tuyet Trinh | Content Creator Portfolio', emptyLink: 'Page link coming soon' },
};

function applyLang(next) {
  lang = next;
  document.documentElement.lang = lang;
  document.title = META[lang].title;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    if (el.dataset.vi === undefined) el.dataset.vi = el.innerHTML;
    const en = I18N_EN[el.dataset.i18n];
    el.innerHTML = lang === 'en' && en ? en : el.dataset.vi;
  });
  // numbers: re-render final values with the right unit
  document.querySelectorAll('[data-count]').forEach((el) => {
    const d = parseInt(el.dataset.decimals || '0', 10);
    el.textContent = (el.dataset.prefix || '') + parseFloat(el.dataset.count).toFixed(d) + numberSuffix(el);
  });
  document.querySelectorAll('.case__link.is-empty').forEach((a) => { a.title = META[lang].emptyLink; });
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  try { localStorage.setItem('lang', lang); } catch (e) { /* storage blocked */ }
}

document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));
if (lang === 'en') applyLang('en');

// Count numbers up from zero, keeping the prefix/suffix written in data-*
function countUp(el) {
  const to = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const prefix = el.dataset.prefix || '';
  const suffix = numberSuffix(el);
  const duration = 1800;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = prefix + (to * eased).toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Reveal blocks as they enter the viewport; bars and counters start at the same time
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    if (!reduceMotion) e.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(e.target);
  });
}, { threshold: 0.18 });
document.querySelectorAll('.reveal, .stagger:not(.reveal .stagger)').forEach((el) => io.observe(el));

// Nav switches to its light style once the sentinel near the top of the cover leaves the viewport.
// Scroll progress and cover parallax are CSS scroll-driven animations (see styles.css).
const nav = document.querySelector('.nav');
new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting))
  .observe(document.querySelector('.nav-sentinel'));

// Highlight the nav link whose section crosses the upper third of the viewport
const links = [...document.querySelectorAll('.nav__links a')];
const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
const activeIo = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a === byId.get(e.target.id)));
  });
}, { rootMargin: '-35% 0px -60% 0px' });
['cover', 'contents', 'about', 'project', 'contact'].forEach((id) => activeIo.observe(document.getElementById(id)));

// Gentle tilt on phone mockups following the pointer (desktop only)
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.case__media, .case__phones').forEach((stage) => {
    stage.style.transition = 'transform .6s cubic-bezier(.22,.8,.24,1)';
    stage.addEventListener('pointermove', (ev) => {
      const r = stage.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5;
      const y = (ev.clientY - r.top) / r.height - 0.5;
      stage.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
    });
    stage.addEventListener('pointerleave', () => { stage.style.transform = ''; });
  });
}

// Page links still pointing at "#" are shown dimmed and do nothing until a real URL is added
document.querySelectorAll('.case__link').forEach((a) => {
  if (a.getAttribute('href') === '#' || !a.getAttribute('href')) {
    a.classList.add('is-empty');
    a.setAttribute('aria-disabled', 'true');
    a.title = META[lang].emptyLink;
    a.addEventListener('click', (ev) => ev.preventDefault());
  }
});

// Reel cards: hovering (or tapping the thumbnail) loads Facebook's embedded player into the card and asks it
// to autoplay muted. Facebook may ignore autoplay, in which case the viewer presses play inside the player.
// Leaving the card removes the player again so the page stays light.
const isTouch = window.matchMedia('(hover: none)').matches;
document.querySelectorAll('.reel').forEach((card) => {
  const url = card.dataset.reel;
  const media = card.querySelector('.reel__media');
  if (!url || url === '#') { card.classList.add('is-empty'); return; }

  const load = () => {
    if (media.querySelector('iframe')) return;
    const w = Math.round(media.clientWidth) || 270;
    const src = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(url) +
      '&show_text=false&width=' + w + '&autoplay=' + (reduceMotion ? 'false' : 'true') + '&mute=1';
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = 'Facebook reel';
    frame.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    card.classList.add('is-loading');
    frame.addEventListener('load', () => { card.classList.remove('is-loading'); card.classList.add('is-playing'); });
    media.appendChild(frame);
  };
  const unload = () => {
    card.classList.remove('is-playing', 'is-loading');
    media.querySelector('iframe')?.remove();
  };

  media.addEventListener('click', load);
  if (!isTouch) {
    card.addEventListener('pointerenter', load);
    card.addEventListener('pointerleave', unload);
  }
});


// Thank-you section: a short, restrained firework show (canvas-confetti) each time it scrolls into view; click for one more burst
const thanks = document.getElementById('thanks');
if (thanks) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const COLORS = ['#cdb78e', '#e6d9bd', '#ffffff', '#b8935a'];
  const burst = (x, y, n = 70) => {
    if (typeof confetti !== 'function' || reduceMotion) return;
    confetti({
      particleCount: n, spread: 360, startVelocity: rnd(20, 30), ticks: 90, gravity: 0.8, decay: 0.92,
      scalar: rnd(0.8, 1.1), shapes: ['circle'], colors: COLORS, origin: { x, y }, zIndex: 50, disableForReducedMotion: true,
    });
  };
  let show = null;
  const fireworks = (ms = 4500) => {
    if (reduceMotion) return;
    clearInterval(show);
    const end = Date.now() + ms;
    burst(0.5, 0.35, 110);
    show = setInterval(() => {
      if (Date.now() > end) return clearInterval(show);
      burst(rnd(0.15, 0.85), rnd(0.12, 0.5), Math.round(rnd(50, 80)));
    }, 650);
  };

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { thanks.classList.add('is-live'); fireworks(); }
    else { thanks.classList.remove('is-live'); clearInterval(show); }
  }, { threshold: 0.4 }).observe(thanks);

  thanks.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('a, .foot')) return;
    burst(ev.clientX / window.innerWidth, ev.clientY / window.innerHeight, 80);
  });
}
