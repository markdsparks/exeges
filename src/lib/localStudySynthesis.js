export const LOCAL_STUDY_SLM_MODELS = [
    {
        id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
        label: 'Qwen2.5 0.5B',
        profile: 'qwen2',
        description: 'Experimental',
    },
    {
        id: 'Qwen3-0.6B-q4f16_1-MLC',
        label: 'Qwen3 0.6B',
        profile: 'qwen3',
        description: 'Reasoning test',
    },
    {
        id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
        label: 'SmolLM2 360M',
        profile: 'smollm',
        description: 'Legacy',
    },
];
export const LOCAL_STUDY_SLM_MODEL_ID = LOCAL_STUDY_SLM_MODELS[0].id;

let enginePromise = null;
let engineWorker = null;
let engineModelId = '';

export function getLocalStudyModelOption(modelId = LOCAL_STUDY_SLM_MODEL_ID) {
    return LOCAL_STUDY_SLM_MODELS.find(model => model.id === modelId) ?? LOCAL_STUDY_SLM_MODELS[0];
}

function assertCanUseLocalSlm(synthesisRequest) {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error('Local synthesis only runs in the browser.');
    }

    if (!navigator.gpu) {
        throw new Error('This browser does not expose WebGPU yet.');
    }

    if (!synthesisRequest?.sources?.length && !synthesisRequest?.evidenceCards?.length) {
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

async function getLocalEngine(onProgress, modelId = LOCAL_STUDY_SLM_MODEL_ID) {
    if (enginePromise && engineModelId !== modelId) {
        engineWorker?.terminate();
        engineWorker = null;
        enginePromise = null;
        engineModelId = '';
    }

    if (!enginePromise) {
        engineWorker = new Worker(new URL('../workers/studySlm.worker.js', import.meta.url), {
            type: 'module',
        });
        engineModelId = modelId;

        enginePromise = import('@mlc-ai/web-llm')
            .then(async ({ CreateWebWorkerMLCEngine, prebuiltAppConfig }) => (
                CreateWebWorkerMLCEngine(
                    engineWorker,
                    modelId,
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
                engineModelId = '';
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
                'Use only the observation and evidence cards supplied in this prompt.',
                'Do not invent facts, definitions, history, cross references, or lexical claims.',
                'Write a concise, useful interpretation draft, even when it must stay tentative.',
                'Do not return empty labels. If the grounding is thin, say what is safe to say and what to check next.',
                'Never apologize, never say you lack ability, and never say you need source chunks when source chunks are supplied.',
                'Do not include hidden reasoning, chain-of-thought, or thinking tags.',
                'Prefer plain text with the exact headings Context, Meaning, Guardrail, Next question, Citations, Confidence.',
                'Return each heading at most once. Do not use a repeated Question/Response format.',
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
    const evidenceCards = getEvidenceCardsForPrompt(synthesisRequest);
    const validCitationIds = getValidCitationIds(synthesisRequest);
    const evidenceText = evidenceCards.map(card => (
        [
            `CARD ID: ${card.id}`,
            `TITLE: ${card.title}`,
            `SOURCE: ${card.sourceLabel || card.sourceId || 'Local source pack'}`,
            `SCOPE: ${card.scope || 'general background'}`,
            `USE: ${card.allowedUse || 'Use only as supporting context.'}`,
            `SUPPORTED CLAIM: ${card.claim || card.text}`,
        ].join('\n')
    )).join('\n\n');

    return [
        '/no_think',
        options.retry
            ? 'Task: Retry the draft. The supplied evidence cards are enough for a tentative helper.'
            : 'Task: Draft a small grounded interpretation helper for testing.',
        'Give a real response the user can evaluate, not only a warning or an empty schema.',
        'Do not include apologies, capability disclaimers, or requests for more evidence cards.',
        'Do not echo the question. Do not repeat the same answer.',
        'If a claim is not supported by an evidence card, put it in Next question instead of asserting it.',
        '',
        `Observation: ${observation.label || observation.reference || observation.quote}`,
        `Type: ${observation.type || 'observation'}`,
        `Question or note: ${observation.note || 'none'}`,
        `Selected text: ${observation.quote || 'none'}`,
        `Study route: ${route.label || route.id || 'Study question'}`,
        `Available evidence card count: ${evidenceCards.length}`,
        '',
        'BEGIN EVIDENCE CARDS',
        evidenceText || 'No evidence cards.',
        'END EVIDENCE CARDS',
        `Valid citation ids: ${validCitationIds.join(', ') || 'none'}`,
        'If you cite sources, cite only those card ids. Do not cite selected words or names.',
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

function getEvidenceCardsForPrompt(synthesisRequest) {
    if (synthesisRequest.evidenceCards?.length) {
        return synthesisRequest.evidenceCards;
    }

    return (synthesisRequest.sources ?? []).map(source => ({
        id: source.id,
        title: source.title,
        sourceId: source.sourceId,
        sourceLabel: source.sourceLabel,
        scope: source.references?.join(', ') || 'source chunk',
        allowedUse: 'Use only as supporting context.',
        claim: source.text,
        text: source.text,
    }));
}

function getValidCitationIds(synthesisRequest) {
    return getEvidenceCardsForPrompt(synthesisRequest)
        .map(card => card.id)
        .filter(Boolean);
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

function stripLocalModelThinking(text) {
    return normalizeTextField(text)
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\/?think>/gi, '')
        .trim();
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

function normalizeComparableLine(line) {
    return line
        .toLowerCase()
        .replace(/[^\w\s-]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
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
        response: 'meaning',
        answer: 'meaning',
        guardrail: 'guardrail',
        caution: 'guardrail',
        'next question': 'nextQuestion',
        'next study question': 'nextQuestion',
        confidence: 'confidence',
        citations: 'citations',
        citation: 'citations',
        question: 'ignore',
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
    const comparableLine = normalizeComparableLine(cleanLine);
    const alreadyIncluded = sections[field].some(item => (
        normalizeComparableLine(item) === comparableLine
    ));

    if (cleanLine && comparableLine && !alreadyIncluded) {
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
            currentField = heading.field === 'ignore' ? '' : heading.field;
            if (currentField && heading.content) {
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

export function isLocalStudySelfTalkText(text) {
    const cleanText = normalizeTextField(text).toLowerCase();
    if (!cleanText) return false;

    const selfTalkPatterns = [
        /\bokay,?\s+let'?s tackle\b/,
        /\bthe user wants\b/,
        /\bthe user (mentioned|asked|might be)\b/,
        /\bprovided observation\b/,
        /\bprovided evidence cards\b/,
        /\bexact headings\b/,
        /\bfirst,?\s+i need\b/,
        /\bi need to structure\b/,
        /\bstarting with context\b/,
        /\bthe .* section should\b/,
    ];

    return selfTalkPatterns.some(pattern => pattern.test(cleanText));
}

function hasDraftSelfTalk(draft) {
    return [
        draft.context,
        draft.meaning,
        draft.guardrail,
        draft.nextQuestion,
    ].some(isLocalStudySelfTalkText);
}

function makeRawOnlyDraft(cleanRawText, synthesisRequest, parseError, modelId) {
    return {
        context: '',
        meaning: '',
        guardrail: '',
        nextQuestion: '',
        citations: [],
        confidence: 'low',
        modelId,
        rawText: cleanRawText,
        unstructured: true,
        parseError,
        sourceCount: synthesisRequest.sources?.length ?? 0,
    };
}

function makeUnstructuredDraft(rawText, synthesisRequest, parseError = '', modelId = LOCAL_STUDY_SLM_MODEL_ID) {
    const cleanRawText = stripLocalModelThinking(rawText);

    if (!cleanRawText) {
        throw new Error('The local model did not return text. Try again, or keep using the retrieved source chunks.');
    }

    const parsedPlainText = parseLocalStudyPlainTextDraft(cleanRawText);
    const normalizedPlainText = normalizeDraft(parsedPlainText, synthesisRequest, cleanRawText, {
        unstructured: true,
        parseError,
        modelId,
    });

    if (
        hasDraftContent(normalizedPlainText)
        && !isLocalStudySelfTalkText(cleanRawText)
        && !hasDraftSelfTalk(normalizedPlainText)
    ) {
        return normalizedPlainText;
    }

    return makeRawOnlyDraft(cleanRawText, synthesisRequest, parseError, modelId);
}

function normalizeDraft(parsed, synthesisRequest, rawText, options = {}) {
    const sourceIds = new Set(getValidCitationIds(synthesisRequest));
    const cleanRawText = stripLocalModelThinking(rawText);
    const draft = {
        context: normalizeTextField(parsed.context),
        meaning: normalizeTextField(parsed.meaning),
        guardrail: normalizeTextField(parsed.guardrail),
        nextQuestion: normalizeTextField(parsed.nextQuestion),
        citations: normalizeCitations(parsed.citations, sourceIds),
        confidence: normalizeConfidence(parsed.confidence),
        modelId: options.modelId ?? LOCAL_STUDY_SLM_MODEL_ID,
        rawText: cleanRawText,
        unstructured: !!options.unstructured,
        parseError: options.parseError ?? '',
        sourceCount: synthesisRequest.sources?.length ?? 0,
    };

    if (!hasDraftContent(draft) && !options.unstructured) {
        return makeUnstructuredDraft(
            cleanRawText,
            synthesisRequest,
            'Structured response was empty.',
            options.modelId,
        );
    }

    if (hasDraftSelfTalk(draft) && !options.unstructured) {
        return makeRawOnlyDraft(
            cleanRawText,
            synthesisRequest,
            'Local model returned reasoning text instead of a draft.',
            options.modelId ?? LOCAL_STUDY_SLM_MODEL_ID,
        );
    }

    return draft;
}

export function normalizeLocalStudyModelDraft({
    rawText,
    synthesisRequest,
    modelId = LOCAL_STUDY_SLM_MODEL_ID,
    parseError = 'Structured parsing failed.',
}) {
    const cleanRawText = stripLocalModelThinking(rawText);

    try {
        return normalizeDraft(parseJsonObject(cleanRawText), synthesisRequest, cleanRawText, {
            modelId,
        });
    } catch {
        return makeUnstructuredDraft(cleanRawText, synthesisRequest, parseError, modelId);
    }
}

function getGenerationOptions(modelId = LOCAL_STUDY_SLM_MODEL_ID, options = {}) {
    const model = getLocalStudyModelOption(modelId);

    if (model.profile === 'qwen3') {
        return {
            temperature: 0.7,
            top_p: 0.8,
            presence_penalty: options.retry ? 1.5 : 1.35,
            max_tokens: options.retry ? 260 : 220,
        };
    }

    if (model.profile === 'qwen2') {
        return {
            temperature: options.retry ? 0.45 : 0.35,
            top_p: 0.8,
            presence_penalty: options.retry ? 1.25 : 1.1,
            max_tokens: 260,
        };
    }

    return {
        temperature: options.retry ? 0.3 : 0.2,
        top_p: 0.9,
        presence_penalty: options.retry ? 1.3 : 1.15,
        max_tokens: 260,
    };
}

async function createLocalDraftCompletion(engine, synthesisRequest, options = {}) {
    const response = await engine.chat.completions.create({
        messages: buildMessages(synthesisRequest, options),
        ...getGenerationOptions(options.modelId, options),
    });

    return stripLocalModelThinking(response?.choices?.[0]?.message?.content ?? '');
}

export async function draftLocalStudySynthesis({
    synthesisRequest,
    modelId = LOCAL_STUDY_SLM_MODEL_ID,
    onProgress,
}) {
    assertCanUseLocalSlm(synthesisRequest);
    onProgress?.({ text: 'Loading local model...', percent: null });

    const engine = await getLocalEngine(onProgress, modelId);
    onProgress?.({ text: 'Drafting from retrieved chunks...', percent: null });

    let rawText = await createLocalDraftCompletion(engine, synthesisRequest, {
        modelId,
    });

    if (isLocalStudyRefusalText(rawText)) {
        onProgress?.({ text: 'Retrying with clearer source chunks...', percent: null });
        const retryText = await createLocalDraftCompletion(engine, synthesisRequest, {
            retry: true,
            modelId,
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
            modelId,
        );
    }

    return normalizeDraft(parsed, synthesisRequest, rawText, {
        modelId,
    });
}
