const ESV_TEXT_ENDPOINT = 'https://api.esv.org/v3/passage/text/';
const ESV_SEARCH_ENDPOINT = 'https://api.esv.org/v3/passage/search/';
const SEARCH_PAGE_SIZE = '60';

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
    const copyrightIndex = cleanPassage.search(/\s+(Scripture quotations|ESV® Bible|The Holy Bible, English Standard Version)/i);
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

function parseReference(reference) {
    const match = reference.match(/^(.+?)\s+(\d+):(\d+)/);
    if (!match) return null;

    return {
        bookName: match[1],
        chapter: Number.parseInt(match[2], 10),
        verse: Number.parseInt(match[3], 10),
    };
}

function getSearchQueries(query) {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const queries = [normalizedQuery];
    const words = normalizedQuery.split(' ');

    for (const [index, word] of words.entries()) {
        const match = word.match(/^([A-Za-z]{3,})s$/);
        if (!match || /(ss|us|is)$/i.test(word)) continue;

        const variantWords = [...words];
        variantWords[index] = `${match[1]}'s`;
        const variant = variantWords.join(' ');
        if (!queries.includes(variant)) queries.push(variant);
    }

    return queries;
}

async function searchEsv(query, env) {
    const esvSearchUrl = new URL(ESV_SEARCH_ENDPOINT);
    esvSearchUrl.searchParams.set('q', query);
    esvSearchUrl.searchParams.set('page-size', SEARCH_PAGE_SIZE);

    return fetchFromEsv(esvSearchUrl, env);
}

async function fetchFromEsv(url, env) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Token ${env.ESV_API_TOKEN}`,
        },
    });

    if (!response.ok) {
        return {
            ok: false,
            response: json({ error: `ESV API request failed with ${response.status}` }, { status: response.status }),
        };
    }

    return {
        ok: true,
        payload: await response.json(),
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
        const query = url.searchParams.get('q')?.trim();

        if (!reference && !query) {
            return json({ error: 'Missing reference parameter' }, { status: 400 });
        }

        if (query) {
            let result = null;
            let matchedQuery = query;
            const searchQueries = getSearchQueries(query);
            for (const [index, searchQuery] of searchQueries.entries()) {
                result = await searchEsv(searchQuery, env);
                if (!result.ok) return result.response;

                const results = Array.isArray(result.payload.results) ? result.payload.results : [];
                matchedQuery = searchQuery;
                if (results.length || index === searchQueries.length - 1) break;
            }

            const results = Array.isArray(result.payload.results) ? result.payload.results : [];

            return json({
                translation: 'esv',
                query,
                matchedQuery,
                totalResults: result.payload.total_results ?? results.length,
                page: result.payload.page ?? 1,
                totalPages: result.payload.total_pages ?? 1,
                results: results.map(result => {
                    const parsed = parseReference(result.reference);

                    return {
                        reference: result.reference,
                        bookName: parsed?.bookName ?? '',
                        chapter: parsed?.chapter ?? null,
                        verse: parsed?.verse ?? null,
                        text: result.content?.replace(/\s+/g, ' ').trim() ?? '',
                        snippet: result.content?.replace(/\s+/g, ' ').trim() ?? '',
                    };
                }).filter(result => result.bookName && result.chapter && result.verse && result.text),
            });
        }

        const esvUrl = new URL(ESV_TEXT_ENDPOINT);
        esvUrl.searchParams.set('q', reference);
        esvUrl.searchParams.set('include-passage-references', 'false');
        esvUrl.searchParams.set('include-footnotes', 'false');
        esvUrl.searchParams.set('include-headings', 'false');
        esvUrl.searchParams.set('include-short-copyright', 'false');
        esvUrl.searchParams.set('include-copyright', 'true');
        esvUrl.searchParams.set('line-length', '0');

        const result = await fetchFromEsv(esvUrl, env);
        if (!result.ok) return result.response;

        const payload = result.payload;
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
