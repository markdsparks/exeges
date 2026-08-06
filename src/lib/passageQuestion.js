import { PUBLIC_COMMENTARY_SOURCES, loadPublicCommentary } from './publicCommentary.js';
import { buildStudySynthesisRequest } from './studySynthesisRequest.js';

const QUESTION_STOPWORDS = new Set([
    'about', 'after', 'again', 'also', 'and', 'are', 'been', 'being', 'but', 'can', 'could',
    'does', 'for', 'from', 'have', 'how', 'into', 'is', 'its', 'more', 'not', 'of', 'or',
    'should', 'that', 'the', 'their', 'there', 'this', 'to', 'what', 'when', 'which', 'why',
    'with', 'would', 'you', 'your',
]);

function normalize(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[\u2019']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function getTerms(value) {
    return [...new Set(normalize(value)
        .split(/\s+/)
        .filter(term => term.length > 2 && !QUESTION_STOPWORDS.has(term)))];
}

function excerpt(text, limit = 560) {
    const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;

    const sentenceEnd = clean.slice(0, limit).lastIndexOf('.');
    return sentenceEnd > 180
        ? clean.slice(0, sentenceEnd + 1)
        : `${clean.slice(0, limit).trim()}...`;
}

function toRelatedScriptureFinding(reference, translationName) {
    const text = reference.verses
        .map(verse => `${verse.verse} ${verse.text}`)
        .join(' ');

    return {
        id: `related-scripture-${reference.reference.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: `Related Scripture: ${reference.reference}`,
        text: excerpt(text),
        references: [reference.reference],
        confidence: 'medium',
        reviewStatus: 'reviewed',
        allowedUse: 'Use this related passage as direct Scripture evidence; explain the local passage before widening to it.',
        source: {
            id: `bible-${String(translationName ?? 'selected').toLowerCase()}`,
            label: translationName || 'Selected Bible',
            href: '',
            license: '',
        },
    };
}

function selectCommentaryEntry(entries, { targetVerse, terms }) {
    return entries
        .map((entry, index) => {
            const text = normalize(entry.text);
            const termScore = terms.reduce((score, term) => (
                score + (text.includes(term) ? 1 : 0)
            ), 0);
            const targetScore = entry.verse === targetVerse ? 12 : 0;
            const chapterScore = entry.verse === null ? 1 : 0;

            return { entry, index, score: targetScore + termScore + chapterScore };
        })
        .sort((first, second) => second.score - first.score || first.index - second.index)[0]?.entry ?? null;
}

function toCommentaryFinding(source, entry, bookName, chapterNumber) {
    const reference = entry.verse
        ? `${bookName} ${chapterNumber}:${entry.verse}`
        : `${bookName} ${chapterNumber}`;

    return {
        id: `commentary-${source.id}-${bookName}-${chapterNumber}-${entry.verse ?? 'chapter'}`
            .replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
        title: `${source.label} on ${reference}`,
        text: excerpt(entry.text),
        references: [reference],
        confidence: 'low',
        reviewStatus: 'source-text',
        allowedUse: 'Treat this historical commentary as a named perspective, not as final authority. Keep the passage primary and name the source when drawing on it.',
        source: {
            id: `commentary-${source.id}`,
            label: source.label,
            href: source.href,
            license: source.license,
        },
    };
}

async function getCommentaryFindings({ target, question, signal }) {
    const terms = getTerms(`${question} ${target.quote}`);
    const results = await Promise.allSettled(PUBLIC_COMMENTARY_SOURCES.map(async source => {
        const result = await loadPublicCommentary({
            sourceId: source.id,
            bookName: target.bookName,
            chapterNumber: target.chapter,
            signal,
        });
        if (result.status !== 'ready') return null;

        const entry = selectCommentaryEntry(result.entries, {
            targetVerse: target.verse,
            terms,
        });
        return entry ? toCommentaryFinding(source, entry, target.bookName, target.chapter) : null;
    }));

    return results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(Boolean);
}

export async function buildPassageQuestionGrounding({
    target,
    question,
    route,
    sourceFindings = [],
    relatedPassages = [],
    translationName,
    signal,
}) {
    const relatedScripture = relatedPassages
        .filter(passage => passage.status === 'valid' && passage.verses?.length)
        .slice(0, 3)
        .map(passage => toRelatedScriptureFinding(passage, translationName));
    const commentary = await getCommentaryFindings({ target, question, signal });
    const findings = [
        ...sourceFindings.slice(0, 4),
        ...relatedScripture,
        ...commentary,
    ];
    const observation = {
        id: `${target.id}-question`,
        type: 'question',
        verse: target.verse,
        quote: target.quote,
        reference: target.reference,
        selections: target.selections ?? [],
        note: question.trim(),
    };
    const synthesisRequest = buildStudySynthesisRequest({
        observation,
        route,
        sourceFindings: findings,
    });

    return {
        sourceFindings: findings,
        relatedScriptureCount: relatedScripture.length,
        commentaryCount: commentary.length,
        synthesisRequest: {
            ...synthesisRequest,
            mode: 'grounded-passage-question',
        },
    };
}
