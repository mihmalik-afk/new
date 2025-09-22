
const ALLOWED_QUERY_PARAMS = new Set([
    'limit',
    'page',
    'city',
    'venue',
    'category',
    'date_from',
    'date_to',
    'project',
    'search',
    'sort',
]);

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function buildJsonResponse(statusCode, payload, extraHeaders = {}) {
    return {
        statusCode,
        headers: { ...DEFAULT_HEADERS, ...extraHeaders },
        body: payload != null ? JSON.stringify(payload) : '',
    };
}

async function fetchEvents(query = {}) {
    const endpoint = process.env.INTICKETS_EVENTS_URL;

    if (!endpoint) {
        return buildJsonResponse(500, {
            error: 'INTICKETS_EVENTS_URL is not configured. Set the environment variable before deploying.',
        });
    }

    let requestUrl;
    try {
        requestUrl = new URL(endpoint);
    } catch (error) {
        return buildJsonResponse(500, {
            error: 'Invalid INTICKETS_EVENTS_URL value.',
            details: error.message,
        });
    }

    Object.entries(query)
        .filter(([key, value]) => ALLOWED_QUERY_PARAMS.has(key) && value != null && value !== '')
        .forEach(([key, value]) => {
            requestUrl.searchParams.set(key, value);
        });

    const headers = {
        Accept: 'application/json',
    };

    const token = process.env.INTICKETS_TOKEN || process.env.INTICKETS_API_KEY;
    if (token) {
        headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(requestUrl.toString(), {
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            return buildJsonResponse(response.status, {
                error: 'Failed to fetch events from Intickets.',
                details: errorText,
            });
        }

        const data = await response.json();

        return buildJsonResponse(200, data, {
            'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
        });
    } catch (error) {
        const isTimeout = error.name === 'AbortError';
        const statusCode = isTimeout ? 504 : 500;

        return buildJsonResponse(statusCode, {
            error: 'Unable to fetch events from Intickets.',
            details: error.message,
        });
    }
}

async function handleRequest(method, query) {
    if (method === 'OPTIONS') {
        return buildJsonResponse(200, null);
    }

    if (method !== 'GET') {
        return buildJsonResponse(405, {
            error: 'Method Not Allowed',
        }, {
            Allow: 'GET,OPTIONS',
        });
    }

    return fetchEvents(query);
}

module.exports = async function vercelHandler(req, res) {
    const result = await handleRequest(req.method, req.query || {});

    Object.entries(result.headers || {}).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    res.status(result.statusCode);
    res.send(result.body);
};

module.exports.config = {
    api: {
        bodyParser: false,
    },
};

const netlifyHandler = async function (event) {
    const result = await handleRequest(event.httpMethod, event.queryStringParameters || {});
    return result;
};

module.exports.handler = netlifyHandler;
exports.handler = netlifyHandler;
