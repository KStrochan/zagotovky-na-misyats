const hero = document.getElementById('hero');
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('solid', hero.getBoundingClientRect().bottom < 80);
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
