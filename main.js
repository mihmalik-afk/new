'use strict';

const BAZA_AFISHA_URL = 'baza_afisha.json';
const AFISHA_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80';
const AFISHA_SUPPLEMENTAL = Object.freeze({
    marat: {
        title: 'Мой бедный Марат',
        venue: 'Москва · Сцена AmmA Production',
        image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
        description:
            'Легендарная история Алексея Арбузова о трёх молодых людях, чья дружба и любовь взрослеют на фоне осаждённого города.',
        creators: [
            { role: 'Режиссёр', name: 'Вера Анненкова' },
            { role: 'Продюсер', name: 'Михаил Маликов' },
            { role: 'Исполнители', name: 'Алина Мазненкова, Максим Дементьев' },
            { role: 'Художник по свету', name: 'Аксинья Олейник' }
        ],
        gallery: [
            {
                src: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
                caption: 'Погружение в атмосферу блокадного города'
            },
            {
                src: 'https://images.unsplash.com/photo-1515169067865-5387ec356754?auto=format&fit=crop&w=900&q=80',
                caption: 'Диалог героев на тёмной сцене'
            },
            {
                src: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80',
                caption: 'Финальный световой акцент спектакля'
            }
        ]
    },
    okna: {
        title: 'Окна. Город. Любовь...',
        venue: 'Москва · Арт-пространство «Окна»',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
        description:
            'Поэтический спектакль о городских историях, где пластика, видеоарт и музыка превращают каждое окно в отдельную историю любви.',
        creators: [
            { role: 'Художественный руководитель', name: 'Вера Анненкова' },
            { role: 'Продюсер', name: 'Михаил Маликов' },
            { role: 'Видеохудожник', name: 'Аксинья Олейник' },
            { role: 'Исполнители', name: 'Алина Мазненкова, Максим Дементьев' }
        ],
        gallery: [
            {
                src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
                caption: 'Городской ритм спектакля'
            },
            {
                src: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
                caption: 'Сцена у панорамных окон'
            },
            {
                src: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80',
                caption: 'Пластический дуэт в свете города'
            }
        ]
    },
    ostrov: {
        title: 'Остров',
        venue: 'Санкт-Петербург · Лофт «Остров»',
        image: 'https://images.unsplash.com/photo-1485563845929-11d0e5e56b1f?auto=format&fit=crop&w=1200&q=80',
        description:
            'Современная притча о поиске себя и необходимости одиночества, где звук, свет и пластика создают собственную вселенную.',
        creators: [
            { role: 'Режиссёр', name: 'Вера Анненкова' },
            { role: 'Музыкальный продюсер', name: 'Михаил Маликов' },
            { role: 'Исполнители', name: 'Алина Мазненкова, Максим Дементьев' },
            { role: 'Художник по свету', name: 'Аксинья Олейник' }
        ],
        gallery: [
            {
                src: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80',
                caption: 'Герои на краю острова'
            },
            {
                src: 'https://images.unsplash.com/photo-1462212210333-335063b676d3?auto=format&fit=crop&w=900&q=80',
                caption: 'Мистическое пространство спектакля'
            },
            {
                src: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=80',
                caption: 'Музыкальный эпизод у моря'
            }
        ]
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const heroSlider = setupHeroSlider();
    const modalController = setupAfishaModal();
    initAfishaSection(modalController, heroSlider);
});

function setupHeroSlider() {
    const slider = document.querySelector('.hero-slider');
    if (!slider) {
        return { update() {} };
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cycleDuration = 5000;
    let slides = [];
    let currentIndex = 0;
    let timerId = null;

    function refreshSlides() {
        slides = Array.from(slider.querySelectorAll('.banner-item'));

        if (!slides.length) {
            stop();
            return;
        }

        if (!slides[currentIndex]) {
            currentIndex = 0;
        }

        slides.forEach((slide, index) => {
            slide.classList.toggle('is-active', index === currentIndex);
        });

        if (reduceMotion || slides.length <= 1) {
            stop();
        } else {
            start();
        }
    }

    function start() {
        if (timerId || reduceMotion || slides.length <= 1) {
            return;
        }

        timerId = window.setInterval(() => {
            if (!slides.length) {
                return;
            }

            slides[currentIndex]?.classList.remove('is-active');
            currentIndex = (currentIndex + 1) % slides.length;
            slides[currentIndex]?.classList.add('is-active');
        }, cycleDuration);
    }

    function stop() {
        if (timerId) {
            window.clearInterval(timerId);
            timerId = null;
        }
    }

    function update(eventList = []) {
        const dynamicSlides = slider.querySelectorAll('[data-hero-dynamic]');
        dynamicSlides.forEach((slide) => slide.remove());

        if (Array.isArray(eventList) && eventList.length) {
            const sorted = [...eventList].sort((a, b) => {
                const aTime = a.date instanceof Date && !Number.isNaN(a.date.getTime()) ? a.date.getTime() : Number.MAX_SAFE_INTEGER;
                const bTime = b.date instanceof Date && !Number.isNaN(b.date.getTime()) ? b.date.getTime() : Number.MAX_SAFE_INTEGER;

                if (aTime === bTime) {
                    return (a.title || '').localeCompare(b.title || '', 'ru');
                }

                return aTime - bTime;
            });

            const fragment = document.createDocumentFragment();

            sorted.slice(0, 3).forEach((event) => {
                if (!event || !event.title) {
                    return;
                }

                const slide = document.createElement('div');
                slide.className = 'banner-item';
                slide.setAttribute('data-hero-dynamic', '');

                if (event.image) {
                    slide.style.setProperty('--slide-bg', `url('${escapeCssUrl(event.image)}')`);
                }

                const dateEl = document.createElement('div');
                dateEl.className = 'banner-date';
                dateEl.textContent = formatHeroDate(event.date, event.time);
                slide.appendChild(dateEl);

                const titleEl = document.createElement('div');
                titleEl.className = 'banner-title';
                titleEl.textContent = event.title;
                slide.appendChild(titleEl);

                if (event.ticketUrl) {
                    const link = document.createElement('a');
                    link.className = 'banner-cta';
                    link.href = event.ticketUrl;
                    link.target = '_blank';
                    link.rel = 'noopener';
                    link.textContent = 'Купить билет';
                    slide.appendChild(link);
                } else {
                    const soon = document.createElement('span');
                    soon.className = 'banner-cta banner-cta--disabled';
                    soon.textContent = 'Скоро в продаже';
                    slide.appendChild(soon);
                }

                fragment.appendChild(slide);
            });

            slider.appendChild(fragment);
        }

        stop();
        const brandSlide = slider.querySelector('[data-hero-brand]');
        currentIndex = brandSlide ? Array.from(slider.children).indexOf(brandSlide) : 0;
        if (currentIndex < 0) {
            currentIndex = 0;
        }

        refreshSlides();
    }

    refreshSlides();

    return {
        update
    };
}

function setupAfishaModal() {
    const modal = document.querySelector('[data-afisha-modal]');
    if (!modal) {
        return { open() {}, close() {} };
    }

    const dialog = modal.querySelector('[data-afisha-modal-dialog]');
    const titleEl = modal.querySelector('[data-afisha-modal-title]');
    const metaEl = modal.querySelector('[data-afisha-modal-meta]');
    const descEl = modal.querySelector('[data-afisha-modal-description]');
    const creatorsEl = modal.querySelector('[data-afisha-modal-creators]');
    const galleryEl = modal.querySelector('[data-afisha-modal-gallery]');
    const ticketEl = modal.querySelector('[data-afisha-modal-ticket]');
    const closeTriggers = modal.querySelectorAll('[data-afisha-modal-close]');
    let restoreFocusTo = null;

    closeTriggers.forEach((trigger) => {
        trigger.addEventListener('click', close);
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            close();
        }
    });

    function open(details) {
        if (!details) {
            return;
        }

        restoreFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const title = details.title || 'Спектакль';
        if (titleEl) {
            titleEl.textContent = title;
        }

        if (metaEl) {
            metaEl.textContent = details.modalMeta || '';
            metaEl.hidden = !metaEl.textContent;
        }

        if (descEl) {
            descEl.textContent = details.description || '';
            descEl.hidden = !descEl.textContent;
        }

        renderCreators(details.creators || []);
        renderGallery(details.gallery || [], title);

        if (ticketEl) {
            if (details.ticketUrl) {
                ticketEl.href = details.ticketUrl;
                ticketEl.hidden = false;
            } else {
                ticketEl.hidden = true;
            }
        }

        modal.hidden = false;

        requestAnimationFrame(() => {
            modal.classList.add('is-visible');
            const focusTarget = closeTriggers[0] || dialog;
            if (focusTarget && typeof focusTarget.focus === 'function') {
                focusTarget.focus();
            }
        });

        document.addEventListener('keydown', handleKeyDown);
    }

    function close() {
        modal.classList.remove('is-visible');
        modal.addEventListener(
            'transitionend',
            () => {
                modal.hidden = true;
                document.removeEventListener('keydown', handleKeyDown);
                if (restoreFocusTo && typeof restoreFocusTo.focus === 'function') {
                    restoreFocusTo.focus();
                }
            },
            { once: true }
        );
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    }

    function renderCreators(list) {
        if (!creatorsEl) {
            return;
        }

        if (!list.length) {
            creatorsEl.innerHTML = '';
            creatorsEl.hidden = true;
            return;
        }

        const markup = list
            .map((item) => {
                const role = escapeHtml(item?.role || '');
                const name = escapeHtml(item?.name || '');
                return `<li><span class="afisha-modal-role">${role}</span><span class="afisha-modal-name">${name}</span></li>`;
            })
            .join('');

        creatorsEl.innerHTML = markup;
        creatorsEl.hidden = false;
    }

    function renderGallery(images, title) {
        if (!galleryEl) {
            return;
        }

        if (!images.length) {
            galleryEl.innerHTML = '';
            galleryEl.hidden = true;
            return;
        }

        const markup = images
            .map((entry, index) => {
                const src = typeof entry === 'string' ? entry : entry?.src;
                if (!src) {
                    return '';
                }
                const caption = typeof entry === 'object' && entry?.caption ? entry.caption : `Кадр ${index + 1}`;
                const safeSrc = escapeAttr(src);
                const safeCaption = escapeHtml(caption);
                const altText = escapeAttr(`${title} — фотография ${index + 1}`);
                return `<figure><img src="${safeSrc}" alt="${altText}" loading="lazy"><figcaption>${safeCaption}</figcaption></figure>`;
            })
            .filter(Boolean)
            .join('');

        galleryEl.innerHTML = markup;
        galleryEl.hidden = !markup;
    }

    return { open, close };
}

function initAfishaSection(modalController, heroSlider) {
    const section = document.querySelector('[data-afisha]');
    if (!section) {
        return;
    }

    const grid = section.querySelector('[data-afisha-grid]');
    const empty = section.querySelector('[data-afisha-empty]');
    const searchField = section.querySelector('[data-afisha-search]');
    const sortField = section.querySelector('[data-afisha-sort]');
    const statusField = section.querySelector('[data-afisha-status]');
    const afishaLookup = new Map();
    let events = [];

    if (grid) {
        renderAfishaSkeleton(grid, 3);
        grid.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-afisha-trigger]');
            if (!trigger) {
                return;
            }
            const eventId = trigger.getAttribute('data-afisha-trigger');
            if (!eventId) {
                return;
            }

            const details = afishaLookup.get(eventId);
            if (details && modalController && typeof modalController.open === 'function') {
                modalController.open(details);
            }
        });
    }

    if (searchField) {
        searchField.addEventListener('input', () => renderAfisha());
    }

    if (sortField) {
        sortField.addEventListener('change', () => renderAfisha());
    }

    fetchAfishaEvents();

    async function fetchAfishaEvents() {
        if (!grid) {
            return;
        }

        grid.setAttribute('aria-busy', 'true');

        try {
            const response = await fetch(BAZA_AFISHA_URL, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const payload = await response.json();
            const list = Array.isArray(payload?.events) ? payload.events : Array.isArray(payload) ? payload : [];
            events = list.map(normalizeAfishaEvent).filter(Boolean);

            afishaLookup.clear();
            events.forEach((item) => {
                if (item?.id) {
                    afishaLookup.set(item.id, item);
                }
            });

            if (statusField) {
                statusField.hidden = true;
                statusField.textContent = '';
            }

            if (heroSlider && typeof heroSlider.update === 'function') {
                heroSlider.update(events);
            }
        } catch (error) {
            console.error('Не удалось загрузить baza_afisha.json', error);
            events = [];
            afishaLookup.clear();

            if (statusField) {
                statusField.hidden = false;
                statusField.textContent = 'Не удалось загрузить baza_afisha.json. Проверьте содержимое файла.';
            }

            if (heroSlider && typeof heroSlider.update === 'function') {
                heroSlider.update([]);
            }
        }

        renderAfisha();
    }

    function renderAfisha() {
        if (!grid) {
            return;
        }

        const term = (searchField?.value || '').trim().toLowerCase();
        const sortValue = sortField?.value || 'date_asc';

        const filtered = events.filter((event) => {
            const haystack = `${event.title || ''} ${event.venue || ''}`.toLowerCase();
            return haystack.includes(term);
        });

        filtered.sort((a, b) => {
            const aTime = a.date ? a.date.getTime() : 0;
            const bTime = b.date ? b.date.getTime() : 0;
            return sortValue === 'date_desc' ? bTime - aTime : aTime - bTime;
        });

        grid.innerHTML = filtered.map(renderAfishaCard).join('');
        grid.setAttribute('aria-busy', 'false');

        if (empty) {
            if (filtered.length) {
                empty.hidden = true;
            } else {
                empty.hidden = false;
                empty.textContent = term
                    ? 'По вашему запросу ничего не найдено.'
                    : 'События не найдены. Добавьте спектакли в baza_afisha.json.';
            }
        }
    }
}

