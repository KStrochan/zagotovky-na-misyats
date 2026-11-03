// Motion layer: frost grows over the hero and clears as the picture thaws, slow snow, the freezer that
// fills on scroll, the «what's for dinner» picker, word-by-word headings and the phone buy bar.
// Only opacity/transform/filter are animated. Without this file, or with prefers-reduced-motion,
// the page shows the full freezer and every weekend as plain content.
import { price } from './promo.js?v=20261103a';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - Math.pow(1 - t, 3);

function splitWords(el, base = 0, step = 70) {
  const frag = document.createDocumentFragment();
  el.textContent.split(/([ \t\r\n]+)/).forEach((part) => {
    if (!part) return;
    if (/^[ \t\r\n]+$/.test(part)) { frag.append(part); return; }
    const w = document.createElement('span'); w.className = 'w';
    const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
    w.append(i); frag.append(w);
  });
  el.textContent = ''; el.append(frag);
  el.querySelectorAll('.wi').forEach((w, k) => w.style.setProperty('--d', `${base + k * step}ms`));
}

// ---------- hero ----------
function heroVideo() {
  const v = document.querySelector('.hero-media video');
  if (!v) return;
  if (reduced) { v.remove(); return; } // the poster frame stays
  v.addEventListener('playing', () => v.classList.add('on'), { once: true });
  v.play().catch(() => {});
}

function canvasFor(cls) {
  const hero = document.getElementById('hero');
  const c = document.createElement('canvas');
  c.className = cls; c.setAttribute('aria-hidden', 'true');
  hero.querySelector('.hero-media').after(c);
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const size = () => { c.width = hero.clientWidth * dpr; c.height = hero.clientHeight * dpr; };
  size();
  return { c, ctx: c.getContext('2d'), dpr, size, hero };
}

// Crystals branch in from the edges, then the whole layer melts away.
function frost() {
  const { c, ctx, dpr } = canvasFor('frost');
  const W = c.width, H = c.height;
  const branches = [];
  const seed = (x, y, a, len, depth) => branches.push({ x, y, a, len, depth, born: (5 - depth) * 150 + Math.random() * 200 });
  const grow = (b) => {
    if (b.depth <= 0) return;
    const ex = b.x + Math.cos(b.a) * b.len, ey = b.y + Math.sin(b.a) * b.len;
    const n = b.depth > 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) / 2) * (.62 + Math.random() * .3);
      const kid = { x: ex, y: ey, a: b.a + spread, len: b.len * (.62 + Math.random() * .16), depth: b.depth - 1, born: b.born + 140 + Math.random() * 90 };
      branches.push(kid); grow(kid);
    }
  };
  const step = Math.max(84, W / 17);
  const jit = () => (Math.random() - .5) * step * .9, len = () => (34 + Math.random() * 46) * dpr;
  for (let x = 0; x < W; x += step) { seed(x + jit(), 0, Math.PI / 2 + (Math.random() - .5) * 1.4, len(), 5); seed(x + jit(), H, -Math.PI / 2 + (Math.random() - .5) * 1.4, len(), 5); }
  for (let y = 0; y < H; y += step) { seed(0, y + jit(), (Math.random() - .5) * 1.4, len(), 5); seed(W, y + jit(), Math.PI + (Math.random() - .5) * 1.4, len(), 5); }
  [...branches].forEach(grow);
  branches.sort((p, q) => p.born - q.born);
  const GROW = 1500, MELT = 1500, t0 = performance.now();
  let drawn = 0;
  ctx.lineCap = 'round';
  const tick = (t) => {
    const e = t - t0;
    while (drawn < branches.length && branches[drawn].born <= e) {
      const b = branches[drawn++];
      ctx.strokeStyle = `rgba(226,242,252,${.28 + b.depth * .12})`;
      ctx.lineWidth = Math.max(.6, b.depth * .55) * dpr;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(b.a) * b.len, b.y + Math.sin(b.a) * b.len); ctx.stroke();
    }
    c.style.opacity = e < GROW ? 1 : clamp(1 - (e - GROW) / MELT);
    if (e < GROW + MELT) requestAnimationFrame(tick); else c.remove();
  };
  requestAnimationFrame(tick);
}

