'use strict';

(function () {
    const BAZA_URL = 'baza_afisha.json';
    const API_SAVE_URL = '/api/admin/events';
    const API_UPLOAD_URL = '/api/admin/upload';

    const ADMIN_AUTH_STORAGE_KEY = 'amma-admin-token';

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
        authToken: '',

    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', () => {
        cacheElements();
        bindGlobalActions();
        hydrateAuthToken();
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
        elements.authButton = document.querySelector('[data-admin-auth]');
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

        if (elements.authButton) {
            elements.authButton.addEventListener('click', () => {
                promptForAuthToken();
            });
        }

        window.addEventListener('beforeunload', (event) => {
            if (state.dirty) {
                event.preventDefault();
                event.returnValue = '';
            }
        });
    }

    function hydrateAuthToken() {
        state.authToken = getStoredAuthToken();
        updateAuthButton();
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
            details.dataset.eventIndex = String(index);
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

            form.appendChild(
                createTextField(
                    'Название',
                    event.title,
                    (value, input) => updateEvent(index, 'title', value, { input }),
                    { fieldName: 'title' },
                ),
            );
            form.appendChild(
                createTextField(
                    'Дата',
                    event.date,
                    (value, input) => updateEvent(index, 'date', value, { input }),
                    {
                        type: 'date',
                        placeholder: '2025-12-31',
                        fieldName: 'date',
                    },
                ),
            );
            form.appendChild(
                createTextField(
                    'Время',
                    event.time,
                    (value, input) => updateEvent(index, 'time', value, { input }),
                    {
                        type: 'time',
                        placeholder: '19:00',
                        fieldName: 'time',
                    },
                ),
            );
            form.appendChild(
                createTextField(
                    'Площадка',
                    event.venue,
                    (value, input) => updateEvent(index, 'venue', value, { input }),
                    { fieldName: 'venue' },
                ),
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

                if (!ensureAuthToken()) {
                    setStatus('Чтобы загрузить изображение, укажите ключ доступа администратора.', 'error');
                    uploadInput.value = '';
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
                    (value, input) => updateEvent(index, 'description', value, { input }),
                    {
                        placeholder: 'Краткое описание спектакля…',
                        rows: 3,
                        fieldName: 'description',
                    },
                ),
            );

            form.appendChild(
                createCheckboxField('Показывать в слайдере', event.showInHero, (value, input) => {
                    updateEvent(index, 'showInHero', value, { input });
                }, { fieldName: 'showInHero' }),
            );

            form.appendChild(
                createTextField(
                    'Порядок в слайдере',
                    event.heroOrder ?? '',
                    (value, input) => updateEvent(index, 'heroOrder', value, { input }),
                    {
                        type: 'number',
                        placeholder: 'Например, 1',
                        fieldName: 'heroOrder',
                    },
                ),
            );

            form.appendChild(
                createTextField(
                    'Уникальный ID',
                    event.id,
                    (value, input) => updateEvent(index, 'id', value, { input }),
                    {
                        helpText: 'Используется для внутренних ссылок и совпадения с расширенными данными.',
                        fieldName: 'id',
                    },
                ),
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
        const { type = 'text', placeholder = '', helpText = '', fieldName = '' } = options;

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
        if (fieldName) {
            input.dataset.fieldName = fieldName;
        }
        input.addEventListener('input', (event) => {
            onInput(event.target.value, event.target);
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
        const { rows = 4, placeholder = '', fieldName = '' } = options;

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
        if (fieldName) {
            textarea.dataset.fieldName = fieldName;
        }
        textarea.addEventListener('input', (event) => {
            onInput(event.target.value, event.target);
        });
        wrapper.appendChild(textarea);

        return wrapper;
    }

    function createCheckboxField(label, checked, onToggle, options = {}) {
        const { fieldName = '' } = options;

        const wrapper = document.createElement('label');
        wrapper.className = 'admin-checkbox';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = Boolean(checked);
        if (fieldName) {
            input.dataset.fieldName = fieldName;
        }
        input.addEventListener('change', (event) => {
            onToggle(event.target.checked, event.target);
        });
        wrapper.appendChild(input);

        const span = document.createElement('span');
        span.textContent = label;
        wrapper.appendChild(span);

        return wrapper;
    }

    function updateEvent(index, field, value, context = {}) {
        const event = state.events[index];
        if (!event) {
            return;
        }

        const { input } = context || {};

        if (field === 'title') {
            const previousTitle = event.title;
            const previousId = event.id;
            event.title = value;
            const previousSlug = slugify(previousTitle);
            const currentSlug = slugify(previousId);
            const generatedSlug = slugify(value);
            const shouldUpdateId =
                !event._idManuallyChanged && (!previousId || previousId === previousSlug || previousId === currentSlug);

            if (shouldUpdateId) {
                const nextId = generatedSlug || previousId;
                if (nextId !== previousId) {
                    event.id = nextId;
                    syncEventField(index, 'id', event.id);
                }
            }
            syncEventField(index, 'title', event.title, { skipElement: input });
        } else if (field === 'id') {
            const sanitized = slugify(value);
            event.id = sanitized;
            event._idManuallyChanged = Boolean(sanitized);
            syncEventField(index, 'id', event.id);
        } else if (field === 'heroOrder') {
            const numeric = toFiniteNumber(value);
            event.heroOrder = numeric;
            syncEventField(index, 'heroOrder', event.heroOrder);
        } else if (field === 'showInHero') {
            event.showInHero = Boolean(value);
            syncEventField(index, 'showInHero', event.showInHero);
        } else {
            event[field] = value;
            syncEventField(index, field, event[field], { skipElement: input });
        }

        markDirty();
        refreshEventSummary(index, input);
        renderHeroPreview();
        renderJsonPreview();
    }

    function findEventElement(index, referenceElement) {
        if (referenceElement && typeof referenceElement.closest === 'function') {
            const byReference = referenceElement.closest('.admin-event');
            if (byReference) {
                return byReference;
            }
        }

        if (!elements.eventsContainer) {
            return null;
        }

        return elements.eventsContainer.querySelector(`.admin-event[data-event-index="${index}"]`);
    }

    function syncEventField(index, fieldName, value, options = {}) {
        const { skipElement } = options || {};
        const eventElement = findEventElement(index, skipElement);
        if (!eventElement) {
            return;
        }

        const field = eventElement.querySelector(`[data-field-name="${fieldName}"]`);
        if (!field || field === skipElement) {
            return;
        }

        if (field.type === 'checkbox') {
            field.checked = Boolean(value);
            return;
        }

        field.value = value === null || value === undefined ? '' : value;
    }

    function refreshEventSummary(index, referenceElement) {
        const event = state.events[index];
        if (!event) {
            return;
        }

        const eventElement = findEventElement(index, referenceElement);
        if (!eventElement) {
            return;
        }

        eventElement.dataset.eventId = event.id || `event-${index}`;

        const summaryTitle = eventElement.querySelector('.admin-event__summary-title');
        if (summaryTitle) {
            summaryTitle.textContent = event.title || 'Без названия';
        }

        const summaryMeta = eventElement.querySelector('.admin-event__summary-meta');
        if (summaryMeta) {
            summaryMeta.innerHTML = formatSummaryMeta(event);
        }
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

        const token = ensureAuthToken();
        if (!token) {
            setStatus('Чтобы сохранить изменения, укажите ключ доступа администратора.', 'error');
            return;
        }

        setSaving(true);
        setStatus('Сохраняем изменения…');

        try {
            const response = await fetch(API_SAVE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...buildAuthHeaders(),
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
        const headers = buildAuthHeaders();
        if (!headers.Authorization) {
            throw new Error('Не указан ключ доступа администратора.');
        }
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(API_UPLOAD_URL, {
            method: 'POST',
            headers,
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

    function ensureAuthToken() {
        if (state.authToken) {
            return state.authToken;
        }

        const input = window.prompt('Введите ключ доступа администратора. Его можно получить у разработчика сайта.', '');
        if (input === null) {
            return '';
        }

        const normalized = input.trim();
        if (!normalized) {
            clearAuthToken();
            return '';
        }

        setAuthToken(normalized);
        setStatus('Ключ доступа сохранён в этом браузере.', 'success');
        return state.authToken;
    }

    function promptForAuthToken() {
        const current = state.authToken;
        const message = current
            ? 'Введите новый ключ доступа администратора. Чтобы удалить сохранённый ключ, оставьте поле пустым.'
            : 'Введите ключ доступа администратора. Его можно получить у разработчика сайта.';
        const input = window.prompt(message, current || '');
        if (input === null) {
            return;
        }

        const normalized = input.trim();
        if (!normalized) {
            clearAuthToken();
            setStatus('Сохранённый ключ доступа удалён. Укажите новый, чтобы продолжить сохранение.', 'info');
            return;
        }

        setAuthToken(normalized);
        setStatus('Ключ доступа обновлён.', 'success');
    }

    function clearAuthToken() {
        setAuthToken('');
    }

    function setAuthToken(token) {
        state.authToken = token;

        try {
            if (token) {
                window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, token);
            } else {
                window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
            }
        } catch (error) {
            console.warn('Не удалось сохранить ключ администратора в localStorage', error);
        }

        updateAuthButton();
    }

    function getStoredAuthToken() {
        try {
            return window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) || '';
        } catch (error) {
            console.warn('Не удалось получить ключ администратора из localStorage', error);
            return '';
        }
    }

    function updateAuthButton() {
        if (!elements.authButton) {
            return;
        }

        if (state.authToken) {
            elements.authButton.textContent = 'Сменить ключ доступа';
            elements.authButton.classList.remove('admin-btn--danger');
        } else {
            elements.authButton.textContent = 'Указать ключ доступа';
            elements.authButton.classList.add('admin-btn--danger');
        }
    }

    function buildAuthHeaders() {
        if (!state.authToken) {
            return {};
        }

        return { Authorization: `Bearer ${state.authToken}` };
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