function normalizeAfishaEvent(raw) {
    if (!raw) {
        return null;
    }

    const id = raw.id || slugify(raw.title || '');
    const supplemental = AFISHA_SUPPLEMENTAL[id] || {};
    const title = raw.title || supplemental.title || 'Без названия';

    const time = extractEventTime(raw) || normalizeTimeString(supplemental.time);
    const venue = raw.venue || supplemental.venue || '';
    const dateSource =
        raw.date ||
        raw.start_date ||
        raw.startDate ||
        raw.date_start ||
        raw.dateStart ||
        raw.starts_at ||
        raw.startsAt ||
        raw.start_at ||
        raw.startAt ||
        raw.datetime_start ||
        raw.datetimeStart ||
        raw.event_date ||
        raw.eventDate ||
        null;
    const isoDate = buildIsoDate(dateSource, time);
    const parsedDate = isoDate ? new Date(isoDate) : null;
    const isValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate?.getTime());
    const cardMeta = buildCardMeta(parsedDate, time, venue);
    const modalMeta = buildModalMeta(parsedDate, time, venue);
    const description = supplemental.description || '';
    const creators = Array.isArray(supplemental.creators) ? supplemental.creators : [];
    const gallery = Array.isArray(supplemental.gallery) ? supplemental.gallery : [];
    const image = supplemental.image || AFISHA_PLACEHOLDER_IMAGE;
    const ticketUrl =
        raw.link ||
        raw.url ||
        raw.seance_url ||
        raw.seanceUrl ||
        raw.purchase_url ||
        raw.purchaseUrl ||
        raw.ticket_url ||
        raw.ticketUrl ||
        supplemental.ticketUrl ||
        '';

    return {
        id: id || slugify(title),
        title,
        date: isValidDate ? parsedDate : null,
        time,
        cardMeta,
        modalMeta,
        description,
        creators,
        gallery,
        image,
        ticketUrl,
        venue
    };
}

