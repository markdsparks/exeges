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
                'You are an experimental local Bible study helper.',
                'Use only the observation and source chunks supplied by the user.',
                'Do not invent facts, definitions, history, cross references, or lexical claims.',
                'Write a concise, useful interpretation draft, even when it must stay tentative.',
                'Do not return empty labels. If the grounding is thin, say what is safe to say and what to check next.',
                'Prefer JSON with fields context, meaning, guardrail, nextQuestion, citations, confidence.',
                'If JSON is difficult, answer in plain text with short headings.',
            ].join(' '),
        },
        {
            role: 'user',
            content: formatSynthesisPrompt(synthesisRequest),
        },
    ];
}

function formatSynthesisPrompt(synthesisRequest) {
    const observation = synthesisRequest.observation ?? {};
    const route = synthesisRequest.route ?? {};
    const sources = synthesisRequest.sources ?? [];
    const sourceText = sources.map(source => (
        `[${source.id}] ${source.title}: ${source.text}`
    )).join('\n');

    return [
        'Task: Draft a small grounded interpretation helper for testing.',
        'Give a real response the user can evaluate, not only a warning or an empty schema.',
        '',
        `Observation: ${observation.label || observation.reference || observation.quote}`,
        `Type: ${observation.type || 'observation'}`,
        `Question or note: ${observation.note || 'none'}`,
        `Selected text: ${observation.quote || 'none'}`,
        `Study route: ${route.label || route.id || 'Study question'}`,
        '',
        'Source chunks:',
        sourceText || 'No source chunks.',
        '',
        'Preferred JSON shape:',
        '{"context":"...","meaning":"...","guardrail":"...","nextQuestion":"...","citations":["source-id"],"confidence":"low|medium|high"}',
        '',
        'If you cannot produce JSON, write plain text with Context, Meaning, Guardrail, and Next question headings.',
    ].join('\n');
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

function makeUnstructuredDraft(rawText, synthesisRequest, parseError = '') {
    const cleanRawText = normalizeTextField(rawText);

    if (!cleanRawText) {
        throw new Error('The local model did not return text. Try again, or keep using the retrieved source chunks.');
    }

    return {
        context: '',
        meaning: '',
        guardrail: '',
        nextQuestion: '',
        citations: [],
        confidence: 'low',
        modelId: LOCAL_STUDY_SLM_MODEL_ID,
        rawText: cleanRawText,
        unstructured: true,
        parseError,
        sourceCount: synthesisRequest.sources?.length ?? 0,
    };
}

function normalizeDraft(parsed, synthesisRequest, rawText) {
    const sourceIds = new Set((synthesisRequest.sources ?? []).map(source => source.id));
    const cleanRawText = normalizeTextField(rawText);
    const draft = {
        context: normalizeTextField(parsed.context),
        meaning: normalizeTextField(parsed.meaning),
        guardrail: normalizeTextField(parsed.guardrail),
        nextQuestion: normalizeTextField(parsed.nextQuestion),
        citations: normalizeCitations(parsed.citations, sourceIds),
        confidence: normalizeConfidence(parsed.confidence),
        modelId: LOCAL_STUDY_SLM_MODEL_ID,
        rawText: cleanRawText,
        unstructured: false,
    };

    if (!draft.context && !draft.meaning && !draft.guardrail && !draft.nextQuestion) {
        return makeUnstructuredDraft(cleanRawText, synthesisRequest, 'Structured response was empty.');
    }

    return draft;
}

export async function draftLocalStudySynthesis({ synthesisRequest, onProgress }) {
    assertCanUseLocalSlm(synthesisRequest);
    onProgress?.({ text: 'Loading local model...', percent: null });

    const engine = await getLocalEngine(onProgress);
    onProgress?.({ text: 'Drafting from retrieved chunks...', percent: null });

    const response = await engine.chat.completions.create({
        messages: buildMessages(synthesisRequest),
        temperature: 0.2,
        max_tokens: 520,
    });
    const rawText = response?.choices?.[0]?.message?.content ?? '';
    let parsed;

    try {
        parsed = parseJsonObject(rawText);
    } catch (error) {
        return makeUnstructuredDraft(
            rawText,
            synthesisRequest,
            error instanceof Error ? error.message : 'Structured parsing failed.',
        );
    }

    return normalizeDraft(parsed, synthesisRequest, rawText);
}
