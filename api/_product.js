// What the order function sells and emails. Files are encrypted copies in api/_files (see order.js).
// price is the launch price until `until`, then priceAfter — keep in sync with data-* on <body> in index.html.
export default {
  "brand": "Заготовки на місяць",
  "site": "zagotovky-na-misyats.vercel.app",
  "title": "Гайд «Морозилка на місяць»",
  "price": 199,
  "accent": "#b3264a",
  "files": [
    {
      "name": "Морозилка_на_місяць.pdf",
      "enc": "1.enc"
    }
  ],
  "howTo": [
    "Відкрийте PDF на телефоні або роздрукуйте на A4.",
    "Почніть зі списку покупок на перші вихідні.",
    "Таблицю «Що в морозилці» повісьте на дверцята."
  ],
  "priceAfter": 299,
  "until": "2026-11-02T23:59:59+02:00"
};