function buildIsoDate(date, time) {
    if (!date) {
        return null;
    }

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
    }

    const normalizedDate = `${date}`.trim();
    if (!normalizedDate) {
        return null;
    }

    if (normalizedDate.includes('T')) {
        return normalizedDate;
    }

    if (normalizedDate.includes(' ')) {
        return normalizedDate.replace(/\s+/, 'T');
    }

    if (!time) {
        return normalizedDate;
    }

    const normalizedTime = `${time}`.trim();
    if (!normalizedTime) {
        return normalizedDate;
    }

    return `${normalizedDate}T${normalizedTime}`;
}

function extractEventTime(raw) {
    if (!raw) {
        return '';
    }

    const candidates = [
        raw.time,
        raw.start_time,
        raw.startTime,
        raw.start_at,
        raw.startAt,
        raw.starts_at,
        raw.startsAt,
        raw.datetime_start,
        raw.datetimeStart,
        raw.date_time,
        raw.dateTime,
        raw.event_time,
        raw.eventTime,
        raw.seance_time,
        raw.seanceTime,
        raw.start,
        raw.date,
    ];

    for (const candidate of candidates) {
        const normalized = normalizeTimeString(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return '';
}

function normalizeTimeString(value) {
    if (!value) {
        return '';
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const hours = String(value.getHours()).padStart(2, '0');
        const minutes = String(value.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    const str = `${value}`.trim();
    if (!str) {
        return '';
    }

    const match = str.match(/(\d{1,2})([:.])(\d{2})/);
    if (match) {
        const hours = match[1].padStart(2, '0');
        const minutes = match[3].padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    return '';
}

function buildCardMeta(date, time, venue) {
    const parts = [];

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
        parts.push(
            date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long'
            })
        );
    }

    if (time) {
        parts.push(time);
    }

    if (venue) {
        parts.push(venue);
    }

    return parts.length ? parts.join(' · ') : 'Дата уточняется';
}

function buildModalMeta(date, time, venue) {
    const parts = [];

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
        parts.push(
            date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            })
        );
    }

    if (time) {
        parts.push(`Начало в ${time}`);
    }

    if (venue) {
        parts.push(venue);
    }

    return parts.join(' · ');
}