function snow() {
  const { c, ctx, dpr, size, hero } = canvasFor('snow');
  let visible = true;
  const count = innerWidth < 768 ? 26 : 60;
  const flakes = Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), r: .7 + Math.random() * 2.2, s: .012 + Math.random() * .03, d: Math.random() * 6.28 }));
  addEventListener('resize', size);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(tick); }).observe(hero);
  let last = performance.now();
  function tick(t) {
    if (!visible) return;
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const f of flakes) {
      f.y += f.s * dt; if (f.y > 1.02) { f.y = -.02; f.x = Math.random(); }
      const x = (f.x + Math.sin(t / 2600 + f.d) * .012) * c.width, y = f.y * c.height;
      ctx.fillStyle = `rgba(238,246,251,${.2 + f.r * .16})`;
      ctx.beginPath(); ctx.arc(x, y, f.r * dpr, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function rotWords() {
  const el = document.querySelector('.hero .rot');
  if (!el) return;
  const words = el.dataset.words.split('|');
  if (reduced) { el.textContent = words.join(' '); el.classList.add('static'); return; }
  el.textContent = '';
  const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = words.join(' ');
  el.append(sr);
  const spans = words.map((w) => { const s = document.createElement('span'); s.textContent = w; s.setAttribute('aria-hidden', 'true'); el.append(s); return s; });
  let i = 0; spans[0].classList.add('on');
  setInterval(() => {
    const prev = spans[i];
    prev.classList.remove('on'); prev.classList.add('out');
    i = (i + 1) % spans.length;
    spans[i].classList.remove('out'); spans[i].classList.add('on');
    setTimeout(() => prev.classList.remove('out'), 300);
  }, 2000);
}

// ---------- scene: four weekends fill the freezer ----------
function freezerScene() {
  const scene = document.getElementById('weekends');
  if (!scene) return null;
  root.classList.add('js-scene');
  const drawers = [...scene.querySelectorAll('.drawer')];
  const packs = drawers.map((d) => [...d.querySelectorAll('.pack')]);
  const big = scene.querySelector('.big'), steps = [...scene.querySelectorAll('.steps-stack li')];
  const N = 5, narrow = matchMedia('(max-width:1023px)');
  let current = -1;
  return function render() {
    const r = scene.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    const seg = p * N, s = Math.min(N - 1, Math.floor(seg)), t = seg - s;
    let filled = 0;
    drawers.forEach((d, i) => {
      const local = i < s ? 1 : i > s ? 0 : clamp(t / .78);
      const open = i === s && s < 4 ? Math.sin(Math.PI * clamp(t)) : 0;
      d.style.transform = `translateX(${open * (narrow.matches ? 2 : 5)}%) scale(${1 + open * .035})`;
      d.style.zIndex = open > .01 ? 2 : 1;
      packs[i].forEach((el, k) => {
        const q = clamp((local - k * .17) / .32), e = ease(q);
        el.style.opacity = clamp(q * 3);
        el.style.transform = `translateY(${(1 - e) * -46}px) scale(${1.25 - .25 * e})`;
        filled += e;
      });
    });
    big.textContent = `${Math.round(filled)} / 20`;
    if (s !== current) { current = s; steps.forEach((el, i) => el.classList.toggle('on', i === s)); }
  };
}

// ---------- what's for dinner ----------
function dinner() {
  const box = document.getElementById('tonight');
  if (!box) return;
  const name = box.querySelector('.dinner-name'), how = box.querySelector('.dinner-how'), card = box.querySelector('.dinner');
  const picks = [...box.querySelectorAll('.pick')];
  picks.forEach((b) => b.addEventListener('click', () => {
    picks.forEach((o) => o.setAttribute('aria-pressed', o === b));
    name.textContent = b.textContent;
    how.textContent = b.dataset.how;
    if (reduced) return;
    card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
  }));
}

// ---------- reveals ----------
const REVEAL = '.lead,.picks,.dinner,.num-grid>div,.parts>div,.fit>div,.steps li,.recap-list li,.price-now,#orderForm,.faq details,.final p,.final .btn';
function reveals() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  document.querySelectorAll(REVEAL).forEach((el) => {
    const sibs = [...el.parentElement.children];
    el.style.setProperty('--rd', `${Math.min(sibs.indexOf(el), 5) * 80}ms`);
    el.classList.add('rv'); io.observe(el);
  });
  document.querySelectorAll('.title,.final h2').forEach((el) => {
    splitWords(el, 0, 60); el.classList.add('split'); io.observe(el);
  });
  const fan = document.querySelector('.fan');
  if (fan) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { fan.classList.add('in'); o.disconnect(); } }, { threshold: .35 }).observe(fan);
  document.querySelectorAll('[data-count]').forEach((b) => {
    const to = +b.dataset.count, pre = b.dataset.pre || '', post = b.dataset.post || '';
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return; o.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const k = clamp((t - t0) / 1300);
        b.textContent = pre + Math.round(to * ease(k)) + post;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: .5 }).observe(b);
  });
}

// ---------- sticky buy bar on phones ----------
function buyBar() {
  const hero = document.getElementById('hero'), order = document.getElementById('order');
  if (!hero || !order) return;
  const bar = document.createElement('div');
  bar.className = 'm-buy'; bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = `<div><b>${price()} грн</b><small>гайд «Морозилка на місяць»</small></div><a class="btn" href="#order" tabindex="-1">Купити</a>`;
  document.body.append(bar);
  let heroGone = false, orderSeen = false;
  const update = () => bar.classList.toggle('show', heroGone && !orderSeen);
  new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting; update(); }).observe(hero);
  new IntersectionObserver(([e]) => { orderSeen = e.isIntersecting; update(); }, { threshold: .05 }).observe(order);
}

// ---------- boot ----------
heroVideo();
rotWords();
dinner();
buyBar();
if (!reduced) {
  root.classList.add('motion');
  splitWords(document.querySelector('.hero h1'), 500, 90);
  root.classList.add('intro');
  frost(); snow(); reveals();
  const render = freezerScene();
  let queued = false;
  const frame = () => { queued = false; if (render) render(); };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  frame();
}
