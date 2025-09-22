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
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_ADMIN_TOKEN = 'ammapro';
const ENV_ADMIN_TOKEN = typeof process.env.ADMIN_TOKEN === 'string' ? process.env.ADMIN_TOKEN.trim() : '';
const ADMIN_TOKEN = ENV_ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN;

if (!ENV_ADMIN_TOKEN) {
    console.warn('Используется ключ доступа администратора по умолчанию. Задайте переменную окружения ADMIN_TOKEN, чтобы его изменить.');
}


fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
    if (!ADMIN_TOKEN && req.path.startsWith('/api/admin/')) {
        res.status(503).json({ error: 'Административные API выключены: не настроен ключ доступа.' });
        return;
    }

    next();
});

function requireAdminToken(req, res, next) {
    const authHeader = req.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1] === ADMIN_TOKEN) {
        next();
        return;
    }

    res.set('WWW-Authenticate', 'Bearer');
    res.status(401).json({ error: 'Неавторизованный доступ. Укажите действительный ключ администратора.' });
}

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

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', index: false }));
app.use(express.static(ROOT_DIR));

app.post('/api/admin/events', requireAdminToken, async (req, res) => {
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

app.post('/api/admin/upload', requireAdminToken, upload.single('image'), (req, res) => {
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
