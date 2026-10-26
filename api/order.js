// Vercel serverless function: orders from the site form, delivered by email.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   SMTP_USER    — the Gmail address letters are sent from (e.g. brand.name@gmail.com)
//   SMTP_PASS    — a Gmail app password for it (Google account → Security → App passwords; needs 2-step verification)
//   FILES_KEY    — key that decrypts the product files in api/_files (given once by the developer)
//   PAY_CARD     — card number buyers transfer to via EasyPay. Without it the form works as a plain pre-order.
//   OWNER_EMAIL  — where order notifications go (optional, defaults to SMTP_USER)
//   DELIVERY     — "auto" (default): the buyer gets the files as soon as they press «Я оплатив(ла)»;
//                  "manual": you get an email with a «Підтвердити і надіслати» link and the files go out after you check the payment.
//   SMTP_HOST / SMTP_PORT — only if you send through something other than Gmail.
//
// The repository is public, so product files are stored encrypted (AES-256-GCM) and the card number
// lives only in Vercel. The card is returned to the page only after the buyer has left a valid email.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import PRODUCT from './_product.js';

const clean = (s, n = 300) => String(s ?? '').slice(0, n).trim();
// Launch price until PRODUCT.until, then PRODUCT.priceAfter (the page uses the same dates).
const price = () => (PRODUCT.until && Date.now() < Date.parse(PRODUCT.until) ? PRODUCT.price : PRODUCT.priceAfter || PRODUCT.price);
const hi = (name, rest) => (name ? `${name}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
const isEmail = (s) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mailer() {
  if (process.env.SMTP_HOST === 'json') return nodemailer.createTransport({ jsonTransport: true }); // local tests
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function decrypt(file) {
  const key = Buffer.from(String(process.env.FILES_KEY || ''), 'base64');
  if (key.length !== 32) throw new Error('FILES_KEY is missing');
  const buf = fs.readFileSync(path.join(process.cwd(), 'api', '_files', file));
  const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), data = buf.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]);
}

// Signed confirm links for DELIVERY=manual: /api/order?confirm=<payload>.<signature>
const sign = (payload) => crypto.createHmac('sha256', String(process.env.FILES_KEY || '')).update(payload).digest('base64url');
const makeToken = (o) => { const p = Buffer.from(JSON.stringify(o)).toString('base64url'); return `${p}.${sign(p)}`; };
function readToken(t) {
  const [p, s] = String(t).split('.');
  if (!p || !s || sign(p).length !== s.length || !crypto.timingSafeEqual(Buffer.from(sign(p)), Buffer.from(s))) return null;
  return JSON.parse(Buffer.from(p, 'base64url').toString());
}

function letter(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f3ef;font-family:Arial,Helvetica,sans-serif;color:#15151a">
  <div style="max-width:560px;margin:0 auto;padding:28px 18px">
    <div style="font-weight:700;font-size:15px;color:${PRODUCT.accent};margin-bottom:14px">${esc(PRODUCT.brand)}</div>
    <div style="background:#fff;border-radius:16px;padding:26px 24px;border:1px solid #e4e1da">
      <h1 style="font-size:22px;line-height:1.25;margin:0 0 14px">${esc(title)}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#7a7a84;margin:16px 4px 0">${esc(PRODUCT.brand)} · ${esc(PRODUCT.site)}</p>
  </div></body></html>`;
}

