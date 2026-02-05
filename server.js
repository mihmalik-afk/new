'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, 'baza_afisha.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const IMG_DIR = path.join(ROOT_DIR, 'img');
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_ADMIN_TOKEN = 'ammapro';
const ENV_ADMIN_TOKEN = typeof process.env.ADMIN_TOKEN === 'string' ? process.env.ADMIN_TOKEN.trim() : '';
const ADMIN_TOKEN = ENV_ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN;

if (!ENV_ADMIN_TOKEN) {
    console.warn('Используется ключ доступа администратора по умолчанию. Задайте переменную окружения ADMIN_TOKEN, чтобы его изменить.');
}


fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json({ limit: '2mb' }));


// Удалена авторизация для административных API
// Все административные маршруты теперь доступны без ключа

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const randomPart = Math.round(Math.random() * 1e9).toString(16);
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, `${timestamp}-${randomPart}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_UPLOAD_SIZE,
    },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
            return;
        }

        cb(null, true);
    },
});

// Multer instance for uploading directly into event img folders
const eventStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const eventId = String(req.params.eventId || req.body.eventId || '').trim();
            if (!eventId) {
                return cb(new Error('eventId required'));
            }
            if (eventId.includes('..') || path.isAbsolute(eventId)) {
                return cb(new Error('Invalid eventId'));
            }
            const dest = path.join(IMG_DIR, eventId);
            await fsp.mkdir(dest, { recursive: true });
            cb(null, dest);
        } catch (err) {
            cb(err);
        }
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const randomPart = Math.round(Math.random() * 1e9).toString(16);
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, `${timestamp}-${randomPart}${ext}`);
    }
});

const uploadToEvent = multer({
    storage: eventStorage,
    limits: { fileSize: MAX_UPLOAD_SIZE },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
            return;
        }
        cb(null, true);
    }
});

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', index: false }));
app.use(express.static(ROOT_DIR));
// Получить все мероприятия
app.get('/api/events', async (req, res) => {
    try {
        const raw = await fsp.readFile(DATA_FILE, 'utf8');
        const data = JSON.parse(raw);
        res.json(Array.isArray(data.events) ? data.events : []);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка чтения базы мероприятий.' });
    }
});

// Сохранить мероприятия
app.post('/api/events', async (req, res) => {
    if (!req.body || !Array.isArray(req.body.events)) {
        res.status(400).json({ error: 'Поле events обязательно и должно быть массивом.' });
        return;
    }
    try {
        const sanitized = ensureUniqueIds(req.body.events.map(sanitizeEvent));
        const payload = { events: sanitized };
        await fsp.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
        res.json(payload.events);
    } catch (error) {
        console.error('Не удалось сохранить baza_afisha.json:', error);
        res.status(500).json({ error: 'Не удалось сохранить файл baza_afisha.json. Попробуйте позже.' });
    }
});

app.post('/api/admin/events', async (req, res) => {
    if (!req.body || !Array.isArray(req.body.events)) {
        res.status(400).json({ error: 'Поле events обязательно и должно быть массивом.' });
        return;
    }

    try {
        const sanitized = ensureUniqueIds(req.body.events.map(sanitizeEvent));
        const payload = { events: sanitized };
        await fsp.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
        res.json(payload);
    } catch (error) {
        console.error('Не удалось сохранить baza_afisha.json:', error);
        res.status(500).json({ error: 'Не удалось сохранить файл baza_afisha.json. Попробуйте позже.' });
    }
});

app.post('/api/admin/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'Файл не получен.' });
        return;
    }

    res.status(201).json({
        url: `/uploads/${encodeURIComponent(req.file.filename)}`,
        filename: req.file.filename,
        size: req.file.size,
    });
});

// Save afisha (accepts an array or an object with `events`)
app.post('/save-afisha', async (req, res) => {
    try {
        const raw = req.body;
        let events = [];
        if (Array.isArray(raw)) {
            events = raw;
        } else if (raw && Array.isArray(raw.events)) {
            events = raw.events;
        } else {
            res.status(400).json({ error: 'Ожидается массив событий или объект { events: [...] }' });
            return;
        }

        const sanitized = ensureUniqueIds(events.map(sanitizeEvent));

        // create backup
        try {
            const backupName = DATA_FILE + '.' + Date.now() + '.bak';
            await fsp.copyFile(DATA_FILE, backupName);
        } catch (e) {
            // non-fatal
            console.warn('Не удалось создать резервную копию:', e && e.message);
        }

        const payload = { events: sanitized };
        await fsp.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
        res.json({ success: true, events: payload.events });
    } catch (error) {
        console.error('Не удалось сохранить baza_afisha.json:', error);
        res.status(500).json({ error: 'Не удалось сохранить файл baza_afisha.json. Попробуйте позже.' });
    }
});

// Delete uploaded image by filename (expects { filename: '...' } or { url: '/uploads/filename' })
app.post('/api/admin/delete-image', express.json(), async (req, res) => {
    try {
        const { filename, url } = req.body || {};
        let name = filename;
        if (!name && typeof url === 'string') {
            name = path.basename(url);
        }
        if (!name) {
            res.status(400).json({ error: 'Не указан filename или url.' });
            return;
        }

        // prevent directory traversal
        if (name.includes('..') || path.isAbsolute(name)) {
            res.status(400).json({ error: 'Недопустимое имя файла.' });
            return;
        }

        const full = path.join(UPLOADS_DIR, name);
        await fsp.unlink(full);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления файла:', err && err.message);
        res.status(500).json({ error: 'Не удалось удалить файл.' });
    }
});

// List images in img/<eventId> folder
app.get('/api/img-list/:eventId', async (req, res) => {
    try {
        const rawId = req.params.eventId;
        if (!rawId || typeof rawId !== 'string') {
            res.status(400).json({ error: 'Не указан eventId.' });
            return;
        }

        // prevent directory traversal / absolute paths
        if (rawId.includes('..') || path.isAbsolute(rawId)) {
            res.status(400).json({ error: 'Недопустимый eventId.' });
            return;
        }

        const folder = path.join(IMG_DIR, rawId);
        const dirents = await fsp.readdir(folder, { withFileTypes: true });

    const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
        const images = dirents
            .filter((d) => d.isFile())
            .map((d) => d.name)
            .filter((name) => allowedExt.has(path.extname(name).toLowerCase()))
            .map((name) => `/img/${encodeURIComponent(rawId)}/${encodeURIComponent(name)}`);

        // shuffle
        for (let i = images.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [images[i], images[j]] = [images[j], images[i]];
        }

        res.json({ images });
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            // folder doesn't exist -> return empty list
            res.json({ images: [] });
            return;
        }

        console.error('Ошибка при чтении папки изображений:', err && err.message);
        res.status(500).json({ error: 'Не удалось прочитать папку изображений.' });
    }
});

// Upload an image into img/<eventId>/
app.post('/api/admin/img/:eventId/upload', uploadToEvent.single('image'), (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Файл не получен.' });
            return;
        }
        const eventId = req.params.eventId;
        const url = `/img/${encodeURIComponent(eventId)}/${encodeURIComponent(req.file.filename)}`;
        res.status(201).json({ url, filename: req.file.filename, size: req.file.size });
    } catch (err) {
        console.error('Upload error:', err && err.message);
        res.status(500).json({ error: 'Не удалось загрузить файл.' });
    }
});

// Delete an image from img/<eventId>/ (expects { filename: '...' })
app.post('/api/admin/img/:eventId/delete', express.json(), async (req, res) => {
    try {
        const eventId = req.params.eventId;
        if (!eventId || eventId.includes('..') || path.isAbsolute(eventId)) {
            res.status(400).json({ error: 'Недопустимый eventId.' });
            return;
        }
        const { filename } = req.body || {};
        if (!filename) {
            res.status(400).json({ error: 'Не указан filename.' });
            return;
        }
        if (filename.includes('..') || path.isAbsolute(filename)) {
            res.status(400).json({ error: 'Недопустимое имя файла.' });
            return;
        }
        const full = path.join(IMG_DIR, eventId, filename);
        await fsp.unlink(full);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления файла img:', err && err.message);
        res.status(500).json({ error: 'Не удалось удалить файл.' });
    }
});

app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({ error: 'Файл слишком большой. Максимальный размер — 5 МБ.' });
            return;
        }

        res.status(400).json({ error: 'Не удалось обработать файл. Проверьте формат и попробуйте снова.' });
        return;
    }

    console.error('Внутренняя ошибка сервера:', error);
    res.status(500).json({ error: 'Неожиданная ошибка сервера.' });
});

app.listen(PORT, () => {
    console.log(`AmmA Production server is running at http://localhost:${PORT}`);
});

