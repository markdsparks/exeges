const ESV_ENDPOINT = 'https://api.esv.org/v3/passage/text/';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, init = {}) {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
            ...init.headers,
        },
    });
}

function parsePassage(passage) {
    const cleanPassage = passage.replace(/\r/g, '').trim();
    const copyrightIndex = cleanPassage.search(/\n\s*Scripture quotations/i);
    const textBlock = copyrightIndex === -1
        ? cleanPassage
        : cleanPassage.slice(0, copyrightIndex).trim();
    const copyright = copyrightIndex === -1
        ? ''
        : cleanPassage.slice(copyrightIndex).trim();

    const matches = [...textBlock.matchAll(/\[(\d+)\]\s*([\s\S]*?)(?=\s*\[\d+\]\s*|$)/g)];

    return {
        verses: matches.map(match => ({
            verse: Number.parseInt(match[1], 10),
            text: match[2].replace(/\s+/g, ' ').trim(),
        })).filter(verse => Number.isFinite(verse.verse) && verse.text),
        copyright,
    };
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (request.method !== 'GET') {
            return json({ error: 'Method not allowed' }, { status: 405 });
        }

        if (!env.ESV_API_TOKEN) {
            return json({ error: 'ESV_API_TOKEN is not configured' }, { status: 500 });
        }

        const url = new URL(request.url);
        const reference = url.searchParams.get('reference')?.trim();

        if (!reference) {
            return json({ error: 'Missing reference parameter' }, { status: 400 });
        }

        const esvUrl = new URL(ESV_ENDPOINT);
        esvUrl.searchParams.set('q', reference);
        esvUrl.searchParams.set('include-passage-references', 'false');
        esvUrl.searchParams.set('include-footnotes', 'false');
        esvUrl.searchParams.set('include-headings', 'false');
        esvUrl.searchParams.set('include-short-copyright', 'false');
        esvUrl.searchParams.set('include-copyright', 'true');
        esvUrl.searchParams.set('line-length', '0');

        const response = await fetch(esvUrl, {
            headers: {
                Authorization: `Token ${env.ESV_API_TOKEN}`,
            },
        });

        if (!response.ok) {
            return json({ error: `ESV API request failed with ${response.status}` }, { status: response.status });
        }

        const payload = await response.json();
        const passage = payload.passages?.[0] ?? '';
        const parsed = parsePassage(passage);

        return json({
            translation: 'esv',
            reference: payload.canonical ?? reference,
            verses: parsed.verses,
            copyright: parsed.copyright,
        });
    },
};