async function deliver(t, { name, email }) {
  const attachments = PRODUCT.files.map((f) => ({ filename: f.name, content: decrypt(f.enc) }));
  const hello = hi(name, 'дякуємо за покупку!');
  await t.sendMail({
    from: `"${PRODUCT.brand}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Ваше замовлення: ${PRODUCT.title}`,
    text: `${hello}\n\n${PRODUCT.howTo.join('\n')}\n\nФайли — у вкладеннях до цього листа. Якщо щось не відкривається, просто дайте відповідь на цей лист.`,
    html: letter(hello,
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.55">У вкладеннях — <b>${esc(PRODUCT.title)}</b>.</p>
       <ol style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6">${PRODUCT.howTo.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
       <p style="margin:0;font-size:14px;color:#5c5c66">Якщо щось не відкривається, просто дайте відповідь на цей лист.</p>`),
    attachments,
  });
}

async function notifyOwner(t, subject, lines, extraHtml = '') {
  await t.sendMail({
    from: `"${PRODUCT.brand} — сайт" <${process.env.SMTP_USER}>`,
    to: process.env.OWNER_EMAIL || process.env.SMTP_USER,
    subject,
    text: lines.join('\n'),
    html: letter(subject, `<p style="font-size:15px;line-height:1.6;margin:0">${lines.map(esc).join('<br>')}</p>${extraHtml}`),
  });
}

export default async function handler(req, res) {
  const t = mailer();

  // Manual delivery: the owner clicks the link from the notification email.
  if (req.method === 'GET' && req.query && req.query.confirm) {
    const o = readToken(req.query.confirm);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!o) return res.status(400).send(letter('Посилання недійсне', '<p>Перевірте, що скопіювали його повністю.</p>'));
    try {
      await deliver(t, o);
      return res.status(200).send(letter('Файли надіслано', `<p>Лист із файлами пішов на <b>${esc(o.email)}</b>.</p>`));
    } catch (e) {
      return res.status(500).send(letter('Не вдалося надіслати', `<p>${esc(e.message)}</p>`));
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const b = req.body || {};
  const name = clean(b.name, 80), email = clean(b.contact, 120).toLowerCase(), stage = clean(b.stage, 10) || 'lead';
  const lang = b.lang === 'en' ? 'en' : 'uk';
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'valid email required' });
  const card = String(process.env.PAY_CARD || '').replace(/\D/g, '');
  const payable = lang === 'uk' && card.length >= 12;

  try {
    if (stage === 'lead') {
      if (payable) return res.status(200).json({ ok: true, card }); // the buyer now sees the payment step
      // No payment method (or the English version): plain pre-order.
      await notifyOwner(t, `Нове передзамовлення — ${PRODUCT.brand}`, [`Продукт: ${PRODUCT.title}`, `Email: ${email}`, `Мова: ${lang}`]);
      await t.sendMail({
        from: `"${PRODUCT.brand}" <${process.env.SMTP_USER}>`, to: email,
        subject: lang === 'en' ? `We got your order — ${PRODUCT.brand}` : `Заявку прийнято — ${PRODUCT.brand}`,
        text: lang === 'en' ? 'Hi! Thanks — we will email you about payment and send the files shortly.' : 'Дякуємо! Ми напишемо вам на цю адресу щодо оплати і надішлемо файли.',
      });
      return res.status(200).json({ ok: true });
    }

    if (stage === 'paid') {
      const manual = String(process.env.DELIVERY || 'auto').toLowerCase() === 'manual';
      const info = [`Продукт: ${PRODUCT.title}`, `Сума: ${price()} грн`, `Email: ${email}`, `Час: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })}`];
      if (manual) {
        const base = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
        const link = `${base}/api/order?confirm=${makeToken({ name, email })}`;
        await notifyOwner(t, `💳 Перевір оплату ${price()} грн — ${email}`, [...info, '', 'Перевір надходження на картку і натисни кнопку нижче — покупцю піде лист із файлами.'],
          `<p style="margin:18px 0 0"><a href="${link}" style="display:inline-block;background:${PRODUCT.accent};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Підтвердити і надіслати файли</a></p>`);
        await t.sendMail({
          from: `"${PRODUCT.brand}" <${process.env.SMTP_USER}>`, to: email,
          subject: `Перевіряємо оплату — ${PRODUCT.brand}`,
          text: `${hi(name, 'дякуємо!')} Перевіряємо оплату ${price()} грн. Щойно вона надійде, на цю адресу прийде лист із файлами.`,
        });
        return res.status(200).json({ ok: true, delivered: false });
      }
      await deliver(t, { name, email });
      await notifyOwner(t, `💳 Продаж ${price()} грн — ${email}`, [...info, '', 'Файли вже надіслано покупцю. Перевір, що гроші надійшли на картку.']);
      return res.status(200).json({ ok: true, delivered: true });
    }
    if (stage === 'gift' && PRODUCT.gift) {
      await t.sendMail({
        from: `"${PRODUCT.brand}" <${process.env.SMTP_USER}>`, to: email,
        subject: `Ваш подарунок: ${PRODUCT.gift.title}`,
        text: `Тримайте ${PRODUCT.gift.title} — PDF у вкладенні.\n\nСподобається — повний пакет на ${PRODUCT.title.replace(/^Повний пакет: /, '')} тут: https://${PRODUCT.site}/#recap`,
        html: letter(`Ваш подарунок: ${PRODUCT.gift.title}`,
          `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">PDF — у вкладенні. Почніть зі сторінки «5 правил»: це 2 хвилини.</p>
           <p style="margin:0;font-size:15px;line-height:1.55">Сподобається — у <a href="https://${PRODUCT.site}/#recap" style="color:${PRODUCT.accent}">повному пакеті</a> 250 промптів у 12 категоріях, 3 Claude-проєкти і гайд «Сайт за вечір».</p>`),
        attachments: [{ filename: PRODUCT.gift.name, content: decrypt(PRODUCT.gift.enc) }],
      });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ ok: false });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false });
  }
}
