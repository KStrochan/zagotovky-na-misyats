import { createStory } from './story.js';
import { buildFreezer } from './freezer-scene.js';

const story = document.getElementById('story');
const weeks = [...story.querySelectorAll('[data-week]')];
const countEl = document.getElementById('packCount');
const weekStart = [0.16, 0.34, 0.52, 0.70];

// Hand-written labels are drawn onto textures, so wait for the fonts first.
const fontsReady = Promise.all([
  document.fonts.load("700 64px Caveat"), document.fonts.load("800 64px Rubik"), document.fonts.load("600 34px Nunito"),
]).catch(() => {});
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
  createStory({
    section: story,
    build: buildFreezer,
    offset: { wide: [-0.2, 0], tall: [0, 0.26] },
    onProgress(p) {
      let n = 0;
      weekStart.forEach((a, row) => { for (let col = 0; col < 5; col++) if (p >= a + col * 0.022 + 0.03) n++; });
      countEl.textContent = `${n} / 20`;
      weeks.forEach((w, i) => w.classList.toggle('on', p >= weekStart[i]));
      story.classList.toggle('scrolled', p > 0.02);
    },
  });
});

const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('solid', story.getBoundingClientRect().bottom < 80);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const form = document.getElementById('orderForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const st = document.getElementById('status');
  const data = Object.fromEntries(new FormData(form));
  if (!data.name.trim() || !data.contact.trim()) { st.className = 'status err'; st.textContent = "Вкажіть ім'я і Telegram або телефон."; return; }
  st.className = 'status'; st.textContent = 'Надсилаємо…';
  try {
    const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, site: 'Заготовки на місяць' }) });
    if (!r.ok) throw new Error();
    st.className = 'status ok'; st.textContent = 'Дякуємо! Ми напишемо вам найближчим часом.';
    form.reset();
  } catch {
    st.className = 'status err'; st.textContent = 'Не вдалося надіслати заявку. Спробуйте ще раз за хвилину.';
  }
});
