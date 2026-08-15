import { buildStudySynthesisRequest } from './studySynthesisRequest.js';
import { getPassageCommentaryFindings } from './commentaryComparison.js';

function excerpt(text, limit = 560) {
    const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;

    const sentenceEnd = clean.slice(0, limit).lastIndexOf('.');
    return sentenceEnd > 180
        ? clean.slice(0, sentenceEnd + 1)
        : `${clean.slice(0, limit).trim()}...`;
}

function normalizeReference(reference = '') {
    return String(reference)
        .toLowerCase()
        .replace(/[\u2013\u2014-]/g, '-')
        .replace(/[^a-z0-9:-]+/g, ' ')
        .trim();
}

function getReferenceChapter(reference = '') {
    const normalized = normalizeReference(reference);
    const match = normalized.match(/^((?:\d+\s+)?[a-z]+(?:\s+(?:of\s+)?[a-z]+)*)\s+(\d{1,3})/u);

    return match ? `${match[1]} ${match[2]}` : '';
}

export function getPassageQuestionSourceFindings(sourceFindings = [], targetReference = '') {
    const targetChapter = getReferenceChapter(targetReference);
    if (!targetChapter) return sourceFindings;

    return sourceFindings.filter(finding => {
        const references = finding.anchorReferences?.length
            ? finding.anchorReferences
            : finding.references ?? [];
        if (!references.length) return true;

        return references.some(reference => getReferenceChapter(reference) === targetChapter);
    });
}

function toSelectedPassageFinding(target, passageText, translationName) {
    const text = excerpt(passageText || target.quote);

    return {
        id: `selected-passage-${target.id}`,
        title: `Selected passage: ${target.reference}`,
        text: `${target.reference}: ${text}`,
        references: [target.reference],
        confidence: 'medium',
        reviewStatus: 'visible-passage',
        allowedUse: 'Use the selected passage as primary evidence before widening to supporting sources.',
        source: {
            id: 'passage-context',
            label: translationName || 'Selected Bible',
            href: '',
            license: '',
        },
    };
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

export async function buildPassageQuestionGrounding({
    target,
    question,
    route,
    sourceFindings = [],
    relatedPassages = [],
    passageText,
    translationName,
    signal,
}) {
    const selectedPassage = toSelectedPassageFinding(target, passageText, translationName);
    const scopedSourceFindings = getPassageQuestionSourceFindings(sourceFindings, target.reference);
    const relatedScripture = relatedPassages
        .filter(passage => passage.status === 'valid' && passage.verses?.length)
        .slice(0, 3)
        .map(passage => toRelatedScriptureFinding(passage, translationName));
    const commentary = await getPassageCommentaryFindings({ target, query: question, signal });
    const findings = [
        selectedPassage,
        ...scopedSourceFindings.slice(0, 4),
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
