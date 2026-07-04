const SECTION_LABELS = {
    context: 'Context',
    meaning: 'Meaning',
    guardrail: 'Guardrail',
    nextQuestion: 'Next question',
};

const STOPWORDS = new Set([
    'about',
    'above',
    'after',
    'again',
    'also',
    'because',
    'before',
    'being',
    'both',
    'could',
    'from',
    'have',
    'into',
    'more',
    'only',
    'other',
    'over',
    'passage',
    'seen',
    'should',
    'such',
    'than',
    'that',
    'their',
    'there',
    'these',
    'this',
    'through',
    'under',
    'what',
    'when',
    'where',
    'which',
    'while',
    'with',
]);

const BIBLE_BOOK_PATTERN = [
    'Genesis',
    'Exodus',
    'Leviticus',
    'Numbers',
    'Deuteronomy',
    'Joshua',
    'Judges',
    'Ruth',
    '1 Samuel',
    '2 Samuel',
    '1 Kings',
    '2 Kings',
    '1 Chronicles',
    '2 Chronicles',
    'Ezra',
    'Nehemiah',
    'Esther',
    'Job',
    'Psalms?',
    'Proverbs',
    'Ecclesiastes',
    'Song of Songs',
    'Isaiah',
    'Jeremiah',
    'Lamentations',
    'Ezekiel',
    'Daniel',
    'Hosea',
    'Joel',
    'Amos',
    'Obadiah',
    'Jonah',
    'Micah',
    'Nahum',
    'Habakkuk',
    'Zephaniah',
    'Haggai',
    'Zechariah',
    'Malachi',
    'Matthew',
    'Mark',
    'Luke',
    'John',
    'Acts',
    'Romans',
    '1 Corinthians',
    '2 Corinthians',
    'Galatians',
    'Ephesians',
    'Philippians',
    'Colossians',
    '1 Thessalonians',
    '2 Thessalonians',
    '1 Timothy',
    '2 Timothy',
    'Titus',
    'Philemon',
    'Hebrews',
    'James',
    '1 Peter',
    '2 Peter',
    '1 John',
    '2 John',
    '3 John',
    'Jude',
    'Revelation',
].join('|');

const BIBLE_REFERENCE_REGEX = new RegExp(
    `\\b(?:${BIBLE_BOOK_PATTERN})\\s+\\d+:\\d+(?:[-\\u2013]\\d+)?\\b`,
    'gi',
);

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
    return cleanText(value)
        .toLowerCase()
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(value) {
    return normalizeText(value)
        .split(' ')
        .filter(token => token.length > 3 && !STOPWORDS.has(token));
}

function unique(items) {
    return [...new Set(items.filter(Boolean))];
}

function getEvidenceCards(synthesisRequest) {
    if (synthesisRequest?.evidenceCards?.length) {
        return synthesisRequest.evidenceCards;
    }

    return (synthesisRequest?.sources ?? []).map(source => ({
        id: source.id,
        title: source.title,
        sourceId: source.sourceId,
        sourceLabel: source.sourceLabel,
        scope: source.references?.join(', ') || 'source chunk',
        allowedUse: 'Use only as supporting context.',
        claim: source.text,
    }));
}

function getEvidenceText(cards) {
    return cards.map(card => [
        card.id,
        card.title,
        card.scope,
        card.claim,
    ].join(' ')).join(' ');
}

function getReferences(text) {
    return unique(cleanText(text).match(BIBLE_REFERENCE_REGEX) ?? []);
}

function getUnsupportedReferences(text, evidenceText) {
    const normalizedEvidence = normalizeText(evidenceText);

    return getReferences(text).filter(reference => (
        !normalizedEvidence.includes(normalizeText(reference))
    ));
}

function getDetailsToVerify(text, evidenceText) {
    const normalizedEvidence = normalizeText(evidenceText);
    const references = getUnsupportedReferences(text, evidenceText);
    const properNouns = cleanText(text).match(/\b[A-Z][a-z]+(?:-[A-Z]?[a-z]+)?(?:'s)?\b/g) ?? [];

    return unique([
        ...references,
        ...properNouns.filter(item => {
            const normalized = normalizeText(item);
            return normalized.length > 3
                && !STOPWORDS.has(normalized)
                && !normalizedEvidence.includes(normalized)
                && !['context', 'meaning', 'guardrail', 'confidence', 'next', 'question'].includes(normalized);
        }),
    ]).slice(0, 6);
}

function scoreCardMatch(sectionText, card) {
    const sectionTokens = new Set(tokenize(sectionText));
    if (!sectionTokens.size) return 0;

    const cardTokens = new Set(tokenize([
        card.title,
        card.scope,
        card.claim,
    ].join(' ')));
    let matches = 0;

    sectionTokens.forEach(token => {
        if (cardTokens.has(token)) matches += 1;
    });

    return matches / sectionTokens.size;
}

function auditSection(key, text, cards, draftCitations, allEvidenceText) {
    const sectionText = cleanText(text);
    const detailsToVerify = getDetailsToVerify(sectionText, allEvidenceText);

    if (!sectionText) {
        return {
            key,
            label: SECTION_LABELS[key],
            status: 'empty',
            reason: 'No draft text for this section.',
            matchedCards: [],
            detailsToVerify,
        };
    }

    const cardMatches = cards
        .map(card => ({
            id: card.id,
            title: card.title,
            score: scoreCardMatch(sectionText, card),
        }))
        .filter(match => match.score >= 0.16)
        .sort((first, second) => second.score - first.score)
        .slice(0, 2);
    const citedCards = cards.filter(card => draftCitations.includes(card.id));
    const matchedCards = unique([
        ...cardMatches.map(match => match.id),
        ...citedCards.map(card => card.id),
    ]).slice(0, 3);

    if (detailsToVerify.length) {
        return {
            key,
            label: SECTION_LABELS[key],
            status: 'review',
            reason: 'Contains details not found in the retrieved evidence cards.',
            matchedCards,
            detailsToVerify,
        };
    }

    if (matchedCards.length) {
        return {
            key,
            label: SECTION_LABELS[key],
            status: draftCitations.length ? 'supported' : 'uncited',
            reason: draftCitations.length
                ? 'Lines up with retrieved evidence and includes a valid citation.'
                : 'Seems related to retrieved evidence, but the model did not cite a card id.',
            matchedCards,
            detailsToVerify,
        };
    }

    return {
        key,
        label: SECTION_LABELS[key],
        status: 'thin',
        reason: 'No close evidence-card match found.',
        matchedCards: [],
        detailsToVerify,
    };
}

export function auditLocalStudyDraft(draft, synthesisRequest) {
    if (!draft) return null;

    const cards = getEvidenceCards(synthesisRequest);
    const evidenceText = getEvidenceText(cards);
    const draftCitations = draft.citations ?? [];
    const sections = Object.keys(SECTION_LABELS).map(key => (
        auditSection(key, draft[key], cards, draftCitations, evidenceText)
    ));
    const reviewCount = sections.filter(section => (
        ['review', 'thin'].includes(section.status)
    )).length;
    const uncitedCount = sections.filter(section => section.status === 'uncited').length;

    return {
        status: reviewCount
            ? 'review'
            : uncitedCount
                ? 'uncited'
                : 'supported',
        summary: reviewCount
            ? 'Some claims need checking against the evidence cards.'
            : uncitedCount
                ? 'Draft is related to the evidence, but citations are thin.'
                : 'Draft appears grounded in the retrieved evidence cards.',
        sections,
    };
}
