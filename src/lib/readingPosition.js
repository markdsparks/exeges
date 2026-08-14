export const READING_POSITION_STORAGE_KEY = 'exes-position';

function positiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
}

export function normalizeReadingPosition(value) {
    if (!value || typeof value !== 'object') return null;

    const bookId = typeof value.bookId === 'string' ? value.bookId.trim() : '';
    const chapterNum = positiveInteger(value.chapterNum);
    const verseNum = positiveInteger(value.verseNum);

    if (!bookId || !chapterNum) return null;

    return {
        bookId,
        chapterNum,
        verseNum,
    };
}

export function parseReadingPosition(value) {
    if (typeof value !== 'string') return null;

    try {
        return normalizeReadingPosition(JSON.parse(value));
    } catch {
        return null;
    }
}

export function serializeReadingPosition(value) {
    const position = normalizeReadingPosition(value);
    return position ? JSON.stringify(position) : null;
}

export function sameReadingPosition(first, second) {
    const a = normalizeReadingPosition(first);
    const b = normalizeReadingPosition(second);

    return Boolean(
        a
        && b
        && a.bookId === b.bookId
        && a.chapterNum === b.chapterNum
        && a.verseNum === b.verseNum,
    );
}
