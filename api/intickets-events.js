
const DEFAULT_CACHE_SECONDS = 60;

function buildResponse(res, statusCode, payload) {
    if (typeof res.status === 'function') {
        res.status(statusCode);
    } else {
        res.statusCode = statusCode;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const cacheControl = statusCode >= 400 ? 'no-store' : `public, max-age=${DEFAULT_CACHE_SECONDS}`;
    res.setHeader('Cache-Control', cacheControl);
    res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
    const apiUrl = process.env.INTICKETS_EVENTS_URL;
    const token = process.env.INTICKETS_TOKEN;

    if (!apiUrl) {
        return buildResponse(res, 500, {
            error: 'Configuration error',
            detail: 'INTICKETS_EVENTS_URL environment variable is not set.'
        });
    }

    try {
        const headers = { Accept: 'application/json' };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const upstreamResponse = await fetch(apiUrl, { headers });

        if (!upstreamResponse.ok) {
            const detail = await upstreamResponse.text();
            return buildResponse(res, upstreamResponse.status, {
                error: `Upstream error ${upstreamResponse.status}`,
                detail
            });
        }

        const payload = await upstreamResponse.json();
        const events = normaliseEvents(payload);

        return buildResponse(res, 200, { events });
    } catch (error) {
        return buildResponse(res, 500, {
            error: 'Proxy failed',
            detail: error instanceof Error ? error.message : String(error)
        });
    }
}

function normaliseEvents(payload) {
    const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.events)
        ? payload.events
        : Array.isArray(payload?.data)
        ? payload.data
        : [];

    return items.map((event) => ({
        id: event?.id ?? event?.event_id ?? event?.slug ?? null,
        title: event?.title ?? event?.name ?? 'Без названия',
        date: event?.date ?? event?.datetime_start ?? event?.starts_at ?? event?.start_date ?? null,
        venue: event?.venue?.name ?? event?.venue ?? event?.place ?? event?.location ?? '',
        image:
            event?.image?.url ??
            event?.image ??
            event?.poster ??
            event?.cover ??
            event?.photos?.[0]?.url ??
            null,
        url: event?.url ?? event?.seance_url ?? event?.link ?? null
    }));
}
