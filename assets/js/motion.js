// Motion layer: hero intro, a "live" product preview, scroll reveals and a sticky buy bar on phones.
// Only opacity/transform are animated, so it stays smooth on mid-range phones.
// Everything is skipped for prefers-reduced-motion, and the page reads fine without this file.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- hero: words of the headline rise in one by one ----------
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
          w.append(i); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  el.querySelectorAll('.wi').forEach((w, k) => w.style.setProperty('--d', `${120 + k * 70}ms`));
}

// ---------- counters ----------
function countTo(el, to, { ms = 1100, decimals = 0, suffix = '' } = {}) {
  const fmt = (v) => v.toLocaleString('uk-UA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  if (reduced) { el.textContent = fmt(to); return Promise.resolve(); }
  return new Promise((done) => {
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
}

// ---------- live product previews (one per site; each checks its own markup) ----------
async function ledgerDemo() { // Кухня в цифрах: rows fill in, the total counts up, the food-cost verdict lands
  const ledger = document.querySelector('.hero .ledger');
  if (!ledger) return;
  const rows = [...ledger.querySelectorAll('li')], total = document.getElementById('ledgerTotal'), fc = document.getElementById('ledgerFc');
  const vals = rows.map((r) => parseFloat(r.lastElementChild.textContent.replace(',', '.')) || 0);
  rows.forEach((r) => r.classList.remove('on')); fc.classList.remove('on'); total.textContent = '0,00';
  await sleep(900);
  let sum = 0;
  for (let i = 0; i < rows.length; i++) {
    rows[i].classList.add('on', 'flash'); setTimeout(() => rows[i].classList.remove('flash'), 600);
    const from = sum; sum += vals[i];
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 380);
        total.textContent = (from + (sum - from) * p).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (p < 1) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    await sleep(160);
  }
  await sleep(250); fc.classList.add('on', 'pop');
}

async function freezerDemo() { // Заготовки: weekends light up and the pack counter climbs to 20
  const ui = document.querySelector('.hero .weeks-ui');
  if (!ui) return;
  const weeks = [...ui.querySelectorAll('[data-week]')], count = document.getElementById('packCount');
  weeks.forEach((w) => w.classList.remove('on')); count.textContent = '0 / 20';
  await sleep(900);
  for (let i = 0; i < weeks.length; i++) {
    weeks[i].classList.add('on', 'pop');
    const from = i * 5, t0 = performance.now();
    await new Promise((done) => {
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 420);
        count.textContent = `${Math.round(from + 5 * p)} / 20`;
        if (p < 1) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    await sleep(140);
  }
  ui.querySelector('.count').classList.add('pop');
}

async function promptDemo() { // Нейро: the [brackets] get filled, Claude "thinks", then the answer appears
  const card = document.querySelector('.hero .prompt-card');
  if (!card) return;
  const slots = [...card.querySelectorAll('.slotword')], answer = card.querySelector('.prompt-answer');
  answer.classList.add('wait');
  await sleep(1000);
  for (const s of slots) { s.classList.add('fill'); await sleep(450); }
  answer.classList.add('typing'); await sleep(1100);
  answer.classList.remove('typing', 'wait'); answer.classList.add('show');
}

// ---------- scroll reveals ----------
const REVEAL = [
  'section.block .kicker', 'section.block h2.title', 'section.block .lead',
  '.pain', '.product', '.bundle', '.steps li', '.flow li', '.label-card', '.stats > div',
  '.cat', '.tier', '.faq details', '.order form', '.inside > *',
];
function reveals() {
  const els = document.querySelectorAll(REVEAL.join(','));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach((el) => {
    if (el.closest('.hero')) return;
    const sibs = [...el.parentElement.children].filter((c) => c.matches(REVEAL.join(',')));
    el.style.setProperty('--rd', `${Math.min(sibs.indexOf(el), 5) * 80}ms`);
    el.classList.add('rv'); io.observe(el);
  });
  // numbers in stat blocks count up when they scroll in
  document.querySelectorAll('.stats b, .cat .n').forEach((b) => {
    const m = b.textContent.trim().match(/^(~?)(\d+)$/);
    if (!m) return;
    const to = +m[2], pre = m[1], pad = b.textContent.trim().length - pre.length;
    const o = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; o.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 900), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
        b.textContent = pre + String(v).padStart(pad, '0');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    o.observe(b);
  });
}

// ---------- sticky buy bar on phones ----------
function buyBar() {
  const hero = document.getElementById('hero');
  const cap = hero && hero.querySelector('.cap');
  const order = document.getElementById('order') || document.getElementById('checkout');
  if (!cap || !order) return;
  const bar = document.createElement('div');
  bar.className = 'm-buy'; bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = `<div class="m-buy-t"><b></b><small></small></div><a class="btn" href="#${order.id}" tabindex="-1"></a>`;
  const price = bar.querySelector('b'), name = bar.querySelector('small'), btn = bar.querySelector('.btn');
  const sync = () => {
    const m = cap.textContent.match(/\$\d+(?:\.\d+)?|\d[\d\s]*\s?грн/);
    price.textContent = m ? m[0].trim() : '';
    name.textContent = (document.querySelector('.logo')?.textContent || '').trim();
    btn.textContent = document.documentElement.lang === 'en' ? 'Buy now' : 'Купити';
  };
  sync();
  new MutationObserver(sync).observe(cap, { childList: true, characterData: true, subtree: true });
  document.body.append(bar);
  let heroGone = false, orderSeen = false;
  const update = () => bar.classList.toggle('show', heroGone && !orderSeen && !document.getElementById('landing')?.hidden);
  new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting; update(); }).observe(hero);
  new IntersectionObserver(([e]) => { orderSeen = e.isIntersecting; update(); }, { threshold: 0.05 }).observe(order);
}

// ---------- boot ----------
root.classList.add('motion');
if (!reduced) {
  const h1 = document.querySelector('.hero h1');
  if (h1) splitWords(h1);
  root.classList.add('intro');
  ledgerDemo(); freezerDemo(); promptDemo();
  reveals();
}
buyBar();
