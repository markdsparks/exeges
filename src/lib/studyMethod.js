export const STUDY_STAGES = [
    {
        id: 'observe',
        label: 'Observe',
        prompt: 'Read slowly. Tap what stands out, then capture what you notice or wonder.',
    },
    {
        id: 'interpret',
        label: 'Interpret',
        prompt: 'Explain meaning from context before moving outward.',
    },
    {
        id: 'apply',
        label: 'Apply',
        prompt: 'Respond faithfully after observation and interpretation.',
    },
];

export const OBSERVATION_TYPES = [
    { id: 'repeated-word', label: 'Repeated word' },
    { id: 'contrast', label: 'Contrast' },
    { id: 'command', label: 'Command' },
    { id: 'question', label: 'I wonder' },
    { id: 'structure', label: 'Structure' },
    { id: 'key-term', label: 'Important' },
    { id: 'person', label: 'Person' },
    { id: 'place', label: 'Place' },
    { id: 'note', label: 'I notice' },
];

export const OBSERVATION_PROMPTS = {
    command: 'Who is commanded, and what action is required?',
    question: 'What question does this raise?',
    structure: 'How does this shape the structure of the passage?',
    'key-term': 'Why does this seem important here?',
    person: 'What role does this person play here?',
    place: 'What role does this place play here?',
    note: 'What do you notice?',
};

const WORD_PATTERN = /\s+|[^\s]+/g;

const PENTATEUCH = new Set(['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy']);
const HISTORY = new Set([
    'joshua',
    'judges',
    'ruth',
    '1-samuel',
    '2-samuel',
    '1-kings',
    '2-kings',
    '1-chronicles',
    '2-chronicles',
    'ezra',
    'nehemiah',
    'esther',
    'acts',
]);
const WISDOM = new Set(['job', 'psalms', 'proverbs', 'ecclesiastes', 'solomon-s-song']);
const PROPHETS = new Set([
    'isaiah',
    'jeremiah',
    'lamentations',
    'ezekiel',
    'daniel',
    'hosea',
    'joel',
    'amos',
    'obadiah',
    'jonah',
    'micah',
    'nahum',
    'habakkuk',
    'zephaniah',
    'haggai',
    'zechariah',
    'malachi',
]);
const GOSPELS = new Set(['matthew', 'mark', 'luke', 'john']);
const LETTERS = new Set([
    'romans',
    '1-corinthians',
    '2-corinthians',
    'galatians',
    'ephesians',
    'philippians',
    'colossians',
    '1-thessalonians',
    '2-thessalonians',
    '1-timothy',
    '2-timothy',
    'titus',
    'philemon',
    'hebrews',
    'james',
    '1-peter',
    '2-peter',
    '1-john',
    '2-john',
    '3-john',
    'jude',
]);

export function getObservationTypeLabel(type) {
    return OBSERVATION_TYPES.find(item => item.id === type)?.label ?? 'Observation';
}

export function cleanStudyToken(token) {
    return (token ?? '').replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').trim();
}

export function normalizeStudyToken(token) {
    return cleanStudyToken(token).replace(/[’']/g, '').toLowerCase();
}

export function tokenizeStudyText(text) {
    let wordIndex = 0;

    return (text.match(WORD_PATTERN) ?? []).map((token) => {
        if (/^\s+$/.test(token)) {
            return { text: token, whitespace: true };
        }

        const clean = cleanStudyToken(token);
        const normalized = normalizeStudyToken(token);
        const currentIndex = wordIndex;
        wordIndex += 1;

        return {
            text: token,
            clean,
            normalized,
            tokenIndex: currentIndex,
            whitespace: false,
        };
    });
}

export function makeWordSelection({ bookId, bookName, chapter, verse, token }) {
    return {
        id: `${bookId}-${chapter}-${verse}-${token.tokenIndex}`,
        bookId,
        bookName,
        chapter,
        verse,
        tokenIndex: token.tokenIndex,
        scope: 'word',
        text: token.clean || token.text,
        normalized: token.normalized,
    };
}

export function makePhraseSelection({ bookId, bookName, chapter, verse, quote }) {
    const cleanQuote = (quote ?? '').replace(/\s+/g, ' ').trim();
    if (!cleanQuote) return null;

    return {
        id: `${bookId}-${chapter}-${verse}-phrase-${normalizeStudyToken(cleanQuote)}-${cleanQuote.length}`,
        bookId,
        bookName,
        chapter,
        verse,
        tokenIndex: Number.MAX_SAFE_INTEGER,
        scope: 'phrase',
        text: cleanQuote,
        normalized: normalizeStudyToken(cleanQuote),
    };
}

export function sortSelectionItems(items = []) {
    return [...items].sort((a, b) => (
        (a.chapter - b.chapter)
        || (a.verse - b.verse)
        || ((a.tokenIndex ?? Number.MAX_SAFE_INTEGER) - (b.tokenIndex ?? Number.MAX_SAFE_INTEGER))
        || a.text.localeCompare(b.text)
    ));
}

export function getSelectionQuote(items = []) {
    const sorted = sortSelectionItems(items);
    return sorted.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim();
}

export function getSelectionReference(items = []) {
    const sorted = sortSelectionItems(items);
    if (!sorted.length) return '';

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first.verse === last.verse) return `${first.bookName} ${first.chapter}:${first.verse}`;
    return `${first.bookName} ${first.chapter}:${first.verse}-${last.verse}`;
}

export function getUniqueSelectionWords(items = []) {
    const words = new Map();

    for (const item of items) {
        if (item.scope !== 'word' || !item.normalized) continue;
        if (!words.has(item.normalized)) {
            words.set(item.normalized, item);
        }
    }

    return [...words.values()];
}

export function getBookGenre(bookId) {
    if (PENTATEUCH.has(bookId)) return 'Law / Torah';
    if (HISTORY.has(bookId)) return 'Narrative history';
    if (WISDOM.has(bookId)) return 'Poetry / wisdom';
    if (PROPHETS.has(bookId)) return 'Prophetic literature';
    if (GOSPELS.has(bookId)) return 'Gospel narrative';
    if (LETTERS.has(bookId)) return 'New Testament letter';
    if (bookId === 'revelation') return 'Apocalyptic prophecy';
    return 'Biblical literature';
}
