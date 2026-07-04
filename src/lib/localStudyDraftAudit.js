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
    'Song of Solomon',
    "Solomon's Song",
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
    `\\b(${BIBLE_BOOK_PATTERN})\\s+(\\d+):(\\d+)(?:[-\\u2013](\\d+))?\\b`,
    'gi',
);

const BIBLE_REFERENCE_PARSE_REGEX = new RegExp(
    `^(${BIBLE_BOOK_PATTERN})\\s+(\\d+):(\\d+)(?:[-\\u2013](\\d+))?$`,
    'i',
);

const BOOK_ALIASES = {
    psalm: 'Psalms',
    songofsolomon: 'Solomon\'s Song',
    songofsongs: 'Solomon\'s Song',
};

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

function normalizeBookKey(value) {
    return normalizeText(value).replace(/\s+/g, '');
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
    return unique([...cleanText(text).matchAll(BIBLE_REFERENCE_REGEX)].map(match => match[0]));
}

function parseBibleReference(reference) {
    const match = cleanText(reference).match(BIBLE_REFERENCE_PARSE_REGEX);
    if (!match) return null;

    const [, bookName, chapterRaw, startVerseRaw, endVerseRaw] = match;
    const rawBookKey = normalizeBookKey(bookName);
    const canonicalBookName = BOOK_ALIASES[rawBookKey] ?? bookName;
    const chapter = parseInt(chapterRaw, 10);
    const startVerse = parseInt(startVerseRaw, 10);
    const endVerse = endVerseRaw ? parseInt(endVerseRaw, 10) : startVerse;

    return {
        reference: cleanText(reference),
        bookName,
        bookKey: normalizeBookKey(canonicalBookName),
        chapter,
        startVerse,
        endVerse,
    };
}

function buildBookLookup(bibles) {
    const books = Array.isArray(bibles) ? bibles : [];
    const lookup = new Map();

    for (const book of books) {
        lookup.set(normalizeBookKey(book.name), book);
        lookup.set(normalizeBookKey(book.id), book);
    }

    for (const [alias, canonicalName] of Object.entries(BOOK_ALIASES)) {
        const book = lookup.get(normalizeBookKey(canonicalName));
        if (book) lookup.set(alias, book);
    }

    return lookup;
}

function resolveBibleReference(reference, bibles) {
    const parsed = parseBibleReference(reference);

    if (!parsed) {
        return {
            reference,
            status: 'unparsed',
            reason: 'Could not parse this Bible reference.',
        };
    }

    if (!Array.isArray(bibles) || !bibles.length) {
        return {
            ...parsed,
            status: 'unknown',
            reason: 'The local Bible corpus was not available for this audit.',
        };
    }

    const book = buildBookLookup(bibles).get(parsed.bookKey);
    if (!book) {
        return {
            ...parsed,
            status: 'missing',
            reason: 'Book was not found in the local Bible corpus.',
        };
    }

    const chapter = book.chapters?.find(item => item.chapter === parsed.chapter);
    if (!chapter) {
        return {
            ...parsed,
            status: 'missing',
            bookName: book.name,
            reason: `${book.name} ${parsed.chapter} was not found in the local Bible corpus.`,
        };
    }

    if (parsed.endVerse < parsed.startVerse) {
        return {
            ...parsed,
            status: 'missing',
            bookName: book.name,
            reason: 'Verse range is backwards.',
        };
    }

    const verses = chapter.verses?.filter(verse => (
        verse.verse >= parsed.startVerse && verse.verse <= parsed.endVerse
    )) ?? [];
    const expectedVerseCount = parsed.endVerse - parsed.startVerse + 1;

    if (verses.length !== expectedVerseCount) {
        return {
            ...parsed,
            status: 'missing',
            bookName: book.name,
            reason: `${book.name} ${parsed.chapter}:${parsed.startVerse}-${parsed.endVerse} was not fully found in the local Bible corpus.`,
        };
    }

    return {
        ...parsed,
        status: 'valid',
        bookName: book.name,
        verses,
    };
}

function referenceContains(candidate, target) {
    const candidateRef = parseBibleReference(candidate);
    const targetRef = parseBibleReference(target);

    return !!(
        candidateRef &&
        targetRef &&
        candidateRef.bookKey === targetRef.bookKey &&
        candidateRef.chapter === targetRef.chapter &&
        candidateRef.startVerse <= targetRef.startVerse &&
        candidateRef.endVerse >= targetRef.endVerse
    );
}

function getEvidenceReferences(cards) {
    return unique(cards.flatMap(card => getReferences([
        card.scope,
        card.claim,
    ].join(' '))));
}

function isReferenceInEvidence(reference, evidenceReferences, evidenceText) {
    const normalizedEvidence = normalizeText(evidenceText);

    return normalizedEvidence.includes(normalizeText(reference)) ||
        evidenceReferences.some(evidenceReference => referenceContains(evidenceReference, reference));
}

