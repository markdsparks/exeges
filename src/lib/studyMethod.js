export const STUDY_STAGES = [
    {
        id: 'observe',
        label: 'Observe',
        prompt: 'Mark what is actually in the passage.',
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
    { id: 'question', label: 'Question' },
    { id: 'structure', label: 'Structure' },
    { id: 'key-term', label: 'Key term' },
    { id: 'person', label: 'Person' },
    { id: 'place', label: 'Place' },
    { id: 'note', label: 'Note' },
];

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
