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

function buildMessages(synthesisRequest, options = {}) {
    return [
        {
            role: 'system',
            content: [
                'You are an experimental local Bible study drafting function.',
                'You are not chatting with the user; output only the requested draft sections.',
                'Use only the observation and source chunks supplied in this prompt.',
                'Do not invent facts, definitions, history, cross references, or lexical claims.',
                'Write a concise, useful interpretation draft, even when it must stay tentative.',
                'Do not return empty labels. If the grounding is thin, say what is safe to say and what to check next.',
                'Never apologize, never say you lack ability, and never say you need source chunks when source chunks are supplied.',
                'Prefer plain text with the exact headings Context, Meaning, Guardrail, Next question, Citations, Confidence.',
                options.retry
                    ? 'Retry instruction: the previous answer was too cautious. Use the source chunks below and produce the draft sections.'
                    : '',
            ].join(' '),
        },
        {
            role: 'user',
            content: formatSynthesisPrompt(synthesisRequest, options),
        },
    ];
}

function formatSynthesisPrompt(synthesisRequest, options = {}) {
    const observation = synthesisRequest.observation ?? {};
    const route = synthesisRequest.route ?? {};
    const sources = synthesisRequest.sources ?? [];
    const validCitationIds = sources.map(source => source.id).filter(Boolean);
    const sourceText = sources.map(source => (
        [
            `SOURCE ID: ${source.id}`,
            `TITLE: ${source.title}`,
            `TEXT: ${source.text}`,
        ].join('\n')
    )).join('\n\n');

    return [
        options.retry
            ? 'Task: Retry the draft. The supplied source chunks are enough for a tentative helper.'
            : 'Task: Draft a small grounded interpretation helper for testing.',
        'Give a real response the user can evaluate, not only a warning or an empty schema.',
        'Do not include apologies, capability disclaimers, or requests for more source chunks.',
        '',
        `Observation: ${observation.label || observation.reference || observation.quote}`,
        `Type: ${observation.type || 'observation'}`,
        `Question or note: ${observation.note || 'none'}`,
        `Selected text: ${observation.quote || 'none'}`,
        `Study route: ${route.label || route.id || 'Study question'}`,
        `Available source chunk count: ${sources.length}`,
        '',
        'BEGIN SOURCE CHUNKS',
        sourceText || 'No source chunks.',
        'END SOURCE CHUNKS',
        `Valid citation ids: ${validCitationIds.join(', ') || 'none'}`,
        'If you cite sources, cite only those ids. Do not cite selected words or names.',
        '',
        'Output exactly these headings with 1-2 concise sentences each where helpful:',
        'Context',
        'Meaning',
        'Guardrail',
        'Next question',
        'Citations',
        'Confidence',
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
    const clean = normalizeTextField(value).toLowerCase().replace(/[^\w]/g, '');

    return ['low', 'medium', 'high'].includes(clean) ? clean : 'low';
}

function normalizeCitations(value, sourceIds) {
    const items = Array.isArray(value)
        ? value
        : normalizeTextField(value).split(/[\n,]+/);
    const seen = new Set();

    return items
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(item => sourceIds.has(item))
        .filter((item) => {
            if (seen.has(item)) return false;
            seen.add(item);
            return true;
        });
}

function getPlainTextHeading(line) {
    const cleanLine = line
        .trim()
        .replace(/^#{1,6}\s*/, '')
        .replace(/^\*\*/, '')
        .replace(/\*\*$/, '')
        .replace(/^[*-]\s+/, '')
        .trim();
    const colonIndex = cleanLine.indexOf(':');
    const headingText = colonIndex >= 0 ? cleanLine.slice(0, colonIndex) : cleanLine;
    const content = colonIndex >= 0 ? cleanLine.slice(colonIndex + 1).trim() : '';
    const key = headingText.toLowerCase().replace(/\s+/g, ' ').replace(/[?.!]+$/g, '');
    const fieldByHeading = {
        context: 'context',
        meaning: 'meaning',
        interpretation: 'meaning',
        guardrail: 'guardrail',
        caution: 'guardrail',
        'next question': 'nextQuestion',
        'next study question': 'nextQuestion',
        confidence: 'confidence',
        citations: 'citations',
        citation: 'citations',
    };

    if (!fieldByHeading[key]) return null;

    return {
        field: fieldByHeading[key],
        content,
    };
}

function appendPlainTextSection(sections, field, line) {
    const cleanLine = line
        .trim()
        .replace(/^[*-]\s+/, '')
        .trim();

    if (cleanLine) {
        sections[field].push(cleanLine);
    }
}

export function parseLocalStudyPlainTextDraft(text) {
    const sections = {
        context: [],
        meaning: [],
        guardrail: [],
        nextQuestion: [],
        citations: [],
        confidence: [],
    };
    let currentField = '';

    for (const rawLine of normalizeTextField(text).split(/\n+/)) {
        const line = rawLine.trim();
        if (!line) continue;

        const heading = getPlainTextHeading(line);
        if (heading) {
            currentField = heading.field;
            if (heading.content) {
                appendPlainTextSection(sections, currentField, heading.content);
            }
            continue;
        }

        if (currentField && sections[currentField]) {
            appendPlainTextSection(sections, currentField, line);
        }
    }

    return {
        context: sections.context.join('\n'),
        meaning: sections.meaning.join('\n'),
        guardrail: sections.guardrail.join('\n'),
        nextQuestion: sections.nextQuestion.join('\n'),
        citations: sections.citations,
        confidence: sections.confidence[0] ?? '',
    };
}

function hasDraftContent(draft) {
    return !!(draft.context || draft.meaning || draft.guardrail || draft.nextQuestion);
}

export function isLocalStudyRefusalText(text) {
    const cleanText = normalizeTextField(text).toLowerCase();
    if (!cleanText) return false;

    const refusalPatterns = [
        /\bi'?m sorry\b/,
        /\bi am sorry\b/,
        /\bi don'?t have (the )?ability\b/,
        /\bi do not have (the )?ability\b/,
        /\bi would need more information\b/,
        /\bi need more information\b/,
        /\bi would need to see\b/,
        /\bi need to see\b/,
        /\bneed to see the source chunks\b/,
        /\bnot generate any further interpretation\b/,
        /\bcannot generate\b/,
        /\bcan'?t generate\b/,
        /\bunable to generate\b/,
    ];

    return refusalPatterns.some(pattern => pattern.test(cleanText));
}

function makeUnstructuredDraft(rawText, synthesisRequest, parseError = '') {
    const cleanRawText = normalizeTextField(rawText);

    if (!cleanRawText) {
        throw new Error('The local model did not return text. Try again, or keep using the retrieved source chunks.');
    }

    const parsedPlainText = parseLocalStudyPlainTextDraft(cleanRawText);
    const normalizedPlainText = normalizeDraft(parsedPlainText, synthesisRequest, cleanRawText, {
        unstructured: true,
        parseError,
    });

    if (hasDraftContent(normalizedPlainText)) {
        return normalizedPlainText;
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

function normalizeDraft(parsed, synthesisRequest, rawText, options = {}) {
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
        unstructured: !!options.unstructured,
        parseError: options.parseError ?? '',
        sourceCount: synthesisRequest.sources?.length ?? 0,
    };

    if (!hasDraftContent(draft) && !options.unstructured) {
        return makeUnstructuredDraft(cleanRawText, synthesisRequest, 'Structured response was empty.');
    }

    return draft;
}

async function createLocalDraftCompletion(engine, synthesisRequest, options = {}) {
    const response = await engine.chat.completions.create({
        messages: buildMessages(synthesisRequest, options),
        temperature: options.retry ? 0.35 : 0.2,
        max_tokens: 520,
    });

    return response?.choices?.[0]?.message?.content ?? '';
}

export async function draftLocalStudySynthesis({ synthesisRequest, onProgress }) {
    assertCanUseLocalSlm(synthesisRequest);
    onProgress?.({ text: 'Loading local model...', percent: null });

    const engine = await getLocalEngine(onProgress);
    onProgress?.({ text: 'Drafting from retrieved chunks...', percent: null });

    let rawText = await createLocalDraftCompletion(engine, synthesisRequest);

    if (isLocalStudyRefusalText(rawText)) {
        onProgress?.({ text: 'Retrying with clearer source chunks...', percent: null });
        const retryText = await createLocalDraftCompletion(engine, synthesisRequest, {
            retry: true,
        });

        if (normalizeTextField(retryText)) {
            rawText = retryText;
        }
    }

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