function sanitizeEvent(rawEvent, index) {
    const title = typeof rawEvent?.title === 'string' ? rawEvent.title.trim() : '';
    const id = slugify(rawEvent?.id) || slugify(title) || `event-${index + 1}`;
    const date = sanitizeDate(rawEvent?.date);
    const time = sanitizeTime(rawEvent?.time);
    const heroOrder = sanitizeHeroOrder(rawEvent?.heroOrder);

    return {
        id,
        title,
        date,
        time,
        venue: typeof rawEvent?.venue === 'string' ? rawEvent.venue.trim() : '',
        link: typeof rawEvent?.link === 'string' ? rawEvent.link.trim() : '',
        image: typeof rawEvent?.image === 'string' ? rawEvent.image.trim() : '',
        description: typeof rawEvent?.description === 'string' ? rawEvent.description.trim() : '',
        showInHero: Boolean(rawEvent?.showInHero ?? true),
        heroOrder,
        gallery: sanitizeGallery(rawEvent?.gallery),
    };
}

function sanitizeDate(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }

    if (typeof value === 'string') {
        const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
        if (match) {
            return match[1];
        }
    }

    return null;
}

function sanitizeTime(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const match = value.trim().match(/^(\d{2}):(\d{2})$/);
    if (!match) {
        return null;
    }

    return `${match[1]}:${match[2]}`;
}

function sanitizeHeroOrder(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function sanitizeGallery(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
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
                if (!src) {
                    return null;
                }

                const caption = typeof entry.caption === 'string' ? entry.caption.trim() : '';
                return caption ? { src, caption } : { src };
            }

            return null;
        })
        .filter(Boolean);
}

function ensureUniqueIds(events) {
    const used = new Set();

    return events.map((event, index) => {
        let base = slugify(event.id) || slugify(event.title) || `event-${index + 1}`;
        if (!base) {
            base = `event-${index + 1}`;
        }

        let candidate = base;
        let attempt = 2;
        while (used.has(candidate)) {
            candidate = `${base}-${attempt}`;
            attempt += 1;
        }

        used.add(candidate);

        return {
            ...event,
            id: candidate,
        };
    });
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-z0-9а-я]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
