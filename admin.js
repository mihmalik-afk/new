'use strict';

(function () {
    const BAZA_URL = 'baza_afisha.json';
    const API_SAVE_URL = '/api/admin/events';
    const API_UPLOAD_URL = '/api/admin/upload';
    const UNSAVED_MESSAGE = 'Есть несохранённые изменения';
    const UPLOAD_MESSAGE = 'Идёт загрузка файлов…';
    const DEFAULT_IMAGE =
        'https://images.unsplash.com/photo-1515169067865-5387ec356754?auto=format&fit=crop&w=900&q=80';

    const state = {
        events: [],
        dirty: false,
        loading: false,
        saving: false,
        pendingUploads: 0,
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', () => {
        cacheElements();
        bindGlobalActions();
        loadInitialData();
    });

    function cacheElements() {
        elements.status = document.querySelector('[data-admin-status]');
        elements.eventsContainer = document.querySelector('[data-admin-events]');
        elements.addEventButton = document.querySelector('[data-admin-add-event]');
        elements.saveButton = document.querySelector('[data-admin-save]');
        elements.jsonPreview = document.querySelector('[data-admin-json]');
        elements.heroPreview = document.querySelector('[data-admin-hero-preview]');
        elements.downloadButton = document.querySelector('[data-admin-download]');
        elements.copyButton = document.querySelector('[data-admin-copy]');
        elements.reloadButton = document.querySelector('[data-admin-reload]');
        elements.importButton = document.querySelector('[data-admin-import]');
        elements.importInput = document.querySelector('[data-admin-import-input]');
        elements.unsavedBadge = document.querySelector('[data-admin-unsaved]');
    }

    function bindGlobalActions() {
        if (elements.addEventButton) {
            elements.addEventButton.addEventListener('click', () => {
                addEvent();
            });
        }

        if (elements.saveButton) {
            elements.saveButton.addEventListener('click', () => {
                saveChanges();
            });
        }

        if (elements.downloadButton) {
            elements.downloadButton.addEventListener('click', downloadJson);
        }

        if (elements.copyButton) {
            elements.copyButton.addEventListener('click', copyJsonToClipboard);
        }

        if (elements.reloadButton) {
            elements.reloadButton.addEventListener('click', () => {
                if (!state.dirty || window.confirm('Несохранённые изменения будут потеряны. Продолжить?')) {
                    loadInitialData();
                }
            });
        }

        if (elements.importButton && elements.importInput) {
            elements.importButton.addEventListener('click', () => {
                elements.importInput.value = '';
                elements.importInput.click();
            });

            elements.importInput.addEventListener('change', handleImportFile);
        }

        window.addEventListener('beforeunload', (event) => {
            if (state.dirty) {
                event.preventDefault();
                event.returnValue = '';
            }
        });
    }

    async function loadInitialData() {
        setLoading(true);
        setStatus('Загружаем baza_afisha.json…');

        try {
            const response = await fetch(`${BAZA_URL}?_=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Не удалось загрузить файл (статус ${response.status})`);
            }

            const payload = await response.json();
            const events = Array.isArray(payload?.events) ? payload.events : [];
            state.events = events.map(normalizeEventFromJson);
            state.dirty = false;

            render();
            setStatus(`Загружено событий: ${state.events.length}`);
        } catch (error) {
            console.error(error);
            setStatus('Не удалось загрузить baza_afisha.json. Проверьте файл или попробуйте позже.', 'error');
        } finally {
            setLoading(false);
        }
    }

    function normalizeEventFromJson(raw, index) {
        const title = typeof raw?.title === 'string' ? raw.title : '';
        const id = typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : slugify(title) || `event-${index + 1}`;
        const image = typeof raw?.image === 'string' && raw.image.trim() ? raw.image.trim() : DEFAULT_IMAGE;
        const link = typeof raw?.link === 'string' ? raw.link.trim() : '';
        const description = typeof raw?.description === 'string' ? raw.description.trim() : '';
        const venue = typeof raw?.venue === 'string' ? raw.venue.trim() : '';
        const heroOrder = toFiniteNumber(raw?.heroOrder ?? raw?.heroPriority);
        const showInHero = parseBoolean(raw?.showInHero ?? raw?.hero ?? true);

        return {
            id,
            title,
            date: normalizeDateString(raw?.date),
            time: normalizeTimeString(raw?.time),
            venue,
            link,
            image,
            description,
            showInHero,
            heroOrder,
            _idManuallyChanged: Boolean(raw?.id && raw.id !== slugify(title)),
        };
    }

    function normalizeDateString(value) {
        if (!value) {
            return '';
        }

        const isoCandidate = new Date(value);
        if (!Number.isNaN(isoCandidate.getTime())) {
            return isoCandidate.toISOString().slice(0, 10);
        }

        const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return match[1];
        }

        return '';
    }

    function normalizeTimeString(value) {
        if (!value) {
            return '';
        }

        const match = String(value).match(/^(\d{2}:\d{2})/);
        return match ? match[1] : '';
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
            if (['false', '0', 'no', 'нет'].includes(normalized)) {
                return false;
            }
            if (['true', '1', 'yes', 'да'].includes(normalized)) {
                return true;
            }
        }

        return Boolean(value);
    }

    function setLoading(isLoading) {
        state.loading = isLoading;
        if (elements.eventsContainer) {
            elements.eventsContainer.classList.toggle('is-loading', isLoading);
        }
    }

    function setSaving(isSaving) {
        if (state.saving === isSaving) {
            return;
        }

        state.saving = isSaving;
        updateUnsavedBadge();
    }

    function beginUpload() {
        state.pendingUploads += 1;
        updateUnsavedBadge();
    }

    function finishUpload() {
        state.pendingUploads = Math.max(0, state.pendingUploads - 1);
        updateUnsavedBadge();
    }

    function setStatus(message, type = 'info') {
        if (!elements.status) {
            return;
        }

        elements.status.textContent = message;
        elements.status.dataset.type = type;
    }

    function render() {
        renderEvents();
        renderHeroPreview();
        renderJsonPreview();
        updateUnsavedBadge();
    }

    function renderEvents() {
        if (!elements.eventsContainer) {
            return;
        }

        const expanded = new Set();
        elements.eventsContainer
            .querySelectorAll('details[open]')
            .forEach((details) => expanded.add(details.dataset.eventId));

        elements.eventsContainer.innerHTML = '';

        if (!state.events.length) {
            const empty = document.createElement('p');
            empty.className = 'admin-empty';
            empty.textContent = 'Событий пока нет. Добавьте первое событие, чтобы начать.';
            elements.eventsContainer.appendChild(empty);
            return;
        }

        state.events.forEach((event, index) => {
            const details = document.createElement('details');
            details.className = 'admin-event';
            details.dataset.eventId = event.id || `event-${index}`;
            if (expanded.has(details.dataset.eventId) || state.events.length === 1) {
                details.open = true;
            }

            const summary = document.createElement('summary');
            summary.className = 'admin-event__summary';
            summary.innerHTML = `
                <span class="admin-event__summary-title">${escapeHtml(event.title || 'Без названия')}</span>
                <span class="admin-event__summary-meta">${formatSummaryMeta(event)}</span>
            `;
            details.appendChild(summary);

            const form = document.createElement('div');
            form.className = 'admin-event__form';

            form.appendChild(createTextField('Название', event.title, (value) => updateEvent(index, 'title', value)));
            form.appendChild(
                createTextField(
                    'Дата',
                    event.date,
                    (value) => updateEvent(index, 'date', value),
                    {
                        type: 'date',
                        placeholder: '2025-12-31',
                    },
                ),
            );
            form.appendChild(
                createTextField(
                    'Время',
                    event.time,
                    (value) => updateEvent(index, 'time', value),
                    {
                        type: 'time',
                        placeholder: '19:00',
                    },
                ),
            );
            form.appendChild(createTextField('Площадка', event.venue, (value) => updateEvent(index, 'venue', value)));
            form.appendChild(
                createTextField('Ссылка на билеты', event.link, (value) => updateEvent(index, 'link', value), {
                    type: 'url',
                    placeholder: 'https://example.com/tickets',
                }),
            );
            const imageField = createTextField('Изображение (URL)', event.image, (value) => updateEvent(index, 'image', value), {
                type: 'url',
            });
            const imageInput = imageField.querySelector('input');
            const imageActions = document.createElement('div');
            imageActions.className = 'admin-field__actions';

            const uploadButton = document.createElement('button');
            uploadButton.type = 'button';
            uploadButton.className = 'admin-btn admin-btn--ghost';
            uploadButton.textContent = 'Загрузить изображение…';

            const uploadHint = document.createElement('span');
            uploadHint.textContent = 'Поддерживаются JPG, PNG и WebP до 5 МБ.';

            const uploadInput = document.createElement('input');
            uploadInput.type = 'file';
            uploadInput.accept = 'image/*';
            uploadInput.hidden = true;

            uploadButton.addEventListener('click', () => {
                if (!state.pendingUploads && !state.saving) {
                    uploadInput.click();
                } else if (state.pendingUploads) {
                    setStatus('Дождитесь завершения текущей загрузки изображения.', 'info');
                }
            });

            uploadInput.addEventListener('change', async (event) => {
                const file = event.target.files && event.target.files[0];
                if (!file) {
                    return;
                }

                beginUpload();
                uploadButton.disabled = true;
                setStatus('Загружаем изображение…');

                try {
                    const url = await uploadImageFile(file);
                    if (imageInput) {
                        imageInput.value = url;
                    }
                    updateEvent(index, 'image', url);
                    setStatus('Изображение загружено и привязано к событию.', 'success');
                } catch (error) {
                    console.error(error);
                    setStatus(error.message || 'Не удалось загрузить изображение. Попробуйте другой файл.', 'error');
                } finally {
                    uploadInput.value = '';
                    uploadButton.disabled = false;
                    finishUpload();
                }
            });

            imageActions.appendChild(uploadButton);
            imageActions.appendChild(uploadHint);
            imageField.appendChild(imageActions);
            imageField.appendChild(uploadInput);
            form.appendChild(imageField);
            form.appendChild(
                createTextareaField(
                    'Описание',
                    event.description,
                    (value) => updateEvent(index, 'description', value),
                    {
                        placeholder: 'Краткое описание спектакля…',
                        rows: 3,
                    },
                ),
            );

            form.appendChild(createCheckboxField('Показывать в слайдере', event.showInHero, (value) => {
                updateEvent(index, 'showInHero', value);
            }));

            form.appendChild(
                createTextField(
                    'Порядок в слайдере',
                    event.heroOrder ?? '',
                    (value) => updateEvent(index, 'heroOrder', value),
                    {
                        type: 'number',
                        placeholder: 'Например, 1',
                    },
                ),
            );

            form.appendChild(
                createTextField('Уникальный ID', event.id, (value) => updateEvent(index, 'id', value), {
                    helpText: 'Используется для внутренних ссылок и совпадения с расширенными данными.',
                }),
            );

            const actions = document.createElement('div');
            actions.className = 'admin-event__actions';

            const duplicateButton = document.createElement('button');
            duplicateButton.type = 'button';
            duplicateButton.className = 'admin-btn admin-btn--ghost';
            duplicateButton.textContent = 'Дублировать';
            duplicateButton.addEventListener('click', () => duplicateEvent(index));
            actions.appendChild(duplicateButton);

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'admin-btn admin-btn--danger';
            deleteButton.textContent = 'Удалить событие';
            deleteButton.addEventListener('click', () => deleteEvent(index));
            actions.appendChild(deleteButton);

            form.appendChild(actions);
            details.appendChild(form);
            elements.eventsContainer.appendChild(details);
        });
    }

    function formatSummaryMeta(event) {
        const parts = [];
        if (event.date) {
            parts.push(event.date);
        }
        if (event.time) {
            parts.push(event.time);
        }
        if (!parts.length) {
            parts.push('Без даты');
        }
        return escapeHtml(parts.join(' · '));
    }

    function createTextField(label, value, onInput, options = {}) {
        const { type = 'text', placeholder = '', helpText = '' } = options;

        const wrapper = document.createElement('label');
        wrapper.className = 'admin-field';

        const title = document.createElement('span');
        title.className = 'admin-field__label';
        title.textContent = label;
        wrapper.appendChild(title);

        const input = document.createElement('input');
        input.className = 'admin-input';
        input.type = type;
        input.value = value ?? '';
        input.placeholder = placeholder;
        input.addEventListener('input', (event) => {
            onInput(event.target.value);
        });
        wrapper.appendChild(input);

        if (helpText) {
            const help = document.createElement('span');
            help.className = 'admin-field__help';
            help.textContent = helpText;
            wrapper.appendChild(help);
        }

        return wrapper;
    }

    function createTextareaField(label, value, onInput, options = {}) {
        const { rows = 4, placeholder = '' } = options;

        const wrapper = document.createElement('label');
        wrapper.className = 'admin-field';

        const title = document.createElement('span');
        title.className = 'admin-field__label';
        title.textContent = label;
        wrapper.appendChild(title);

        const textarea = document.createElement('textarea');
        textarea.className = 'admin-textarea';
        textarea.rows = rows;
        textarea.placeholder = placeholder;
        textarea.value = value ?? '';
        textarea.addEventListener('input', (event) => {
            onInput(event.target.value);
        });
        wrapper.appendChild(textarea);

        return wrapper;
    }

    function createCheckboxField(label, checked, onToggle) {
        const wrapper = document.createElement('label');
        wrapper.className = 'admin-checkbox';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = Boolean(checked);
        input.addEventListener('change', (event) => {
            onToggle(event.target.checked);
        });
        wrapper.appendChild(input);

        const span = document.createElement('span');
        span.textContent = label;
        wrapper.appendChild(span);

        return wrapper;
    }

    function updateEvent(index, field, value) {
        const event = state.events[index];
        if (!event) {
            return;
        }

        if (field === 'title') {
            const previousTitle = event.title;
            event.title = value;
            const previousSlug = slugify(previousTitle);
            const currentSlug = slugify(event.id);
            const generatedSlug = slugify(value);
            if (!event._idManuallyChanged && (!event.id || event.id === previousSlug || event.id === currentSlug)) {
                event.id = generatedSlug || event.id;
            }
        } else if (field === 'id') {
            const sanitized = slugify(value);
            event.id = sanitized;
            event._idManuallyChanged = Boolean(sanitized);
        } else if (field === 'heroOrder') {
            const numeric = toFiniteNumber(value);
            event.heroOrder = numeric;
        } else if (field === 'showInHero') {
            event.showInHero = Boolean(value);
        } else {
            event[field] = value;
        }

        markDirty();
        render();
    }

    function duplicateEvent(index) {
        const event = state.events[index];
        if (!event) {
            return;
        }

        const clone = {
            ...event,
            id: generateUniqueId(event.id),
            title: `${event.title || 'Событие'} (копия)`,
            _idManuallyChanged: false,
        };

        state.events.splice(index + 1, 0, clone);
        markDirty();
        render();
    }

    function deleteEvent(index) {
        const event = state.events[index];
        if (!event) {
            return;
        }

        const confirmationMessage = `Удалить событие «${event.title || event.id || 'без названия'}»?`;
        if (!window.confirm(confirmationMessage)) {
            return;
        }

        state.events.splice(index, 1);
        markDirty();
        render();
    }

    function addEvent() {
        const newEvent = {
            id: generateUniqueId('novyy-spektakl'),
            title: 'Новый спектакль',
            date: '',
            time: '',
            venue: '',
            link: '',
            image: DEFAULT_IMAGE,
            description: '',
            showInHero: true,
            heroOrder: null,
            _idManuallyChanged: false,
        };

        state.events.unshift(newEvent);
        markDirty();
        render();
    }

    function generateUniqueId(base) {
        let candidate = slugify(base || 'event');
        if (!candidate) {
            candidate = 'event';
        }

        let suffix = 1;
        const existing = new Set(state.events.map((event) => event.id));
        let uniqueId = candidate;
        while (existing.has(uniqueId)) {
            suffix += 1;
            uniqueId = `${candidate}-${suffix}`;
        }

        return uniqueId;
    }

    function markDirty() {
        if (!state.dirty) {
            state.dirty = true;
            updateUnsavedBadge();
        }
    }

    function renderHeroPreview() {
        if (!elements.heroPreview) {
            return;
        }

        const heroEvents = state.events.filter((event) => event.showInHero);
        if (!heroEvents.length) {
            elements.heroPreview.innerHTML = '<p class="admin-empty">Ни одно событие не отмечено для слайдера.</p>';
            return;
        }

        const sorted = [...heroEvents].sort((a, b) => {
            const orderA = toFiniteNumber(a.heroOrder ?? Number.MAX_SAFE_INTEGER);
            const orderB = toFiniteNumber(b.heroOrder ?? Number.MAX_SAFE_INTEGER);
            if (orderA !== orderB) {
                return orderA - orderB;
            }

            const dateA = a.date ? new Date(`${a.date}T${a.time || '00:00'}`) : null;
            const dateB = b.date ? new Date(`${b.date}T${b.time || '00:00'}`) : null;
            const timeA = dateA instanceof Date && !Number.isNaN(dateA.getTime()) ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
            const timeB = dateB instanceof Date && !Number.isNaN(dateB.getTime()) ? dateB.getTime() : Number.MAX_SAFE_INTEGER;

            if (timeA !== timeB) {
                return timeA - timeB;
            }

            return (a.title || '').localeCompare(b.title || '', 'ru');
        });

        const list = document.createElement('ol');
        list.className = 'admin-hero-list';
        sorted.forEach((event) => {
            const item = document.createElement('li');
            item.className = 'admin-hero-item';
            item.innerHTML = `
                <div class="admin-hero-thumb" style="background-image: url('${escapeAttr(event.image)}');"></div>
                <div class="admin-hero-content">
                    <strong>${escapeHtml(event.title || 'Без названия')}</strong>
                    <span>${formatSummaryMeta(event)}</span>
                </div>
            `;
            list.appendChild(item);
        });

        elements.heroPreview.innerHTML = '';
        elements.heroPreview.appendChild(list);
    }

    function renderJsonPreview() {
        if (!elements.jsonPreview) {
            return;
        }

        const json = JSON.stringify(buildPayload(), null, 2);
        elements.jsonPreview.value = json;
    }

    function buildPayload() {
        const events = state.events.map((event) => ({
            id: event.id,
            title: event.title,
            date: event.date || null,
            time: event.time || null,
            venue: event.venue || '',
            link: event.link || '',
            image: event.image || DEFAULT_IMAGE,
            description: event.description || '',
            showInHero: Boolean(event.showInHero),
            heroOrder: event.heroOrder,
        }));

        return { events };
    }

    async function saveChanges() {
        if (state.loading || state.saving) {
            return;
        }

        if (state.pendingUploads > 0) {
            setStatus('Дождитесь завершения загрузки изображений и попробуйте ещё раз.', 'error');
            return;
        }

        if (!state.dirty) {
            setStatus('Нет несохранённых изменений.', 'success');
            return;
        }

        setSaving(true);
        setStatus('Сохраняем изменения…');

        try {
            const response = await fetch(API_SAVE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildPayload()),
            });

            const responseText = await response.text();
            let payload = null;

            if (responseText) {
                try {
                    payload = JSON.parse(responseText);
                } catch (error) {
                    console.error('Не удалось разобрать ответ сервера', error);
                }
            }

            if (!response.ok) {
                const message = payload?.error || `Не удалось сохранить изменения (статус ${response.status})`;
                throw new Error(message);
            }

            if (payload && Array.isArray(payload.events)) {
                state.events = payload.events.map(normalizeEventFromJson);
            }

            state.dirty = false;
            render();
            setStatus('Изменения сохранены и опубликованы.', 'success');
        } catch (error) {
            console.error(error);
            setStatus(error.message || 'Не удалось сохранить изменения. Попробуйте ещё раз.', 'error');
        } finally {
            setSaving(false);
        }
    }

    function updateUnsavedBadge() {
        if (elements.saveButton) {
            elements.saveButton.disabled = state.saving || state.pendingUploads > 0 || !state.dirty;
            elements.saveButton.textContent = state.saving ? 'Сохраняем…' : 'Сохранить изменения';
        }

        if (!elements.unsavedBadge) {
            return;
        }

        if (state.pendingUploads > 0) {
            elements.unsavedBadge.hidden = false;
            elements.unsavedBadge.textContent = UPLOAD_MESSAGE;
        } else if (state.dirty) {
            elements.unsavedBadge.hidden = false;
            elements.unsavedBadge.textContent = UNSAVED_MESSAGE;
        } else {
            elements.unsavedBadge.hidden = true;
            elements.unsavedBadge.textContent = UNSAVED_MESSAGE;
        }
    }

    function downloadJson() {
        const payload = buildPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'baza_afisha.json';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        setStatus('Файл baza_afisha.json скачан. Замените им файл в проекте.', 'success');
        state.dirty = false;
        updateUnsavedBadge();
    }

    async function copyJsonToClipboard() {
        try {
            const json = JSON.stringify(buildPayload(), null, 2);
            await navigator.clipboard.writeText(json);
            setStatus('JSON скопирован в буфер обмена.', 'success');
            state.dirty = false;
            updateUnsavedBadge();
        } catch (error) {
            console.error(error);
            setStatus('Не удалось скопировать JSON. Скачайте файл и замените его вручную.', 'error');
        }
    }

    function handleImportFile(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result));
                if (!Array.isArray(parsed?.events)) {
                    throw new Error('В загруженном файле отсутствует поле events.');
                }

                state.events = parsed.events.map(normalizeEventFromJson);
                state.dirty = true;
                render();
                setStatus(`Импортировано событий: ${state.events.length}`, 'success');
            } catch (error) {
                console.error(error);
                setStatus('Не удалось обработать файл. Убедитесь, что это экспорт с админ-панели.', 'error');
            }
        };
        reader.readAsText(file);
    }

    async function uploadImageFile(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(API_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        const text = await response.text();
        let payload = null;

        if (text) {
            try {
                payload = JSON.parse(text);
            } catch (error) {
                console.error('Не удалось разобрать ответ сервера при загрузке изображения', error);
            }
        }

        if (!response.ok) {
            const message = payload?.error || `Не удалось загрузить изображение (статус ${response.status})`;
            throw new Error(message);
        }

        if (!payload?.url) {
            throw new Error('Сервер не вернул ссылку на загруженный файл.');
        }

        return payload.url;
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
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(value) {
        return String(value || '')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