function formatHeroDate(date, time) {
    const parts = [];

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
        parts.push(
            date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            })
        );
    }

    if (time) {
        parts.push(time);
    }

    return parts.join(' · ') || 'Дата уточняется';
}


function renderAfishaCard(event) {
    const safeTitle = escapeHtml(event.title);
    const safeAlt = escapeAttr(`Афиша спектакля ${event.title}`);
    const cover = escapeAttr(event.image || AFISHA_PLACEHOLDER_IMAGE);
    const meta = escapeHtml(event.cardMeta || 'Дата уточняется');
    const hasTicket = Boolean(event.ticketUrl);
    const ticketLink = hasTicket ? escapeAttr(event.ticketUrl) : '';
    const triggerId = escapeAttr(event.id || 'event');
    const openLabel = escapeAttr(`Открыть описание спектакля «${event.title}»`);
    const actionMarkup = hasTicket
        ? `<a class="btn" href="${ticketLink}" target="_blank" rel="noopener">Купить билет</a>`
        : '<span class="afisha-card-badge" aria-label="Билеты появятся позже">Скоро в продаже</span>';

    return `
        <article class="afisha-card" data-afisha-id="${triggerId}">
            <button type="button" class="afisha-card-cover" data-afisha-trigger="${triggerId}" aria-label="${openLabel}">
                <img src="${cover}" alt="${safeAlt}" loading="lazy">
            </button>
            <div class="afisha-card-body">
                <h3 class="afisha-card-title">${safeTitle}</h3>
                <div class="afisha-card-meta">${meta}</div>
                <div class="afisha-card-actions">

                    ${actionMarkup}
                </div>
            </div>
        </article>
    `;
}

function renderAfishaSkeleton(grid, count) {
    if (!grid) {
        return;
    }

    const skeleton = `
        <article class="afisha-card afisha-card--skeleton">
            <div class="afisha-card-cover"></div>
            <div class="afisha-card-body">
                <h3 class="afisha-card-title">Загрузка…</h3>
                <div class="afisha-card-meta">Расписание обновляется</div>
                <div class="afisha-card-actions">
                    <span class="btn">&nbsp;</span>
                </div>
            </div>
        </article>
    `;

    grid.innerHTML = Array.from({ length: count }, () => skeleton).join('');
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-z0-9а-я]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function escapeHtml(value) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    return String(value ?? '').replace(/[&<>"']/g, (char) => map[char]);
}

function escapeAttr(value) {
    return escapeHtml(value);
}


function escapeCssUrl(value) {
    return String(value ?? '').replace(/([')\\"])/g, '\\$1');
}

