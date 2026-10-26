// Vercel serverless function: sends orders from the site form to your Telegram.
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN  — token from @BotFather
//   TELEGRAM_CHAT_ID    — your chat id (send any message to the bot, then open
//                         https://api.telegram.org/bot<TOKEN>/getUpdates and copy "chat":{"id":...})
//   PAY_CARD            — card number buyers transfer to via EasyPay (optional).
//                         Without it the form works as a plain pre-order.
// The card number lives only in Vercel, not in the repository, and is returned
// to the page only after the buyer has left a contact.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { name = '', contact = '', product = '', comment = '', site = '', stage = 'lead' } = req.body || {};
  const clean = (s) => String(s).slice(0, 300).trim();
  if (!clean(name) || !clean(contact)) return res.status(400).json({ ok: false, error: 'name and contact required' });
  const card = String(process.env.PAY_CARD || '').replace(/\D/g, '');
  const head = stage === 'paid' ? `💳 Клієнт каже, що оплатив — ${clean(site)}`
    : card ? `🛒 Нове замовлення, перейшов до оплати — ${clean(site)}`
    : `🛒 Нове передзамовлення — ${clean(site)}`;
  const text = [
    head,
    `Продукт: ${clean(product)}`,
    `Ім'я: ${clean(name)}`,
    `Контакт: ${clean(contact)}`,
    comment ? `Коментар: ${clean(comment)}` : null,
    stage === 'paid' ? 'Перевір надходження на картку і надішли файл.' : null,
  ].filter(Boolean).join('\n');
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text }),
  });
  if (!r.ok) return res.status(502).json({ ok: false });
  return res.status(200).json({ ok: true, card: stage === 'lead' && card.length >= 12 ? card : undefined });
}
