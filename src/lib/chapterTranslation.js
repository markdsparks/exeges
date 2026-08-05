import { getEsvProxyUrl } from './translations';

const remoteChapterCache = new Map();

function normalizeProxyUrl(url) {
    return url.replace(/\/$/, '');
}

export function createLocalChapter(book, chapterNum) {
    const chapter = book?.chapters?.find(item => item.chapter === chapterNum);
    if (!book || !chapter) return null;

    return {
        ...book,
        chapters: [chapter],
        translationId: 'kjv',
        translationName: 'KJV',
        source: 'local',
    };
}

export async function loadTranslationChapter({ translation, book, chapterNum, signal }) {
    if (!book) {
        return {
            status: 'missing',
            chapter: null,
            message: 'This passage is not available in the local Bible index.',
        };
    }

    if (translation?.source !== 'remote') {
        const chapter = createLocalChapter(book, chapterNum);
        return {
            status: chapter ? 'ready' : 'missing',
            chapter,
            message: chapter ? '' : `${book.name} ${chapterNum} is not available locally.`,
        };
    }

    if (translation.id !== 'esv') {
        return {
            status: 'unsupported',
            chapter: null,
            message: `${translation.name} is not available for related passages yet.`,
        };
    }

    const cacheKey = `${translation.id}:${book.id}:${chapterNum}`;
    if (remoteChapterCache.has(cacheKey)) return remoteChapterCache.get(cacheKey);

    const proxyUrl = getEsvProxyUrl();
    if (!proxyUrl) {
        return {
            status: 'setup-needed',
            chapter: null,
            message: 'ESV needs a private proxy before it can load in this public app.',
        };
    }

    const reference = `${book.name} ${chapterNum}`;
    const response = await fetch(
        `${normalizeProxyUrl(proxyUrl)}?reference=${encodeURIComponent(reference)}`,
        { signal },
    );

    if (!response.ok) {
        throw new Error(`ESV request failed with ${response.status}`);
    }

    const payload = await response.json();
    const verses = Array.isArray(payload.verses) ? payload.verses : [];

    if (!verses.length) {
        throw new Error('ESV response did not include verses.');
    }

    const result = {
        status: 'ready',
        chapter: {
            ...book,
            chapters: [{
                chapter: chapterNum,
                verses: verses.map(verse => ({
                    verse: verse.verse,
                    text: verse.text,
                })),
            }],
            translationId: 'esv',
            translationName: 'ESV',
            copyright: payload.copyright ?? '',
            source: 'remote',
        },
        message: '',
    };
    remoteChapterCache.set(cacheKey, result);
    return result;
}
