// Two-step checkout without online acquiring:
// 1) the buyer leaves a contact → /api/order notifies Telegram and returns the payee card (env PAY_CARD);
// 2) the buyer pays by card-to-card transfer in EasyPay and taps «Я оплатив» → Telegram gets a second note.
// If PAY_CARD is not set on the server, the form behaves as a plain pre-order.

const EASYPAY_URL = 'https://easypay.ua/ua';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtCard = (c) => String(c).replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

async function post(payload) {
  const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error('send');
  return j;
}

/**
 * @param {HTMLFormElement} form  the order form; its contents are replaced by the payment step
 * @param {object} o  { site, product, price: '599 грн', amount: 599, name, contact, comment, onDone }
 * @returns {Promise<'pay'|'lead'>}  'pay' when payment details were shown, 'lead' for a plain pre-order
 */
export async function checkout(form, o) {
  const j = await post({ site: o.site, product: o.product, name: o.name, contact: o.contact, comment: o.comment || '', stage: 'lead' });
  if (!j.card) return 'lead';
  const card = fmtCard(j.card);
  form.classList.add('paying');
  form.innerHTML = `
    <div class="pay-step">Крок 2 з 2 · оплата</div>
    <div class="order-line"><span>${esc(o.product.replace(/ — .*$/, ''))}</span><b>${o.price}</b></div>
    <ol class="pay-how">
      <li>Відкрийте EasyPay і оберіть <b>«Переказ на картку»</b>.</li>
      <li>Вставте номер картки й суму <b>${o.amount} грн</b>.</li>
      <li>Оплатіть будь-якою банківською карткою.</li>
    </ol>
    <div class="pay-card"><span class="pay-label">Картка отримувача</span><b class="pay-num">${card}</b>
      <button type="button" class="btn ghost-dark sm" data-copy>Скопіювати</button></div>
    <a class="btn" href="${EASYPAY_URL}" target="_blank" rel="noopener">Оплатити через EasyPay</a>
    <button type="button" class="btn line-btn" data-paid>Я оплатив(ла)</button>
    <div class="status" role="status" aria-live="polite"></div>
    <p class="note">Комісія EasyPay — 1% + 5 грн. Можна також поповнити картку готівкою в терміналі EasyPay. Після оплати натисніть «Я оплатив(ла)» — перевіримо платіж і надішлемо файл на ${esc(o.contact)}.</p>`;
  const st = form.querySelector('.status');
  form.querySelector('[data-copy]').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(card.replace(/\s/g, '')); e.target.textContent = 'Скопійовано'; }
    catch { e.target.textContent = 'Виділіть і скопіюйте номер'; }
  });
  form.querySelector('[data-paid]').addEventListener('click', async (e) => {
    e.target.disabled = true; st.className = 'status'; st.textContent = 'Надсилаємо…';
    try {
      await post({ site: o.site, product: o.product, name: o.name, contact: o.contact, stage: 'paid' });
      st.className = 'status ok'; st.textContent = 'Дякуємо! Перевіримо оплату і надішлемо файл протягом дня.';
      if (o.onDone) o.onDone();
    } catch {
      e.target.disabled = false; st.className = 'status err'; st.textContent = 'Не вдалося надіслати. Спробуйте ще раз за хвилину.';
    }
  });
  form.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return 'pay';
}
