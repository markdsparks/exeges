const API_ROOT = 'https://bible.helloao.org/api/c';

export const PUBLIC_COMMENTARY_SOURCES = [
    {
        id: 'matthew-henry',
        label: 'Matthew Henry',
        title: 'Matthew Henry Bible Commentary',
        coverage: 'Most of the Bible',
        license: 'Public domain',
        href: 'https://ccel.org/h/henry/mhc2/MHC00000.HTM',
    },
    {
        id: 'john-calvin',
        label: 'John Calvin',
        title: "John Calvin's Commentaries",
        coverage: 'Selected books',
        license: 'Public domain',
        href: 'https://ccel.org/c/calvin/comment2/home.html',
    },
    {
        id: 'jamieson-fausset-brown',
        label: 'Jamieson-Fausset-Brown',
        title: 'Commentary Critical and Explanatory on the Whole Bible',
        coverage: 'Whole Bible',
        license: 'Public domain',
        href: 'https://www.ccel.org/ccel/jamieson/jfb/jfb.ix.html',
    },
    {
        id: 'keil-delitzsch',
        label: 'Keil & Delitzsch',
        title: 'Old Testament Commentary',
        coverage: 'Old Testament',
        license: 'Public domain',
        href: 'https://worthy.bible/commentaries/keil-delitzsch-commentary',
    },
];

const booksBySource = new Map();
const chapterByKey = new Map();

function normalize(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

function matchesBook(candidate, bookName) {
    const expected = normalize(bookName);
    const available = [candidate?.commonName, candidate?.name, candidate?.title]
        .map(normalize)
        .filter(Boolean);

    if (available.includes(expected)) return true;
    return (expected === 'psalm' && available.includes('psalms'))
        || (expected === 'songofsolomon' && available.includes('songofsongs'));
}

function getText(value) {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(getText).join(' ');
    if (value && typeof value === 'object') return Object.values(value).map(getText).join(' ');
    return '';
}

function cleanText(value) {
    return getText(value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isCalvinPassageHeading(value) {
    return /^(?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*\s+\d+:\d+(?:-\d+)?$/.test(value);
}

function isCalvinPassageLine(value) {
    return /^\d+\.\s/.test(value);
}

export function cleanPublicCommentaryText(value, sourceId) {
    if (sourceId !== 'john-calvin') return cleanText(value);

    const paragraphs = getText(value)
        .replace(/<[^>]*>/g, ' ')
        .split(/\n\s*\n/)
        .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

    if (!isCalvinPassageHeading(paragraphs[0] ?? '')) return paragraphs.join(' ');

    const firstCommentaryIndex = paragraphs.findIndex((paragraph, index) => (
        index > 0 && !isCalvinPassageLine(paragraph)
    ));

    return firstCommentaryIndex === -1
        ? ''
        : paragraphs.slice(firstCommentaryIndex).join(' ');
}

async function getBooks(sourceId, signal) {
    if (booksBySource.has(sourceId)) return booksBySource.get(sourceId);

    const response = await fetch(`${API_ROOT}/${sourceId}/books.json`, { signal });
    if (!response.ok) throw new Error(`Commentary index failed with ${response.status}`);

    const payload = await response.json();
    const books = Array.isArray(payload.books) ? payload.books : [];
    booksBySource.set(sourceId, books);
    return books;
}

export async function loadPublicCommentary({ sourceId, bookName, chapterNumber, signal }) {
    const source = PUBLIC_COMMENTARY_SOURCES.find(item => item.id === sourceId);
    if (!source) throw new Error('This commentary source is not available.');

    const cacheKey = `${sourceId}:${normalize(bookName)}:${chapterNumber}`;
    if (chapterByKey.has(cacheKey)) return chapterByKey.get(cacheKey);

    const books = await getBooks(sourceId, signal);
    const book = books.find(candidate => matchesBook(candidate, bookName));
    if (!book) {
        const unavailable = {
            status: 'unavailable',
            source,
            entries: [],
            message: `${source.label} does not include ${bookName}.`,
        };
        chapterByKey.set(cacheKey, unavailable);
        return unavailable;
    }

    const response = await fetch(`${API_ROOT}/${sourceId}/${book.id}/${chapterNumber}.json`, { signal });
    if (response.status === 404) {
        const unavailable = {
            status: 'unavailable',
            source,
            entries: [],
            message: `${source.label} does not include ${bookName} ${chapterNumber}.`,
        };
        chapterByKey.set(cacheKey, unavailable);
        return unavailable;
    }
    if (!response.ok) throw new Error(`Commentary chapter failed with ${response.status}`);

    const payload = await response.json();
    const entries = (payload.chapter?.content ?? [])
        .map(item => ({
            verse: Number.isFinite(item.number) ? item.number : null,
            text: cleanPublicCommentaryText(item.content, sourceId),
        }))
        .filter(item => item.text);

    const result = {
        status: entries.length ? 'ready' : 'unavailable',
        source,
        entries,
        message: entries.length ? '' : `${source.label} has no commentary text for this chapter.`,
    };
    chapterByKey.set(cacheKey, result);
    return result;
}
