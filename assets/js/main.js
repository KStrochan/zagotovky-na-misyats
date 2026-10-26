const hero = document.getElementById('hero');
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('solid', hero.getBoundingClientRect().bottom < 80);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Order form → /api/order (Vercel function → email), then the EasyPay payment step.
import { checkout } from './pay.js';
const form = document.getElementById('orderForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const st = document.getElementById('status');
  const data = Object.fromEntries(new FormData(form));
  if (!data.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.contact.trim())) { st.className = 'status err'; st.textContent = "Вкажіть ім'я і правильний email."; return; }
  st.className = 'status'; st.textContent = 'Надсилаємо…';
  try {
    const mode = await checkout(form, { site: 'Заготовки на місяць', product: data.product, price: '199 грн', amount: 199, name: data.name.trim(), contact: data.contact.trim(), comment: data.comment });
    if (mode === 'lead') { st.className = 'status ok'; st.textContent = 'Дякуємо! Ми надіслали підтвердження на ваш email.'; form.reset(); }
  } catch {
    st.className = 'status err'; st.textContent = 'Не вдалося надіслати заявку. Спробуйте ще раз за хвилину.';
  }
});
