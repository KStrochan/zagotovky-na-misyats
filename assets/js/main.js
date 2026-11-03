import { checkout, lemonCheckout, lemonUrl } from './pay.js?v=20261103a';
const SITE_NAME = 'Заготовки на місяць';
import { startPromo, price } from './promo.js?v=20261103a';

startPromo();

const hero = document.getElementById('hero');
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('solid', hero.getBoundingClientRect().bottom < 80);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Order form → /api/order (Vercel function → email), then the Lemon Squeezy checkout (or the EasyPay step if no checkout URL is set).
const form = document.getElementById('orderForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const st = document.getElementById('status');
  const data = Object.fromEntries(new FormData(form));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.contact.trim())) { st.className = 'status err'; st.textContent = 'Вкажіть правильний email.'; return; }
  st.className = 'status'; st.textContent = 'Надсилаємо…';
  try {
    if (lemonUrl()) {
      st.textContent = 'Відкриваємо оплату…';
      await lemonCheckout({ email: data.contact.trim(), site: SITE_NAME, onSuccess: () => { st.className = 'status ok'; st.textContent = 'Дякуємо! Файл можна завантажити у вікні оплати, посилання також прийшло на ваш email.'; } });
      setTimeout(() => { if (st.textContent === 'Відкриваємо оплату…') st.textContent = ''; }, 4000);
      return;
    }
    const mode = await checkout(form, { site: 'Заготовки на місяць', product: data.product, price: `${price()} грн`, amount: price(), name: '', contact: data.contact.trim(), comment: data.comment });
    if (mode === 'lead') { st.className = 'status ok'; st.textContent = 'Дякуємо! Ми надіслали підтвердження на ваш email.'; form.reset(); }
  } catch {
    st.className = 'status err'; st.textContent = 'Не вдалося надіслати заявку. Спробуйте ще раз за хвилину.';
  }
});
