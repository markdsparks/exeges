import { PUBLIC_COMMENTARY_SOURCES, loadPublicCommentary } from './publicCommentary.js';
import { buildStudySynthesisRequest } from './studySynthesisRequest.js';

const COMMENTARY_STOPWORDS = new Set([
    'about', 'after', 'again', 'against', 'also', 'among', 'and', 'another', 'are', 'because',
    'been', 'before', 'being', 'between', 'both', 'but', 'can', 'could', 'does', 'each', 'even',
    'first', 'for', 'from', 'had', 'has', 'have', 'him', 'his', 'into', 'its', 'may', 'more', 'most',
    'not', 'now', 'one', 'only', 'other', 'our', 'out', 'over', 'same', 'should', 'some', 'such',
    'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'unto', 'upon', 'very', 'was', 'were', 'what', 'when', 'where', 'which', 'while',
    'who', 'whom', 'whose', 'will', 'with', 'would', 'you', 'your',
]);

function normalize(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[\u2019']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function getTerms(value) {
    return normalize(value)
        .split(/\s+/)
        .filter(term => term.length > 2 && !COMMENTARY_STOPWORDS.has(term));
}

function excerpt(text, limit = 560) {
    const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;

    const sentenceEnd = clean.slice(0, limit).lastIndexOf('.');
    return sentenceEnd > 180
        ? clean.slice(0, sentenceEnd + 1)
        : `${clean.slice(0, limit).trim()}...`;
}

function getTargetReferencePattern(bookName, chapterNumber, targetVerse) {
    const bookParts = String(bookName ?? '').split(/\s+/).filter(Boolean);
    const leadingNumber = /^\d+$/.test(bookParts[0] ?? '') ? `${bookParts.shift()}\\s*` : '';
    const bookStem = bookParts[0]?.slice(0, 3).replace(/[^a-z]/gi, '') ?? '';

    return bookStem
        ? new RegExp(`\\b${leadingNumber}${bookStem}[a-z]*\\.?\\s+${chapterNumber}\\s*:\\s*${targetVerse}\\b`, 'i')
        : null;
}

function excerptForTarget(text, { bookName, chapterNumber, targetVerse, exactVerse }) {
    if (exactVerse) return excerpt(text);

    const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
    const referencePattern = getTargetReferencePattern(bookName, chapterNumber, targetVerse);
    const match = referencePattern?.exec(clean);

    return excerpt(match ? clean.slice(match.index) : clean);
}

export function selectRelevantCommentaryEntry(entries, { targetVerse, targetReference = '', query = '' }) {
    const terms = [...new Set(getTerms(query))];
    const referenceMatch = String(targetReference).match(/^(.+?)\s+(\d+):(\d+)$/);
    const referencePattern = referenceMatch
        ? getTargetReferencePattern(referenceMatch[1], Number(referenceMatch[2]), Number(referenceMatch[3]))
        : null;

    return entries
        .map((entry, index) => {
            const textTerms = new Set(getTerms(entry.text));
            const termScore = terms.reduce((score, term) => (
                score + (textTerms.has(term) ? 1 : 0)
            ), 0);
            const exactVerse = entry.verse === targetVerse;
            const explicitTargetReference = !exactVerse && Boolean(referencePattern?.test(entry.text));
            const targetScore = exactVerse ? 12 : 0;
            const proximityScore = Number.isFinite(entry.verse)
                ? Math.max(0, 6 - (Math.abs(entry.verse - targetVerse) * 2))
                : 0;
            const chapterScore = entry.verse === null ? 1 : 0;

            return {
                entry,
                index,
                termScore,
                exactVerse,
                explicitTargetReference,
                score: targetScore + proximityScore + termScore + chapterScore
                    + (explicitTargetReference ? 8 : 0),
            };
        })
        .filter(result => (
            result.exactVerse
            || (result.explicitTargetReference && result.termScore >= 1)
            || (result.entry.verse === null && result.termScore >= 2)
        ))
        .sort((first, second) => second.score - first.score || first.index - second.index)[0]?.entry ?? null;
}

export function toCommentaryFinding(source, entry, bookName, chapterNumber, targetVerse = entry.verse) {
    const explicitTargetReference = Boolean(
        getTargetReferencePattern(bookName, chapterNumber, targetVerse)?.test(entry.text),
    );
    const findingVerse = entry.verse === targetVerse || explicitTargetReference
        ? targetVerse
        : entry.verse;
    const reference = findingVerse
        ? `${bookName} ${chapterNumber}:${findingVerse}`
        : `${bookName} ${chapterNumber}`;

    return {
        id: `commentary-${source.id}-${bookName}-${chapterNumber}-${entry.verse ?? 'chapter'}`
            .replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
        title: `${source.label} on ${reference}`,
        text: excerptForTarget(entry.text, {
            bookName,
            chapterNumber,
            targetVerse,
            exactVerse: entry.verse === targetVerse,
        }),
        references: [reference],
        confidence: 'low',
        reviewStatus: 'source-text',
        allowedUse: 'Treat this historical commentary as a named perspective, not as final authority. Distinguish direct disagreement from a difference of emphasis, and keep the passage primary.',
        source: {
            id: `commentary-${source.id}`,
            label: source.label,
            href: source.href,
            license: source.license,
        },
    };
}

export async function loadPassageCommentaryReport({
    target,
    query = '',
    signal,
    loadCommentary = loadPublicCommentary,
}) {
    const results = await Promise.allSettled(PUBLIC_COMMENTARY_SOURCES.map(async source => {
        const result = await loadCommentary({
            sourceId: source.id,
            bookName: target.bookName,
            chapterNumber: target.chapter,
            signal,
        });
        if (result.status !== 'ready') return { status: 'unavailable', finding: null };

        const entry = selectRelevantCommentaryEntry(result.entries, {
            targetVerse: target.verse,
            targetReference: target.reference,
            query: `${query} ${target.quote}`,
        });
        return {
            status: entry ? 'matched' : 'unmatched',
            finding: entry
                ? toCommentaryFinding(source, entry, target.bookName, target.chapter, target.verse)
                : null,
        };
    }));

    const fulfilled = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
    const findings = fulfilled.map(result => result.finding).filter(Boolean);

    return {
        findings,
        failedSourceCount: results.filter(result => result.status === 'rejected').length,
        unavailableSourceCount: fulfilled.filter(result => result.status === 'unavailable').length,
        unmatchedSourceCount: fulfilled.filter(result => result.status === 'unmatched').length,
        sourceCount: results.length,
    };
}

export async function getPassageCommentaryFindings(options) {
    const report = await loadPassageCommentaryReport(options);
    return report.findings;
}

function joinTerms(terms) {
    if (terms.length < 2) return terms[0] ?? '';
    if (terms.length === 2) return `${terms[0]} and ${terms[1]}`;
    return `${terms.slice(0, -1).join(', ')}, and ${terms.at(-1)}`;
}

function toTheme(term) {
    if (term === 'god') return 'God';
    if (term.startsWith('creat')) return 'creation';
    if (['said', 'say', 'says', 'speak', 'speaks', 'speaking', 'spoken', 'word', 'words'].includes(term)) {
        return 'speech';
    }
    return term;
}

function getSharedTerms(findings) {
    const sourceFrequency = new Map();
    const totalFrequency = new Map();

    for (const finding of findings) {
        const terms = getTerms(finding.text).map(toTheme);
        const sourceTerms = new Set(terms);

        for (const term of terms) {
            totalFrequency.set(term, (totalFrequency.get(term) ?? 0) + 1);
        }
        for (const term of sourceTerms) {
            sourceFrequency.set(term, (sourceFrequency.get(term) ?? 0) + 1);
        }
    }

    const minimumSources = Math.max(2, Math.ceil(findings.length / 2));
    return [...sourceFrequency.entries()]
        .filter(([, count]) => count >= minimumSources)
        .sort((first, second) => (
            second[1] - first[1]
            || (totalFrequency.get(second[0]) ?? 0) - (totalFrequency.get(first[0]) ?? 0)
            || first[0].localeCompare(second[0])
        ))
        .slice(0, 4)
        .map(([term]) => term);
}

function getRepresentativeExcerpt(finding, target) {
    const targetTerms = new Set(getTerms(`${target.quote} ${target.reference}`));
    const sentences = finding.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [finding.text];

    return sentences
        .map((sentence, index) => {
            const terms = getTerms(sentence);
            const overlap = terms.reduce((score, term) => score + (targetTerms.has(term) ? 1 : 0), 0);
            const readableLength = sentence.length >= 48 && sentence.length <= 300 ? 2 : 0;
            return { sentence: sentence.trim(), index, score: overlap * 3 + readableLength };
        })
        .sort((first, second) => second.score - first.score || first.index - second.index)[0]?.sentence
        ?? finding.text;
}

export function buildCommentaryOverview({ target, commentaryFindings }) {
    const findings = commentaryFindings ?? [];
    const sharedTerms = getSharedTerms(findings);
    const sourceCount = findings.length;

    return {
        shared: sharedTerms.length
            ? `Across ${sourceCount} commentaries, the excerpts share attention to ${joinTerms(sharedTerms)}.`
            : `The ${sourceCount} available commentaries approach this passage from different angles; their excerpts do not reveal a clear shared emphasis automatically.`,
        differences: 'The source notes below show each commentator\'s distinct emphasis. Different emphasis is not necessarily direct disagreement.',
        why: 'These excerpts can show which details each work emphasizes. They cannot safely establish an author\'s motive or theological cause unless the source itself makes that reasoning explicit.',
        perspectives: findings.map(finding => ({
            id: finding.id,
            source: finding.source,
            reference: finding.references?.[0] ?? target.reference,
            text: excerpt(getRepresentativeExcerpt(finding, target), 190),
        })),
        sourceCount,
    };
}

export function buildCommentaryComparisonRequest({ target, passageFindings = [], commentaryFindings = [] }) {
    const passageContext = passageFindings.filter(finding => finding.source?.id === 'passage-context').slice(0, 1);
    const sourceFindings = [...passageContext, ...commentaryFindings];
    const synthesisRequest = buildStudySynthesisRequest({
        observation: {
            id: `${target.id}-commentary-comparison`,
            type: 'commentary-comparison',
            verse: target.verse,
            quote: target.quote,
            reference: target.reference,
            selections: target.selections ?? [],
            note: 'Compare the named commentary excerpts. Identify shared readings, distinct emphases, and only direct disagreements supported by the excerpts.',
        },
        route: {
            id: 'commentary-comparison',
            label: 'Compare commentary',
        },
        sourceFindings,
    });

    return {
        ...synthesisRequest,
        mode: 'commentary-comparison',
    };
}

const REASON_LABELS = {
    'passage-scope': 'They focus on different parts or scopes of the passage.',
    'word-meaning': 'They understand a significant word or phrase differently.',
    'historical-assumption': 'They use different stated assumptions about the historical setting.',
    'theological-premise': 'They reason from different theological premises stated in the excerpts.',
    'application-focus': 'They draw attention to different pastoral or practical implications.',
    unclear: 'The excerpts show a difference, but do not establish why the commentators differ.',
};

function normalizeQuote(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

function getCommentaryCards(synthesisRequest) {
    return (synthesisRequest?.evidenceCards ?? [])
        .filter(card => card.sourceId?.startsWith('commentary-'));
}

function normalizeEvidenceItem(item, cardsById) {
    const card = cardsById.get(item?.cardId);
    const quote = String(item?.quote ?? '').replace(/\s+/g, ' ').trim();
    const normalizedQuote = normalizeQuote(quote);
    const normalizedClaim = normalizeQuote(card?.claim);

    if (!card || normalizedQuote.length < 16 || !normalizedClaim.includes(normalizedQuote)) {
        return null;
    }

    return {
        cardId: card.id,
        sourceId: card.sourceId,
        sourceLabel: card.sourceLabel || card.title,
        sourceUrl: card.sourceUrl || '',
        reference: card.scope || '',
        quote,
    };
}

function normalizeEvidence(items, cardsById) {
    const seen = new Set();

    return (Array.isArray(items) ? items : [])
        .map(item => normalizeEvidenceItem(item, cardsById))
        .filter(Boolean)
        .filter(item => {
            const key = `${item.cardId}:${normalizeQuote(item.quote)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function normalizeGroup(group, cardsById, type) {
    const evidence = normalizeEvidence(group?.evidence, cardsById);
    const distinctSources = new Set(evidence.map(item => item.sourceId));
    if (distinctSources.size < 2) return null;

    if (type === 'agreement') {
        return { evidence };
    }

    // Exact quotations prove provenance, but they do not by themselves prove a semantic contradiction.
    // Keep model-found differences as emphases until a deterministic conflict check exists.
    const kind = 'emphasis';
    const reasonEvidence = normalizeEvidence(group?.reasonEvidence, cardsById)
        .filter(item => distinctSources.has(item.sourceId));
    const reasonSources = new Set(reasonEvidence.map(item => item.sourceId));
    const requestedReason = REASON_LABELS[group?.reasonKind] ? group.reasonKind : 'unclear';
    const reasonKind = requestedReason !== 'unclear' && reasonSources.size < 2
        ? 'unclear'
        : requestedReason;

    return {
        kind,
        evidence,
        reasonKind,
        reason: REASON_LABELS[reasonKind],
        reasonEvidence,
    };
}

export function normalizeCommentaryComparisonDraft(parsed, synthesisRequest) {
    const cards = getCommentaryCards(synthesisRequest);
    const cardsById = new Map(cards.map(card => [card.id, card]));
    const agreements = (Array.isArray(parsed?.agreements) ? parsed.agreements : [])
        .map(group => normalizeGroup(group, cardsById, 'agreement'))
        .filter(Boolean)
        .slice(0, 3);
    const differences = (Array.isArray(parsed?.differences) ? parsed.differences : [])
        .map(group => normalizeGroup(group, cardsById, 'difference'))
        .filter(Boolean)
        .slice(0, 3);
    const comparedSourceIds = [...new Set([
        ...agreements.flatMap(group => group.evidence.map(item => item.sourceId)),
        ...differences.flatMap(group => group.evidence.map(item => item.sourceId)),
    ])];

    return {
        agreements,
        differences,
        comparedSourceIds,
        sourceCount: cards.length,
    };
}