function getReferenceChecks(text, { evidenceReferences, evidenceText, bibles }) {
    return getReferences(text).map(reference => {
        const validation = resolveBibleReference(reference, bibles);
        const inEvidence = isReferenceInEvidence(reference, evidenceReferences, evidenceText);

        if (validation.status === 'valid' && inEvidence) {
            return {
                reference,
                status: 'grounded',
                detail: `${reference}: valid and included in the retrieved evidence.`,
            };
        }

        if (validation.status === 'valid') {
            return {
                reference,
                status: 'valid-unretrieved',
                detail: `${reference}: valid Bible reference, but not in the retrieved evidence.`,
            };
        }

        if (validation.status === 'unknown') {
            return {
                reference,
                status: 'unknown',
                detail: `${reference}: could not be checked against the local Bible corpus.`,
            };
        }

        return {
            reference,
            status: 'missing',
            detail: `${reference}: not found in the local Bible corpus.`,
            reason: validation.reason,
        };
    });
}

function getDetailsToVerify(text, evidenceText, referenceChecks) {
    const normalizedEvidence = normalizeText(evidenceText);
    const referenceDetails = referenceChecks
        .filter(check => check.status !== 'grounded')
        .map(check => check.detail);
    const properNouns = cleanText(text).match(/\b[A-Z][a-z]+(?:-[A-Z]?[a-z]+)?(?:'s)?\b/g) ?? [];

    return unique([
        ...referenceDetails,
        ...properNouns.filter(item => {
            const normalized = normalizeText(item);
            return normalized.length > 3
                && !STOPWORDS.has(normalized)
                && !normalizedEvidence.includes(normalized)
                && !['context', 'meaning', 'guardrail', 'confidence', 'next', 'question'].includes(normalized);
        }),
    ]).slice(0, 6);
}

function getReviewReason(referenceChecks) {
    if (referenceChecks.some(check => check.status === 'missing')) {
        return 'Contains a Bible reference that was not found in the local Bible corpus.';
    }

    if (referenceChecks.some(check => check.status === 'valid-unretrieved')) {
        return 'Contains a valid Bible reference that was not part of the retrieved evidence packet.';
    }

    if (referenceChecks.some(check => check.status === 'unknown')) {
        return 'Contains a Bible reference that could not be checked locally.';
    }

    return 'Contains details not found in the retrieved evidence cards.';
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

function auditSection(key, text, cards, draftCitations, evidenceContext) {
    const sectionText = cleanText(text);
    const referenceChecks = getReferenceChecks(sectionText, evidenceContext);
    const detailsToVerify = getDetailsToVerify(
        sectionText,
        evidenceContext.evidenceText,
        referenceChecks,
    );

    if (!sectionText) {
        return {
            key,
            label: SECTION_LABELS[key],
            status: 'empty',
            reason: 'No draft text for this section.',
            matchedCards: [],
            detailsToVerify,
            referenceChecks,
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
            reason: getReviewReason(referenceChecks),
            matchedCards,
            detailsToVerify,
            referenceChecks,
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
            referenceChecks,
        };
    }

    return {
        key,
        label: SECTION_LABELS[key],
        status: 'thin',
        reason: 'No close evidence-card match found.',
        matchedCards: [],
        detailsToVerify,
        referenceChecks,
    };
}

function getAuditSummary(sections, reviewCount, uncitedCount) {
    const referenceChecks = sections.flatMap(section => section.referenceChecks ?? []);

    if (referenceChecks.some(check => check.status === 'missing')) {
        return 'Some Bible references could not be found in the local Bible.';
    }

    if (referenceChecks.some(check => check.status === 'valid-unretrieved')) {
        return 'Some Bible references are valid, but were not part of the grounding packet.';
    }

    if (reviewCount) {
        return 'Some claims need checking against the evidence cards.';
    }

    if (uncitedCount) {
        return 'Draft is related to the evidence, but citations are thin.';
    }

    return 'Draft appears grounded in the retrieved evidence cards.';
}

export function auditLocalStudyDraft(draft, synthesisRequest, options = {}) {
    if (!draft) return null;

    const cards = getEvidenceCards(synthesisRequest);
    const evidenceText = getEvidenceText(cards);
    const evidenceReferences = getEvidenceReferences(cards);
    const draftCitations = draft.citations ?? [];
    const evidenceContext = {
        evidenceText,
        evidenceReferences,
        bibles: options.bibles ?? synthesisRequest?.bibles ?? [],
    };
    const sections = Object.keys(SECTION_LABELS).map(key => (
        auditSection(key, draft[key], cards, draftCitations, evidenceContext)
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
        summary: getAuditSummary(sections, reviewCount, uncitedCount),
        sections,
    };
}
