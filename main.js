'use strict';

const BAZA_AFISHA_URL = 'baza_afisha.json';
const AFISHA_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80';
const AFISHA_SUPPLEMENTAL = Object.freeze({
    marat: {
        title: 'Мой бедный Марат',
        venue: 'Москва · Центр Высоцкого',
        image: 'https://amma-production.ru/img/maxresdefault.png',
        description:
            'Легендарная история Алексея Арбузова о трёх молодых людях, чья дружба и любовь взрослеют на фоне осаждённого города.',
        creators: [
            
        ],
        gallery: []
    },
    okna: {
        title: 'Окна. Город. Любовь...',
        venue: 'Москва · Центр Высоцкого',
        image: '',
        description:
            '',
        creators: [
            { role: 'Режиссер', name: 'Вера Анненкова' },
            { role: 'В ролях', name: 'Максим Дементьев, Михаил Маликов, Алина Мазненкова, Аксинья Олейник' },
            
        ],
        gallery: []
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
        gallery: []
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

        const heroEvents = Array.isArray(eventList)
            ? eventList.filter((item) => item && item.showInHero !== false)
            : [];

        if (heroEvents.length) {
            const sorted = [...heroEvents].sort((a, b) => {
                const orderA = Number.isFinite(a.heroOrder) ? a.heroOrder : Number.MAX_SAFE_INTEGER;
                const orderB = Number.isFinite(b.heroOrder) ? b.heroOrder : Number.MAX_SAFE_INTEGER;

                if (orderA !== orderB) {
                    return orderA - orderB;
                }

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
    const actionsEl = modal.querySelector('[data-afisha-modal-actions]');
    const closeTriggers = modal.querySelectorAll('[data-afisha-modal-close]');
    let restoreFocusTo = null;
    let currentEventId = null;

    // Try server-side listing first (more efficient). Shared helper used by open() and renderGallery.
    async function fetchImgListFromServer(eventId){
        if(!eventId) return [];
        try{
            const resp = await fetch(`/api/img-list/${encodeURIComponent(eventId)}`, { cache: 'no-store' });
            if(!resp.ok) return [];
            const payload = await resp.json();
            if(Array.isArray(payload?.images) && payload.images.length) return payload.images.slice(0, 32);
        }catch(e){ /* ignore */ }
        return [];
    }

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
    // set current event id for probing img folder
    currentEventId = details.id || null;

    // Prefer server-side img list from img/<eventId> - faster and authoritative.
    (async () => {
        let serverList = [];
        if (currentEventId) {
            serverList = await fetchImgListFromServer(currentEventId);
        }

        if (serverList && serverList.length) {
            // server returned images (already randomized)
            console.info('afisha modal: using server-side img list for', currentEventId, serverList.length, 'images');
            renderGallery(serverList, title, { source: 'server' });
        } else {
            // fallback to JSON gallery or single image
            const galleryData = Array.isArray(details.gallery) && details.gallery.length ? details.gallery : (details.image ? [{ src: details.image }] : []);
            console.info('afisha modal: using JSON gallery / main image for', currentEventId, galleryData.length, 'images');
            renderGallery(galleryData, title, { source: 'json' });
        }
    })();
        renderActions(details.ticketButtons || [], details.ticketUrl);

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
                if (actionsEl) {
                    actionsEl.innerHTML = '';
                }
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

        const markup = '<h3 style="margin:0 0 0.5rem; font-size:1rem; color:var(--text)">Создатели</h3>' + list
            .map((item) => {
                const role = escapeHtml(item?.role || '');
                const name = escapeHtml(item?.name || '');
                return `<li><span class="afisha-modal-role">${role}</span><span class="afisha-modal-name">${name}</span></li>`;
            })
            .join('');

        creatorsEl.innerHTML = markup;
        creatorsEl.hidden = false;
    }

    function renderGallery(images, title, options = {}) {
        if (!galleryEl) {
            return;
        }

        if (!images.length) {
            galleryEl.innerHTML = '';
            galleryEl.hidden = true;
            return;
        }

        // helper to normalize image src (uploads/ or img/ -> absolute)
        function normalizeSrc(src){
            if(!src) return '';
            if(/^https?:\/\//i.test(src)) return src; // absolute URL
            if(src.startsWith('/')) return src; // already root-relative
            if(src.startsWith('uploads/') || src.startsWith('./uploads/') || src.startsWith('../uploads/')) return '/' + src.replace(/^\.\//, '');
            if(src.startsWith('img/') || src.startsWith('./img/') || src.startsWith('../img/')) return '/' + src.replace(/^\.\//, '');
            if(src.startsWith('./') || src.startsWith('../')) return src; // leave relative paths as-is
            // assume plain filename stored in gallery -> it's an upload
            return '/uploads/' + src;
        }

        // Note: fetchImgListFromServer is defined in outer scope (setupAfishaModal)

        // probe an img folder on the server for numbered images (client-side)
        async function probeImgFolderForEvent(eventId, limit=8){
            if(!eventId) return [];
            const candidates = [];
            const exts = ['jpg','jpeg','png','webp','svg'];
            // common naming patterns
            const patterns = [];
            for(let i=1;i<=limit;i++){
                patterns.push(String(i));
                patterns.push(String(i).padStart(2,'0'));
            }
            // try combinations
            for(const p of patterns){
                for(const ext of exts){
                    candidates.push(`/img/${encodeURIComponent(eventId)}/${p}.${ext}`);
                }
            }
            // also try generic names
            for(const ext of exts){ candidates.push(`/img/${encodeURIComponent(eventId)}/photo.${ext}`); candidates.push(`/img/${encodeURIComponent(eventId)}/main.${ext}`); }

            const found = [];
            // Probe sequentially to avoid many parallel requests
            for(const url of candidates){
                try{
                    const res = await fetch(url, { method: 'HEAD' });
                    if(res.ok){ found.push(url); }
                }catch(e){ /* ignore */ }
                if(found.length >= limit) break;
            }
            if(found.length) console.info('probeImgFolderForEvent: found', found.length, 'images for', eventId);
            return found;
        }

        // Build slides list from provided images OR probe /img/<id>/ if none provided
        let slides = images
            .map((entry) => normalizeSrc(typeof entry === 'string' ? entry : entry?.src))
            .filter(Boolean);

        if(options.source){
            console.info('renderGallery: source=', options.source, 'initialSlides=', slides.length);
        }

        if(!slides.length && currentEventId){
            // First try server-side listing (fast & reliable). If empty, fallback to HEAD probe.
            (async ()=>{
                let found = await fetchImgListFromServer(currentEventId);
                if(!found || !found.length){
                    found = await probeImgFolderForEvent(currentEventId, 8);
                }

                if(found && found.length){
                    // ensure shuffled order (server already randomizes but keep client-side safety)
                    for(let i = found.length -1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [found[i],found[j]]=[found[j],found[i]] }
                    // rebuild slider by calling renderGallery recursively with found slides as images
                    renderGallery(found, title);
                }
            })();
            // while async completion happens, keep gallery hidden
            return;
        }

        if(!slides.length){ galleryEl.innerHTML = ''; galleryEl.hidden = true; return; }

        // build slider markup
        const slidesMarkup = slides.map(src => `<div class="slide"><img src="${escapeAttr(src)}" loading="lazy"/></div>`).join('');
        const navButtons = slides.map((_,i)=>`<button data-slide="${i}">${i+1}</button>`).join('');
        galleryEl.innerHTML = `<div class="slider" aria-live="polite">${slidesMarkup}</div><div class="slider-nav">${navButtons}</div>`;
        galleryEl.hidden = false;

        // slider behavior: autoplay + navigation
        const slider = galleryEl.querySelector('.slider');
        const nav = galleryEl.querySelector('.slider-nav');
        let current = 0; let autoplayId = null;
        function showSlide(i){ current = (i+slides.length)%slides.length; slider.style.transform = `translateX(-${current*100}%)`; nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active', Number(b.dataset.slide)===current)); }
        function startAuto(){ if(autoplayId) clearInterval(autoplayId); autoplayId = setInterval(()=> showSlide(current+1), 4000); }
        function stopAuto(){ if(autoplayId) clearInterval(autoplayId); autoplayId = null; }

        nav.addEventListener('click', (e)=>{ const btn = e.target.closest('button'); if(!btn) return; stopAuto(); showSlide(Number(btn.dataset.slide)); startAuto(); });
        slider.addEventListener('mouseenter', stopAuto);
        slider.addEventListener('mouseleave', startAuto);

        // Swipe / drag support (touch and pointer)
        let isPointerDown = false;
        let startX = 0;
        let currentDelta = 0;
        const containerWidth = () => galleryEl.clientWidth || window.innerWidth;

        function applyDragTransform(delta){
            const w = containerWidth();
            slider.style.transition = 'none';
            slider.style.transform = `translateX(${ -current * w + delta }px)`;
        }

        function endDrag(){
            const w = containerWidth();
            slider.style.transition = 'transform 600ms cubic-bezier(.2,.9,.2,1)';
            // threshold 0.25 of width
            if(Math.abs(currentDelta) > w * 0.25){
                if(currentDelta > 0) showSlide(current-1); else showSlide(current+1);
            }else{
                showSlide(current);
            }
            currentDelta = 0; isPointerDown = false; startAuto();
        }

        // Pointer events (preferred)
        slider.addEventListener('pointerdown', (e)=>{
            isPointerDown = true; startX = e.clientX; currentDelta = 0; stopAuto(); slider.setPointerCapture && slider.setPointerCapture(e.pointerId);
        });
        slider.addEventListener('pointermove', (e)=>{
            if(!isPointerDown) return; currentDelta = e.clientX - startX; applyDragTransform(currentDelta);
        });
        slider.addEventListener('pointerup', (e)=>{ if(isPointerDown) { slider.releasePointerCapture && slider.releasePointerCapture(e.pointerId); endDrag(); } });
        slider.addEventListener('pointercancel', ()=>{ if(isPointerDown) endDrag(); });

        // Touch fallback (for older browsers)
        slider.addEventListener('touchstart', (e)=>{ if(e.touches && e.touches[0]){ startX = e.touches[0].clientX; currentDelta = 0; isPointerDown = true; stopAuto(); } }, {passive:true});
        slider.addEventListener('touchmove', (e)=>{ if(!isPointerDown) return; const t = e.touches && e.touches[0]; if(!t) return; currentDelta = t.clientX - startX; applyDragTransform(currentDelta); }, {passive:true});
        slider.addEventListener('touchend', (e)=>{ if(isPointerDown) endDrag(); });

        // init
        showSlide(0); startAuto();
    }

    // Lightbox implementation
    let lb = null;
    function createLightbox(){
        if(lb) return lb;
        lb = document.createElement('div'); lb.className='afisha-lightbox';
        lb.innerHTML = `
            <div class="lb-inner">
                <button class="lb-close" aria-label="Закрыть">&times;</button>
                <div style="text-align:center"><img src="" alt=""/></div>
                <div class="lb-caption"></div>
                <div class="lb-nav">
                  <button data-dir="prev">‹</button>
                  <button data-dir="next">›</button>
                </div>
            </div>
        `;
        document.body.appendChild(lb);
        lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
        lb.querySelector('[data-dir="prev"]').addEventListener('click', ()=> navigateLightbox(-1));
        lb.querySelector('[data-dir="next"]').addEventListener('click', ()=> navigateLightbox(1));
        lb.addEventListener('click', (e)=>{ if(e.target===lb) closeLightbox(); });
        return lb;
    }

    let lbImages = [];
    let lbIndex = 0;
    function openLightbox(imagesArray, index, title){
        if(!imagesArray || !imagesArray.length) return;
        lbImages = imagesArray;
        lbIndex = Math.max(0, Math.min(index || 0, imagesArray.length-1));
        const box = createLightbox();
        const img = box.querySelector('img');
        img.src = lbImages[lbIndex];
        box.querySelector('.lb-caption').textContent = title || '';
        box.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox(){ if(lb){ lb.classList.remove('is-visible'); document.body.style.overflow = ''; } }

    function navigateLightbox(dir){
        if(!lbImages || !lbImages.length) return;
        lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
        const img = lb.querySelector('img'); img.src = lbImages[lbIndex];
    }

    function renderActions(buttons, ticketUrl) {
        if (!actionsEl) {
            return;
        }

        const markup = createTicketActionsMarkup({ ticketButtons: buttons, ticketUrl }, { variant: 'modal' });
        actionsEl.innerHTML = markup;
        actionsEl.hidden = false;
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

    // returns true for events that should be visible (upcoming or undated)
    function isEventUpcoming(event){
        if(!event) return false;
        // keep events without a valid date
        if(!event.date || !(event.date instanceof Date) || Number.isNaN(event.date.getTime())) return true;
        const now = new Date();
        // compare only by date (local timezone) - event stays visible if its date is today or in future
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const eventDayStart = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate()).getTime();
        return eventDayStart >= todayStart;
    }

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
            const allEvents = list.map(normalizeAfishaEvent).filter(Boolean);

            // keep a full lookup for modal/details but only show upcoming events on the main page
            afishaLookup.clear();
            allEvents.forEach((item) => {
                if (item?.id) {
                    afishaLookup.set(item.id, item);
                }
            });

            events = allEvents.filter(isEventUpcoming);

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

    const description = typeof raw.description === 'string' && raw.description.trim()
        ? raw.description.trim()
        : supplemental.description || '';
    const creators = normalizeCreatorsList(raw.creators, supplemental.creators);
    const gallery = normalizeGalleryList(raw.gallery, supplemental.gallery);
    const image = (typeof raw.image === 'string' && raw.image.trim()) || supplemental.image || AFISHA_PLACEHOLDER_IMAGE;
    const primaryTicketUrl =
        raw.link ||
        raw.ticket ||
        raw.url ||
        raw.seance_url ||
        raw.seanceUrl ||
        raw.purchase_url ||
        raw.purchaseUrl ||
        raw.ticket_url ||
        raw.ticketUrl ||
        supplemental.ticketUrl ||
        '';
    const ticketButtons = normalizeTicketButtons(
        raw.ticketButtons ?? raw.buttons ?? raw.tickets,
        supplemental.ticketButtons,
        primaryTicketUrl,
    );
    const ticketUrl = ticketButtons.length
        ? ticketButtons[0].url
        : typeof primaryTicketUrl === 'string'
        ? primaryTicketUrl.trim()
        : '';

    const showInHero = parseBoolean(raw.showInHero ?? raw.hero ?? true);
    const heroOrder = toFiniteNumber(raw.heroOrder ?? raw.heroPriority);


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
        ticketButtons,
        venue,
        showInHero,
        heroOrder
    };
}

function toFiniteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function parseBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['false', '0', 'нет', 'no', 'off'].includes(normalized)) {
            return false;
        }
        if (['true', '1', 'да', 'yes', 'on'].includes(normalized)) {
            return true;
        }
    }

    return Boolean(value);
}

function normalizeCreatorsList(primary, fallback) {
    const source = Array.isArray(primary) && primary.length ? primary : Array.isArray(fallback) ? fallback : [];

    return source
        .map((entry) => {
            if (!entry) {
                return null;
            }

            if (typeof entry === 'string') {
                const name = entry.trim();
                return name ? { role: '', name } : null;
            }

            if (typeof entry === 'object') {
                const role = typeof entry.role === 'string' ? entry.role.trim() : '';
                const name = typeof entry.name === 'string' ? entry.name.trim() : '';

                if (!role && !name) {
                    return null;
                }

                return { role, name };
            }

            return null;
        })
        .filter(Boolean);
}

function normalizeGalleryList(primary, fallback) {
    const source = Array.isArray(primary) && primary.length ? primary : Array.isArray(fallback) ? fallback : [];

    return source
        .map((entry) => {
            if (!entry) {
                return null;
            }

            if (typeof entry === 'string') {
                const src = entry.trim();
                return src ? { src } : null;
            }

            if (typeof entry === 'object') {
                const src = typeof entry.src === 'string' ? entry.src.trim() : '';
                const caption = typeof entry.caption === 'string' ? entry.caption.trim() : '';
                return src ? (caption ? { src, caption } : { src }) : null;
            }

            return null;
        })
        .filter(Boolean);
}

function normalizeTicketButtons(primary, fallback, fallbackUrl) {
    const source = Array.isArray(primary) && primary.length ? primary : Array.isArray(fallback) ? fallback : [];
    const seen = new Set();

    const normalized = source
        .map((entry) => {
            if (!entry) {
                return null;
            }

            if (typeof entry === 'string') {
                const url = entry.trim();
                if (!url) {
                    return null;
                }

                return { url, label: 'Купить билет' };
            }

            if (typeof entry === 'object') {
                const rawUrl =
                    typeof entry.url === 'string'
                        ? entry.url
                        : typeof entry.href === 'string'
                        ? entry.href
                        : '';
                const url = rawUrl.trim();
                if (!url) {
                    return null;
                }

                const rawLabel =
                    typeof entry.label === 'string'
                        ? entry.label
                        : typeof entry.title === 'string'
                        ? entry.title
                        : 'Купить билет';
                const label = rawLabel.trim() || 'Купить билет';

                return { url, label };
            }

            return null;
        })
        .filter((item) => {
            if (!item) {
                return false;
            }

            if (seen.has(item.url)) {
                return false;
            }

            seen.add(item.url);
            return true;
        });

    if (!normalized.length && typeof fallbackUrl === 'string') {
        const url = fallbackUrl.trim();
        if (url && !seen.has(url)) {
            normalized.push({ url, label: 'Купить билет' });
        }
    }

    return normalized;
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
    const triggerId = escapeAttr(event.id || 'event');
    const openLabel = escapeAttr(`Открыть описание спектакля «${event.title}»`);
    const actionMarkup = createTicketActionsMarkup(event, { variant: 'card' });

    const dateLabel =
        event.date instanceof Date && !Number.isNaN(event.date.getTime())
            ? event.date.toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: 'long',
              })
            : '';
    const metaItems = [];

    if (dateLabel) {
        metaItems.push(`<span class="afisha-card-meta-item afisha-card-date">${escapeHtml(dateLabel)}</span>`);
    }

    if (event.time) {
        metaItems.push(`<span class="afisha-card-meta-item">${escapeHtml(event.time)}</span>`);
    }

    if (event.venue) {
        metaItems.push(`<span class="afisha-card-meta-item">${escapeHtml(event.venue)}</span>`);
    }

    const metaMarkup = metaItems.length
        ? metaItems.join('')
        : `<span class="afisha-card-meta-item">${escapeHtml(event.cardMeta || 'Дата уточняется')}</span>`;

    return `
        <article class="afisha-card" data-afisha-id="${triggerId}">
            <button type="button" class="afisha-card-cover" data-afisha-trigger="${triggerId}" aria-label="${openLabel}">
                <img src="${cover}" alt="${safeAlt}" loading="lazy">
            </button>
            <div class="afisha-card-body">
                <h3 class="afisha-card-title">${safeTitle}</h3>
                <div class="afisha-card-meta">${metaMarkup}</div>
                <div class="afisha-card-actions">

                    ${actionMarkup}
                </div>
            </div>
        </article>
    `;
}

function createTicketActionsMarkup(event, options = {}) {
    const { variant = 'card' } = options || {};
    const buttons = buildTicketButtonList(event?.ticketButtons, event?.ticketUrl);

    if (buttons.length) {
        return buttons
            .map((button) => {
                const href = escapeAttr(button.url);
                const label = escapeHtml(button.label || 'Купить билет');
                return `<a class="btn" href="${href}" target="_blank" rel="noopener">${label}</a>`;
            })
            .join('');
    }

    const badgeClass = variant === 'modal' ? 'afisha-modal-badge' : 'afisha-card-badge';
    return `<span class="${badgeClass}" aria-label="Билеты появятся позже">Скоро в продаже</span>`;
}

function buildTicketButtonList(buttons, fallbackUrl) {
    return normalizeTicketButtons(buttons, [], fallbackUrl);
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
                <div class="afisha-card-meta"><span class="afisha-card-meta-item">Расписание обновляется</span></div>
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