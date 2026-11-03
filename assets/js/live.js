// Small touches that keep the page alive: videos that load only when they come into view and pause off screen,
// gentle parallax, sideways drift, a scroll progress line, buttons that lean toward the pointer, pictures that open up.
// With prefers-reduced-motion or data saver the posters stay still; without this file the page is simply static.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = !!(navigator.connection && navigator.connection.saveData);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function lazyVideos() {
  if (reduced || saveData) return;
  const big = matchMedia('(min-width:1024px)').matches;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (!v.dataset.loaded && v.dataset.src) { v.src = (big && v.dataset.srcLg) || v.dataset.src; v.dataset.loaded = '1'; }
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { rootMargin: '250px 0px' });
  document.querySelectorAll('video[data-src]').forEach((v) => { v.muted = true; io.observe(v); });
}

function revealMedia() {
  if (reduced) return;
  document.documentElement.classList.add('mr-on');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12 });
  document.querySelectorAll('.mr').forEach((el) => io.observe(el));
}

function scrollEffects() {
  if (reduced) return;
  const bar = document.createElement('div');
  bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  const wide = matchMedia('(min-width:768px)');
  const desk = matchMedia('(min-width:1024px)');
  const speeds = [...document.querySelectorAll('[data-speed]')];
  const drifts = [...document.querySelectorAll('[data-drift]')];
  const render = () => {
    const doc = document.documentElement, vh = innerHeight;
    bar.style.transform = `scaleX(${clamp(scrollY / (doc.scrollHeight - vh))})`;
    speeds.forEach((el) => {
      if (!wide.matches) { el.style.transform = ''; return; }
      const box = el.parentElement.getBoundingClientRect();
      if (box.bottom < -200 || box.top > vh + 200) return;
      el.style.transform = `translateY(${(box.top + box.height / 2 - vh / 2) * +el.dataset.speed}px)`;
    });
    drifts.forEach((el) => {
      if (!desk.matches) { el.style.transform = ''; return; }
      const box = el.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > vh) return;
      const p = clamp((vh - box.top) / (vh + box.height));
      el.style.transform = `translateX(${-p * Math.max(0, el.scrollWidth - el.parentElement.clientWidth)}px)`;
    });
  };
  let queued = false;
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render(); }); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  render();
}

function pointerEffects() {
  if (reduced || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  document.querySelectorAll('[data-mag]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .16}px,${(e.clientY - r.top - r.height / 2) * .28}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `perspective(900px) rotateY(${((e.clientX - r.left) / r.width - .5) * 7}deg) rotateX(${((e.clientY - r.top) / r.height - .5) * -7}deg) scale(1.02)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

lazyVideos();
revealMedia();
scrollEffects();
pointerEffects();
