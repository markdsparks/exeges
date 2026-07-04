import { STUDY_SOURCE_CHUNKS, STUDY_SOURCE_PACK_VERSION, STUDY_SOURCES } from '../data/studySourcePacks';
import { cleanStudyToken } from './studyMethod';
import { buildStudySynthesisRequest } from './studySynthesisRequest';

const STOPWORDS = new Set([
    'a',
    'about',
    'all',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'but',
    'by',
    'do',
    'does',
    'for',
    'from',
    'has',
    'have',
    'he',
    'how',
    'i',
    'in',
    'is',
    'it',
    'of',
    'on',
    'or',
    'that',
    'the',
    'this',
    'to',
    'was',
    'what',
    'when',
    'where',
    'who',
    'why',
    'with',
]);

function normalizeText(text) {
    return (text ?? '')
        .toLowerCase()
        .replace(/[\u2019']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function tokenize(text) {
    return normalizeText(text)
        .split(/\s+/)
        .map(cleanStudyToken)
        .map(token => token.toLowerCase())
        .filter(token => token.length > 1 && !STOPWORDS.has(token));
}

function uniqueTokens(text) {
    return [...new Set(tokenize(text))];
}

function getObservationText(observation) {
    return [
        observation?.quote,
        observation?.note,
        observation?.reference,
        ...(observation?.selections ?? []).map(selection => selection.text),
    ].join(' ');
}

function hydrateChunk(chunk, score) {
    const source = STUDY_SOURCES[chunk.sourceId] ?? null;

    return {
        id: chunk.id,
        title: chunk.title,
        text: chunk.text,
        references: chunk.references ?? [],
        license: chunk.license ?? source?.license ?? '',
        attribution: chunk.attribution ?? source?.label ?? '',
        sourceUrl: chunk.sourceUrl ?? source?.href ?? '',
        confidence: chunk.confidence ?? '',
        reviewStatus: chunk.reviewStatus ?? '',
        allowedUse: chunk.allowedUse ?? '',
        score,
        generated: !!chunk.generated,
        source: source ? {
            id: source.id,
            label: source.label,
            href: source.href,
            license: source.license,
        } : null,
    };
}

function scoreChunk(chunk, { observation, route }) {
    const routeId = typeof route === 'string' ? route : route?.id;
    const observationText = getObservationText(observation);
    const observationTokens = uniqueTokens(observationText);
    const focus = normalizeText(observation?.quote);
    const chunkText = normalizeText([
        chunk.title,
        chunk.text,
        ...(chunk.terms ?? []),
        ...(chunk.references ?? []),
    ].join(' '));

    let score = 0;

    if (routeId && chunk.routeIds?.includes(routeId)) score += 12;
    if (focus && chunkText.includes(focus)) score += 10;

    for (const token of observationTokens) {
        if (chunk.terms?.some(term => normalizeText(term) === token)) score += 4;
        else if (chunkText.includes(token)) score += 2;
    }

    const reference = observation?.reference ?? '';
    if (reference && chunk.references?.some(item => item === reference || reference.startsWith(item))) {
        score += 5;
    }

    return score;
}

export function retrieveStudySourceChunks({ observation, route, limit = 4 }) {
    if (!observation) return [];

    return STUDY_SOURCE_CHUNKS
        .map(chunk => ({ chunk, score: scoreChunk(chunk, { observation, route }) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.chunk.title.localeCompare(b.chunk.title))
        .slice(0, limit)
        .map(item => hydrateChunk(item.chunk, item.score));
}

export function getLocalStudyGrounding({ observation, route }) {
    const sourceFindings = retrieveStudySourceChunks({ observation, route });
    const synthesisRequest = buildStudySynthesisRequest({ observation, route, sourceFindings });

    return {
        provider: 'local-source-pack',
        version: STUDY_SOURCE_PACK_VERSION,
        status: sourceFindings.length ? 'ready' : 'needs-sources',
        confidence: sourceFindings.length >= 3 ? 'medium' : 'low',
        sourceFindings,
        synthesisRequest,
        citations: sourceFindings
            .map(finding => finding.source)
            .filter(Boolean)
            .filter((source, index, sources) => sources.findIndex(item => item.id === source.id) === index),
    };
}

export function getLocalStudyCapabilities() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return {
            webGpu: false,
            webWorker: false,
            indexedDb: false,
            cacheApi: false,
            localSlmAvailable: false,
            localSlmRecommended: false,
            localSlmRisk: '',
            mode: 'server-render-safe',
        };
    }

    const webGpu = !!navigator.gpu;
    const webWorker = typeof Worker !== 'undefined';
    const indexedDb = typeof indexedDB !== 'undefined';
    const cacheApi = typeof caches !== 'undefined';
    const userAgent = navigator.userAgent ?? '';
    const platform = navigator.platform ?? '';
    const isTouchMac = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isIosLike = /iPad|iPhone|iPod/.test(userAgent) || isTouchMac;
    const localSlmRisk = isIosLike ? 'ios-webgpu-memory-risk' : '';
    const localSlmAvailable = webGpu && webWorker && indexedDb;
    const localSlmRecommended = localSlmAvailable && !isIosLike;

    return {
        webGpu,
        webWorker,
        indexedDb,
        cacheApi,
        localSlmAvailable,
        localSlmRecommended,
        localSlmRisk,
        mode: localSlmRecommended
            ? 'slm-ready'
            : localSlmAvailable
                ? 'slm-experimental-risk'
                : webGpu && webWorker
                ? 'stable-grounding'
                : 'retrieval-only',
    };
}
