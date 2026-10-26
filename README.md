# Заготовки на місяць

Лендинг PDF-гайду «Морозилка на місяць»: 20 заготовок, 4 списки покупок, правила заморозки.

Статичний сайт без збірки: HTML + CSS + JS-модулі, шрифти — у `fonts/`. Заявки з форми йдуть у Telegram через серверну функцію Vercel `api/order.js`.

**Перший екран.** Статичний: заголовок, ціна і план «4 вихідні → 20 заготовок». Під ним — картки, що готується кожні вихідні. Без відео й анімацій, тож сторінка легка і швидко відкривається на телефоні.

## Оплата

Онлайн-еквайрингу немає, тому оплата в два кроки: покупець залишає контакт, бачить номер картки і платить переказом через EasyPay (комісія 1% + 5 грн з покупця), потім натискає «Я оплатив(ла)». Обидва кроки приходять у Telegram. Номер картки зберігається тільки в змінній `PAY_CARD` на Vercel — у репозиторії його немає. Код — `assets/js/pay.js` і `api/order.js`.

## Деплой на Vercel

1. New Project → імпортуйте цей репозиторій. Framework Preset: **Other**, Build Command порожній, Output Directory — корінь.
2. Settings → Environment Variables:
   - `TELEGRAM_BOT_TOKEN` — токен від @BotFather;
   - `TELEGRAM_CHAT_ID` — ваш chat id (напишіть боту, відкрийте `https://api.telegram.org/bot<TOKEN>/getUpdates`, скопіюйте `"chat":{"id":...}`);
   - `PAY_CARD` — номер картки, на яку покупці переказують гроші через EasyPay. Без нього форма працює як передзамовлення.
3. Redeploy.

## SEO

- `title`, `description`, canonical, Open Graph і Twitter-картка (`img/og.png`, 1200×630).
- JSON-LD: Organization, WebSite, Product з Offer (`InStock`), FAQPage.
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, favicon SVG.
- Шрифти віддаються з власного домену з довгим кешем (`vercel.json`).

**Якщо підключаєте свій домен** — замініть `https://zagotovky-na-misyats.vercel.app` на нього в `index.html`, `privacy.html`, `robots.txt` і `sitemap.xml`.

## Що доробити перед запуском реклами

- Вставити код Meta Pixel у `<head>` (місце позначене коментарем).
- Дописати контакти й дані продавця в `privacy.html`.
- Після реєстрації ФОП — замінити переказ через EasyPay на онлайн-оплату з автоматичною видачею файлу (WayForPay / LiqPay / plata by mono).
