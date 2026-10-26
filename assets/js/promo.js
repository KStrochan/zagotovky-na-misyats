// Launch price with a real deadline. Config lives on <body>:
//   data-promo-until="2026-11-02T23:59:59+02:00" data-price-now="599" data-price-after="699"
// Before the deadline the page shows the launch price and a countdown; after it, every element marked
// [data-p] switches to the regular price and the countdowns disappear — so the timer always tells the truth.
// The server (api/_product.js) uses the same dates, so the email and the payment step match the page.

const b = document.body.dataset;
export const PROMO = { until: Date.parse(b.promoUntil || ''), now: +b.priceNow || 0, after: +b.priceAfter || 0 };
export const promoActive = () => PROMO.now > 0 && Date.now() < PROMO.until;
export const price = () => (promoActive() ? PROMO.now : PROMO.after || PROMO.now);

export function applyPrices() {
  if (promoActive() || !PROMO.after) return;
  const re = new RegExp(`\\b${PROMO.now}\\b`, 'g');
  document.querySelectorAll('[data-p]').forEach((el) => {
    if ('value' in el && el.tagName === 'INPUT') el.value = el.value.replace(re, PROMO.after);
    else el.textContent = el.textContent.replace(re, PROMO.after);
  });
  document.querySelectorAll('[data-promo]').forEach((el) => { el.hidden = true; });
}

const two = (n) => String(n).padStart(2, '0');
function tick() {
  const left = PROMO.until - Date.now();
  if (left <= 0) { applyPrices(); return false; }
  const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const txt = `${d ? d + ' д ' : ''}${two(h)}:${two(m)}:${two(sec)}`;
  document.querySelectorAll('[data-countdown]').forEach((el) => { el.textContent = txt; });
  return true;
}

export function startPromo() {
  applyPrices();
  if (!promoActive()) return;
  document.querySelectorAll('[data-promo]').forEach((el) => { el.hidden = false; });
  tick();
  const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
}
