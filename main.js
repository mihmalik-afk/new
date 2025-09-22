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
        ],
        ticketUrl: 'https://iframeab-pre2514.intickets.ru/seance/60835614/#abiframe'
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
        ],
        ticketUrl: 'https://iframeab-pre2514.intickets.ru/event/11756122/#abiframe'
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
        ],
        ticketUrl: 'https://iframeab-pre2514.intickets.ru/events/#abiframe'
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initHeroSlider();
    const modalController = setupAfishaModal();
    initAfishaSection(modalController);
});

function initHeroSlider() {
    const slider = document.querySelector('.hero-slider');
    if (!slider) {
        return;
    }

    const slides = Array.from(slider.querySelectorAll('.banner-item'));
    if (!slides.length) {
        return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    slides.forEach((slide, index) => {
        slide.classList.toggle('is-active', index === 0);
    });

    if (reduceMotion || slides.length <= 1) {
        return;
    }

    let current = 0;
    const cycleDuration = 5000;
    setInterval(() => {
        slides[current].classList.remove('is-active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('is-active');
    }, cycleDuration);
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

function initAfishaSection(modalController) {
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
        } catch (error) {
            console.error('Не удалось загрузить baza_afisha.json', error);
            events = [];
            afishaLookup.clear();

            if (statusField) {
                statusField.hidden = false;
                statusField.textContent = 'Не удалось загрузить baza_afisha.json. Проверьте содержимое файла.';
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
    const isoDate = buildIsoDate(raw.date, raw.time);
    const parsedDate = isoDate ? new Date(isoDate) : null;
    const isValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate?.getTime());
    const cardMeta = buildCardMeta(parsedDate, raw.time, supplemental.venue);
    const modalMeta = buildModalMeta(parsedDate, raw.time, supplemental.venue);
    const description = supplemental.description || '';
    const creators = Array.isArray(supplemental.creators) ? supplemental.creators : [];
    const gallery = Array.isArray(supplemental.gallery) ? supplemental.gallery : [];
    const image = supplemental.image || AFISHA_PLACEHOLDER_IMAGE;
    const ticketUrl = raw.link || supplemental.ticketUrl || '';
    const venue = supplemental.venue || '';

    return {
        id: id || slugify(title),
        title,
        date: isValidDate ? parsedDate : null,
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

    const normalizedDate = `${date}`.trim();
    if (!time) {
        return normalizedDate;
    }

    const normalizedTime = `${time}`.trim();
    return `${normalizedDate}T${normalizedTime}`;
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

function renderAfishaCard(event) {
    const safeTitle = escapeHtml(event.title);
    const safeAlt = escapeAttr(`Афиша спектакля ${event.title}`);
    const cover = escapeAttr(event.image || AFISHA_PLACEHOLDER_IMAGE);
    const meta = escapeHtml(event.cardMeta || 'Дата уточняется');
    const ticketLink = escapeAttr(event.ticketUrl || '#');
    const triggerId = escapeAttr(event.id || 'event');
    const openLabel = escapeAttr(`Открыть описание спектакля «${event.title}»`);

    return `
        <article class="afisha-card" data-afisha-id="${triggerId}">
            <button type="button" class="afisha-card-cover" data-afisha-trigger="${triggerId}" aria-label="${openLabel}">
                <img src="${cover}" alt="${safeAlt}" loading="lazy">
            </button>
            <div class="afisha-card-body">
                <h3 class="afisha-card-title">${safeTitle}</h3>
                <div class="afisha-card-meta">${meta}</div>
                <div class="afisha-card-actions">
                    <a class="btn" href="${ticketLink}" target="_blank" rel="noopener">Купить билет</a>
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
