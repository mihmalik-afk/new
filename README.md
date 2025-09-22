# AmmA Production — лендинг и афиша

Одностраничный сайт продюсерского центра AmmA Production со встроенным виджетом афиши, который получает события из API Intickets через серверную функцию.

## Структура проекта

- `index.html` — главная страница с краткой информацией, слайдером и блоком предпросмотра ближайших событий.
- `afisha.html` — полноценная страница афиши с сеткой мероприятий.
- `afisha.css` — стили для страницы афиши.
- `afisha.js` — клиентский виджет, который подгружает события Intickets и наполняет карточки.
- `api/intickets-events.js` — серверная функция (Vercel/Netlify), проксирующая запросы к Intickets и скрывающая токен.

## Настройка переменных окружения

Перед деплоем нужно задать переменные:

| Переменная | Описание |
|------------|----------|
| `INTICKETS_EVENTS_URL` | Полный URL JSON-фида c событиями (предоставляется Intickets в личном кабинете). |
| `INTICKETS_TOKEN` | Токен доступа, если фид защищён. Для тестирования можно использовать ключ `b38b5af4-a37b-2a49-66e7-30631ea777e5`. |

Пример `.env` файла:

```env
INTICKETS_EVENTS_URL=https://example.intickets.ru/api/v1/events
INTICKETS_TOKEN=b38b5af4-a37b-2a49-66e7-30631ea777e5
```

> Не храните рабочий ключ в репозитории. Добавьте переменные окружения в настройках хостинга (Vercel/Netlify/Render и т. п.).

## Локальный запуск

1. Создайте `.env` файл с переменными окружения.
2. Запустите любой статический сервер (например, `npx serve .` или `python3 -m http.server`).
3. Для работы прокси `/api/intickets-events` нужен средний слой (Vercel dev, Netlify dev, Node/Express). Проще всего использовать Vercel CLI:

   ```bash
   npm i -g vercel
   vercel dev
   ```

   или Netlify CLI:

   ```bash
   npm i -g netlify-cli
   netlify dev
   ```

4. Откройте `http://localhost:3000` (или адрес, выданный CLI).

## Деплой

- **Vercel**: положите проект в репозиторий, подключите его в Vercel, задайте переменные окружения и задеплойте. Файл `api/intickets-events.js` автоматически станет serverless-функцией.
- **Netlify**: аналогично; функция будет доступна как `/.netlify/functions/intickets-events`.
- **Собственный Node**: подключите файл из `api/intickets-events.js` в свой Express/Koa сервер или создайте отдельный endpoint с такой же логикой.

## Пользовательский виджет афиши

Чтобы встроить сетку афиши на любую страницу, добавьте контейнер с атрибутом `data-afisha-root` и подключите `afisha.js`:

```html
<section data-afisha-root data-afisha-limit="3">
    <div data-afisha-grid>Загрузка…</div>
</section>
<script src="afisha.js" defer></script>
```

По умолчанию скрипт обращается к `/api/intickets-events`. Можно переопределить URL через атрибут `data-afisha-endpoint`.
