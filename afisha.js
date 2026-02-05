(function () {
    const DEFAULT_ENDPOINT = 'baza_afisha.json';
    const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
    const TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });

    function extractValue(source, path) {
        if (!source || !path) {
            return undefined;
        }

        const segments = Array.isArray(path) ? path : String(path).split('.');
        let current = source;

        for (const rawSegment of segments) {
            if (current == null) {
                return undefined;
            }

            const segment = rawSegment.trim();
            const numericIndex = Number(segment);

            if (Array.isArray(current) && !Number.isNaN(numericIndex)) {
                current = current[numericIndex];
            } else {
                current = current[segment];
            }
        }

        return current;
    }

    function pickFirst(source, keys) {
        if (!Array.isArray(keys)) {
            return undefined;
        }

        for (const key of keys) {
            const value = extractValue(source, key);
            if (value != null && value !== '') {
                return value;
            }
        }

        return undefined;
    }

    function normaliseEvents(payload) {
        if (!payload) {
            return [];
        }

        if (Array.isArray(payload)) {
            return payload;
        }

        const preferredKeys = ['events', 'data', 'items', 'results', 'list'];
        for (const key of preferredKeys) {
            if (Array.isArray(payload[key])) {
                return payload[key];
            }
        }

        if (Array.isArray(payload.records)) {
            return payload.records;
        }

        return [];
    }

    function toDate(value) {
        if (!value) {
            return null;
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed;
    }

    function formatDateTime(value) {
        const date = toDate(value);
        if (!date) {
            return null;
        }

        return {
            label: DATE_TIME_FORMATTER.format(date),
            dateLabel: DATE_FORMATTER.format(date),
            timeLabel: TIME_FORMATTER.format(date),
            date,
        };
    }

    function normaliseEvent(raw) {
        const title = pickFirst(raw, ['title', 'name', 'event_title', 'eventName', 'label']) || 'Без названия';
        const description = pickFirst(raw, [
            'short_description',
            'shortDescription',
            'preview',
            'teaser',
            'excerpt',
            'description',
        ]);
        const url = pickFirst(raw, ['url', 'link', 'event_url', 'purchase_url', 'web_url', 'site_url']);
        const startRaw = pickFirst(raw, [
            'start',
            'start_at',
            'startAt',
            'datetime_start',
            'date',
            'date_start',
            'date_from',
            'first_event_date',
            'sessions.0.start_at',
        ]);
        const endRaw = pickFirst(raw, [
            'end',
            'end_at',
            'datetime_end',
            'date_end',
            'date_to',
        ]);
        const venue = pickFirst(raw, [
            'venue.title',
            'venue.name',
            'location.title',
            'location.name',
            'city',
            'place',
        ]);
        const city = pickFirst(raw, ['venue.city', 'location.city', 'city']);
        const currency = pickFirst(raw, ['currency', 'price.currency', 'prices.currency']) || '₽';
        const minPrice = pickFirst(raw, [
            'price_min',
            'min_price',
            'price.from',
            'prices.from',
            'price_minimum',
        ]);
        const maxPrice = pickFirst(raw, [
            'price_max',
            'max_price',
            'price.to',
            'prices.to',
            'price_maximum',
        ]);
        const image = pickFirst(raw, [
            'poster',
            'poster.url',
            'poster.small',
            'cover',
            'cover.url',
            'image',
            'image.url',
            'images.0',
            'media.poster.url',
        ]);

        return {
            id: raw.id || raw.event_id || raw.slug || `${title}-${startRaw || Math.random()}`,
            title,
            description,
            url,
            start: formatDateTime(startRaw),
            end: formatDateTime(endRaw),
            venue,
            city,
            minPrice: typeof minPrice === 'number' ? minPrice : Number(minPrice),
            maxPrice: typeof maxPrice === 'number' ? maxPrice : Number(maxPrice),
            currency,
            image: typeof image === 'string' ? image : (image && image.url) ? image.url : undefined,
        };
    }

    function truncate(text, limit = 160) {
        if (!text) {
            return '';
        }

        const clean = String(text).replace(/<[^>]*>/g, '').trim();
        if (clean.length <= limit) {
            return clean;
        }

        return `${clean.slice(0, limit - 1).trim()}…`;
    }

    function formatPrice(min, max, currency) {
        if (min == null && max == null) {
            return null;
        }

        const formatter = new Intl.NumberFormat('ru-RU');
        const resolvedCurrency = currency || '₽';

        const safeMin = typeof min === 'number' && !Number.isNaN(min) ? min : null;
        const safeMax = typeof max === 'number' && !Number.isNaN(max) ? max : null;

        if (safeMin != null && safeMax != null) {
            if (safeMin === safeMax) {
                return `${formatter.format(safeMin)} ${resolvedCurrency}`;
            }

            return `${formatter.format(Math.min(safeMin, safeMax))}–${formatter.format(Math.max(safeMin, safeMax))} ${resolvedCurrency}`;
        }

        const single = safeMin ?? safeMax;
        if (single == null) {
            return null;
        }

        return `${formatter.format(single)} ${resolvedCurrency}`;
    }

    // === YM tracking helpers ===
    function trackBuyTicket(goalName = 'buy_ticket_click') {
        try {
            if (typeof ym === 'function') {
                ym(106581416, 'reachGoal', goalName);
                return;
            }

            if (document.querySelector('script[data-ym-loader="106581416"]')) {
                const waiter = setInterval(() => {
                    if (typeof ym === 'function') {
                        clearInterval(waiter);
                        ym(106581416, 'reachGoal', goalName);
                    }
                }, 200);
                setTimeout(() => clearInterval(waiter), 5000);
                return;
            }

            const s = document.createElement('script');
            s.async = true;
            s.src = 'https://mc.yandex.ru/metrika/tag.js?id=106581416';
            s.setAttribute('data-ym-loader', '106581416');
            s.onload = function () {
                try {
                    if (typeof ym === 'function') {
                        ym(106581416, 'reachGoal', goalName);
                    }
                } catch (e) {
                    console.error('Ошибка вызова ym после загрузки скрипта', e);
                }
            };
            s.onerror = function () {
                console.error('Не удалось загрузить Yandex.Metrika');
            };
            document.head.appendChild(s);
        } catch (err) {
            console.error('trackBuyTicket error', err);
        }
    }

    // Delegate clicks from any element with data-ym-track attribute
    document.addEventListener('click', function (ev) {
        try {
            const el = ev.target.closest && ev.target.closest('[data-ym-track]');
            if (!el) return;

            const goal = el.getAttribute('data-ym-track') || 'buy_ticket_click';
            // fire and forget — do not block navigation
            trackBuyTicket(goal);
        } catch (e) {
            console.error('delegated ym tracker error', e);
        }
    }, false);

    function createMetaRow(label, value) {
        if (!value) {
            return null;
        }

        const row = document.createElement('div');
        row.className = 'afisha-card__meta-row';

        const labelEl = document.createElement('span');
        labelEl.className = 'afisha-card__meta-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'afisha-card__meta-value';
        valueEl.textContent = value;

        if (typeof label === 'string' && label.trim().toLowerCase() === 'дата') {
            valueEl.classList.add('afisha-card__meta-value--date');
        }

        row.append(labelEl, valueEl);
        return row;
    }

    function createEventCard(event) {
        const article = document.createElement('article');
        article.className = 'afisha-card';

        if (event.image) {
            const poster = document.createElement('div');
            poster.className = 'afisha-card__poster';
            const img = document.createElement('img');
            img.src = event.image;
            img.alt = `${event.title}: афиша`;
            img.loading = 'lazy';
            poster.appendChild(img);
            article.appendChild(poster);
        }

        const body = document.createElement('div');
        body.className = 'afisha-card__body';

        const titleEl = document.createElement('h3');
        titleEl.className = 'afisha-card__title';
        titleEl.textContent = event.title;
        body.appendChild(titleEl);

        const meta = document.createElement('div');
        meta.className = 'afisha-card__meta';

        const dateRow = createMetaRow('Дата', event.start?.dateLabel || event.start?.label);
        if (dateRow) {
            meta.appendChild(dateRow);
        }

        const timeRow = createMetaRow('Время', event.start?.timeLabel);
        if (timeRow) {
            meta.appendChild(timeRow);
        }

        if (event.venue) {
            const venueRow = createMetaRow('Площадка', event.city ? `${event.venue}, ${event.city}` : event.venue);
            if (venueRow) {
                meta.appendChild(venueRow);
            }
        }

        if (meta.children.length > 0) {
            body.appendChild(meta);
        }

        if (event.description) {
            const descriptionEl = document.createElement('p');
            descriptionEl.className = 'afisha-card__description';
            descriptionEl.textContent = truncate(event.description);
            body.appendChild(descriptionEl);
        }

        article.appendChild(body);

        const footer = document.createElement('div');
        footer.className = 'afisha-card__footer';

        const priceLabel = formatPrice(event.minPrice, event.maxPrice, event.currency);
        if (priceLabel) {
            const priceEl = document.createElement('span');
            priceEl.className = 'afisha-card__price';
            priceEl.textContent = priceLabel;
            footer.appendChild(priceEl);
        }

        if (event.url) {
            const link = document.createElement('a');
            link.className = 'afisha-card__link';
            link.href = event.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Купить билеты';

            // помечаем ссылку для делегированного трекинга Яндекс.Метрики
            link.setAttribute('data-ym-track', 'buy_ticket_click');

            footer.appendChild(link);
        }

        if (footer.children.length > 0) {
            article.appendChild(footer);
        }

        return article;
    }

    function showStatus(container, message) {
        container.innerHTML = '';
        const status = document.createElement('p');
        status.className = 'afisha-status';
        status.textContent = message;
        container.appendChild(status);
    }

    async function loadWidget(root) {
        if (!root || root.dataset.afishaMounted === 'true') {
            return;
        }

        root.dataset.afishaMounted = 'true';
        const grid = root.querySelector('[data-afisha-grid]') || root;
        showStatus(grid, 'Загружаем события…');

        const endpoint = root.dataset.afishaEndpoint || DEFAULT_ENDPOINT;
        const params = new URLSearchParams();
        const limit = root.dataset.afishaLimit;
        if (limit) {
            params.set('limit', limit);
        }

        const url = params.size > 0 ? `${endpoint}?${params.toString()}` : endpoint;

        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Запрос завершился с кодом ${response.status}`);
            }

            const payload = await response.json();
            const events = normaliseEvents(payload).map(normaliseEvent).filter(Boolean);

            grid.innerHTML = '';

            if (events.length === 0) {
                showStatus(grid, 'Ближайших событий пока нет. Загляните позже.');
                return;
            }

            events.forEach((event) => {
                grid.appendChild(createEventCard(event));
            });
        } catch (error) {
            console.error('Не удалось загрузить афишу', error);
            showStatus(grid, 'Не удалось загрузить события. Попробуйте обновить страницу позже.');
        }
    }

    function boot() {
        const widgets = document.querySelectorAll('[data-afisha-root]');
        widgets.forEach((widget) => {
            loadWidget(widget);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.AfishaWidget = Object.assign(window.AfishaWidget || {}, {
        refresh: boot,
        mount: loadWidget,
    });
})();
