// Vercel serverless function: sends a pre-order from the site form to your Telegram.
// Set two environment variables in Vercel → Project → Settings → Environment Variables:
//   TELEGRAM_BOT_TOKEN  — token from @BotFather
//   TELEGRAM_CHAT_ID    — your chat id (send any message to the bot, then open
//                         https://api.telegram.org/bot<TOKEN>/getUpdates and copy "chat":{"id":...})
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { name = '', contact = '', product = '', comment = '', site = '' } = req.body || {};
  const clean = (s) => String(s).slice(0, 300).trim();
  if (!clean(name) || !clean(contact)) return res.status(400).json({ ok: false, error: 'name and contact required' });
  const text = [
    `🛒 Нове передзамовлення — ${clean(site)}`,
    `Продукт: ${clean(product)}`,
    `Ім'я: ${clean(name)}`,
    `Контакт: ${clean(contact)}`,
    comment ? `Коментар: ${clean(comment)}` : null,
  ].filter(Boolean).join('\n');
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text }),
  });
  if (!r.ok) return res.status(502).json({ ok: false });
  return res.status(200).json({ ok: true });
}
