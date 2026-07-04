export const LOCAL_STUDY_SLM_MODEL_ID = 'SmolLM2-360M-Instruct-q4f16_1-MLC';

let enginePromise = null;
let engineWorker = null;

function assertCanUseLocalSlm(synthesisRequest) {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error('Local synthesis only runs in the browser.');
    }

    if (!navigator.gpu) {
        throw new Error('This browser does not expose WebGPU yet.');
    }

    if (!synthesisRequest?.sources?.length) {
        throw new Error('Local synthesis needs at least one retrieved source chunk.');
    }
}

function createEngineProgressHandler(onProgress) {
    return (progress) => {
        const percent = Number.isFinite(progress?.progress)
            ? Math.round(progress.progress * 100)
            : null;
        const text = progress?.text ?? 'Loading local model...';

        onProgress?.({
            text,
            percent,
        });
    };
}

async function getLocalEngine(onProgress) {
    if (!enginePromise) {
        engineWorker = new Worker(new URL('../workers/studySlm.worker.js', import.meta.url), {
            type: 'module',
        });

        enginePromise = import('@mlc-ai/web-llm')
            .then(async ({ CreateWebWorkerMLCEngine, prebuiltAppConfig }) => (
                CreateWebWorkerMLCEngine(
                    engineWorker,
                    LOCAL_STUDY_SLM_MODEL_ID,
                    {
                        appConfig: {
                            ...prebuiltAppConfig,
                            cacheBackend: 'indexeddb',
                        },
                        initProgressCallback: createEngineProgressHandler(onProgress),
                    },
                )
            ))
            .catch((error) => {
                engineWorker?.terminate();
                engineWorker = null;
                enginePromise = null;
                throw error;
            });
    }

    return enginePromise;
}

function buildMessages(synthesisRequest) {
    return [
        {
            role: 'system',
            content: [
                'You are an experimental local Bible study synthesis helper.',
                'You are not the authority. The passage and supplied source chunks are the authority.',
                'Use only the JSON packet supplied by the user.',
                'Do not add facts, definitions, historical claims, cross references, or lexical claims unless they appear in the packet.',
                'Return only valid JSON with these string fields: context, meaning, guardrail, nextQuestion, confidence.',
                'Return citations as an array of source chunk ids used.',
                'Confidence must be low, medium, or high.',
            ].join(' '),
        },
        {
            role: 'user',
            content: JSON.stringify({
                task: 'Draft a small grounded interpretation helper.',
                packet: synthesisRequest,
            }),
        },
    ];
}

function parseJsonObject(text) {
    const clean = (text ?? '').trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');
    const objectStart = clean.indexOf('{');
    const objectEnd = clean.lastIndexOf('}');

    if (objectStart === -1 || objectEnd === -1 || objectEnd <= objectStart) {
        throw new Error('The local model did not return structured JSON.');
    }

    return JSON.parse(clean.slice(objectStart, objectEnd + 1));
}

function normalizeTextField(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeConfidence(value) {
    return ['low', 'medium', 'high'].includes(value) ? value : 'low';
}

function normalizeCitations(value, sourceIds) {
    if (!Array.isArray(value)) return [];

    return value
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(item => sourceIds.has(item));
}

function normalizeDraft(parsed, synthesisRequest, rawText) {
    const sourceIds = new Set((synthesisRequest.sources ?? []).map(source => source.id));

    return {
        context: normalizeTextField(parsed.context),
        meaning: normalizeTextField(parsed.meaning),
        guardrail: normalizeTextField(parsed.guardrail),
        nextQuestion: normalizeTextField(parsed.nextQuestion),
        citations: normalizeCitations(parsed.citations, sourceIds),
        confidence: normalizeConfidence(parsed.confidence),
        modelId: LOCAL_STUDY_SLM_MODEL_ID,
        rawText,
    };
}

export async function draftLocalStudySynthesis({ synthesisRequest, onProgress }) {
    assertCanUseLocalSlm(synthesisRequest);
    onProgress?.({ text: 'Loading local model...', percent: null });

    const engine = await getLocalEngine(onProgress);
    onProgress?.({ text: 'Drafting from retrieved chunks...', percent: null });

    const response = await engine.chat.completions.create({
        messages: buildMessages(synthesisRequest),
        temperature: 0.1,
        max_tokens: 360,
    });
    const rawText = response?.choices?.[0]?.message?.content ?? '';
    const parsed = parseJsonObject(rawText);

    return normalizeDraft(parsed, synthesisRequest, rawText);
}
