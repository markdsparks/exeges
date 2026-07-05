import { useEffect, useRef, useState } from 'react';
import {
    STUDY_STAGES,
    getBookGenre,
    getObservationTypeLabel,
    getSelectionQuote,
} from '../../lib/studyMethod';
import { getBackgroundGuideForObservation } from '../../lib/backgroundGuides';
import { buildGroundedStudyDraft } from '../../lib/groundedStudyDraft';
import { auditLocalStudyDraft } from '../../lib/localStudyDraftAudit';
import {
    getLocalStudyCapabilities,
    getLocalStudyGroundingWithStaticPacks,
} from '../../lib/localStudyGrounding';
import {
    LOCAL_STUDY_SLM_MODEL_ID,
    LOCAL_STUDY_SLM_MODELS,
    draftLocalStudySynthesis,
} from '../../lib/localStudySynthesis';
import StudySelectionPanel from './StudySelectionPanel';

const EMPTY_DRAFT = {
    observe: '',
    interpret: '',
    apply: '',
};

const INTERPRET_HELPERS = [
    {
        key: 'anchor',
        label: 'Anchor it',
        prompt: 'What words or details in the passage show this?',
        placeholder: 'God said... and there was light.',
    },
    {
        key: 'context',
        label: 'Read around it',
        prompt: 'How do nearby verses, repetition, or the chapter flow clarify it?',
        placeholder: 'This fits the repeated pattern: God said, and it was so.',
    },
    {
        key: 'meaning',
        label: 'Name the meaning',
        prompt: 'What does this reveal about God, people, creation, sin, promise, or obedience?',
        placeholder: 'God creates by command; his word is effective.',
    },
    {
        key: 'guardrail',
        label: 'Guard the claim',
        prompt: 'What would be saying more than this passage actually says?',
        placeholder: 'This does not make human speech creator-level speech.',
    },
    {
        key: 'summary',
        label: 'Say it simply',
        prompt: 'Write the meaning in one clear sentence.',
        placeholder: "Genesis 1:3 shows that God's word powerfully brings light into being.",
    },
];

const APPLICATION_HELPERS = [
    {
        key: 'worship',
        label: 'Worship',
        prompt: 'What does this lead you to praise God for?',
        placeholder: 'Praise God that his word is powerful and life-giving.',
    },
    {
        key: 'trust',
        label: 'Trust',
        prompt: 'What truth about God should you rely on?',
        placeholder: 'I can trust what God says even before I see the outcome.',
    },
    {
        key: 'turn',
        label: 'Turn',
        prompt: 'What false belief, fear, or response does this correct?',
        placeholder: 'I should not treat darkness or disorder as stronger than God.',
    },
    {
        key: 'obey',
        label: 'Obey',
        prompt: 'What faithful response does this call for?',
        placeholder: "Listen carefully to God's word and respond with faith.",
    },
    {
        key: 'prayer',
        label: 'Pray',
        prompt: 'Turn the meaning into prayer.',
        placeholder: 'Lord, help me trust your word and worship your power.',
    },
];

function getContextVerses(chapter, focusVerse) {
    const verses = chapter?.verses ?? [];
    if (!verses.length) return [];

    const index = verses.findIndex(item => item.verse === focusVerse);
    if (index === -1) return verses.slice(0, Math.min(3, verses.length));

    return verses.slice(Math.max(0, index - 1), Math.min(verses.length, index + 2));
}

function prefersCompactStudyTray() {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(max-width: 860px)').matches;
}

function StudyTextArea({ label, value, placeholder, onChange, className = '' }) {
    return (
        <label className={`study-mode-field ${className}`.trim()}>
            <span className="study-mode-field-label">{label}</span>
            <textarea
                className="study-mode-textarea"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}

function countFilledFields(fields = {}, helpers = []) {
    return helpers.reduce((count, helper) => (
        fields?.[helper.key]?.trim() ? count + 1 : count
    ), 0);
}

function getObservationWorkStatus(observation, stage) {
    const helpers = stage === 'apply' ? APPLICATION_HELPERS : INTERPRET_HELPERS;
    const fields = stage === 'apply' ? observation?.application : observation?.interpretation;
    return `${countFilledFields(fields, helpers)}/${helpers.length}`;
}

function getObservationDisplayReference(observation) {
    return observation?.reference || `v${observation?.verse}`;
}

function HelperField({ helper, value, onChange }) {
    return (
        <label className="study-helper-field">
            <span>{helper.label}</span>
            <p>{helper.prompt}</p>
            <textarea
                value={value ?? ''}
                placeholder={helper.placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}

function LocalDraftAudit({ audit }) {
    if (!audit) return null;

    const sectionsToReview = audit.sections.filter(section => (
        !['empty', 'supported'].includes(section.status)
    ));
    const needsReview = sectionsToReview.length > 0;
    const statusLabel = audit.status === 'supported'
        ? 'Checked'
        : audit.status === 'uncited'
            ? 'Needs citations'
            : 'Review';

    return (
        <details
            className={`study-local-audit status-${audit.status}`.trim()}
            open={needsReview}
        >
            <summary>
                <span>Source check</span>
                <strong>{statusLabel}</strong>
            </summary>
            <p>{audit.summary}</p>
            {needsReview && (
                <div className="study-local-audit-list">
                    {sectionsToReview.map(section => (
                        <div
                            key={section.key}
                            className={`study-local-audit-row status-${section.status}`.trim()}
                        >
                            <strong>{section.label}</strong>
                            <p>{section.reason}</p>
                            {section.matchedCards.length > 0 && (
                                <em>Cards: {section.matchedCards.join(', ')}</em>
                            )}
                            {section.detailsToVerify.length > 0 && (
                                <em>Check: {section.detailsToVerify.join('; ')}</em>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </details>
    );
}

function getDraftUsableFields(draft) {
    return [
        ['summary', draft?.mainThought],
        ['context', draft?.context],
        ['meaning', draft?.meaning],
        ['guardrail', draft?.guardrail],
    ].filter(([, value]) => value?.trim());
}

function getDraftMainThought(draft) {
    return draft?.mainThought || draft?.meaning || draft?.context || '';
}

function getSourceRole(finding) {
    const sourceId = finding.source?.id ?? finding.sourceId ?? '';

    if (sourceId === 'passage-context') return 'Passage anchor';
    if (sourceId === 'openbible-cross-references') return 'Cross references';
    if (sourceId === 'exeges-method') return 'Method guardrail';
    if (sourceId.includes('dictionary')) return 'Background';
    if (sourceId.includes('geocoding')) return 'Place context';

    return 'Source note';
}

function getSourceUseText(finding) {
    const role = getSourceRole(finding);

    if (role === 'Passage anchor') return 'Sets the first boundary for interpretation.';
    if (role === 'Cross references') return 'Offers passages to compare after local meaning is clear.';
    if (role === 'Method guardrail') return 'Keeps the answer from over-reading the detail.';
    if (role === 'Background') return 'Adds modest historical or lexical context.';
    if (role === 'Place context') return 'Clarifies setting without making geography the point.';

    return 'Supports the answer as a checked source.';
}

function getVisibleSourceUses(sourceFindings = []) {
    const preferredRoles = ['Passage anchor', 'Cross references', 'Method guardrail', 'Background', 'Place context'];
    const sourceUses = [];

    for (const role of preferredRoles) {
        const finding = sourceFindings.find(item => getSourceRole(item) === role);
        if (finding) sourceUses.push(finding);
        if (sourceUses.length === 3) break;
    }

    return sourceUses.length ? sourceUses : sourceFindings.slice(0, 3);
}

function StudyDraftCard({
    draft,
    title,
    kicker,
    note,
    audit,
    sourceFindings = [],
    sourceLoading = false,
    onUseField,
}) {
    if (!draft) return null;

    const usableFields = getDraftUsableFields(draft);
    const canUseDraft = usableFields.length > 0;
    const mainThought = getDraftMainThought(draft);
    const visibleSourceUses = getVisibleSourceUses(sourceFindings);
    const handleUseDraft = () => {
        usableFields.forEach(([key, value]) => onUseField(key, value));
    };

    return (
        <div className="study-assistant-draft">
            <div className="study-assistant-draft-heading">
                <span>{kicker}</span>
                <strong>{title}</strong>
                {note && <p>{note}</p>}
            </div>

            {mainThought && (
                <div className="study-main-thought">
                    <span>Main thought</span>
                    <p>{mainThought}</p>
                </div>
            )}

            <div className="study-source-use-list" aria-label="How sources are being used">
                {sourceLoading && (
                    <div className="study-source-use">
                        <span>Chapter sources</span>
                        <p>Loading passage-specific evidence.</p>
                    </div>
                )}
                {visibleSourceUses.map(finding => (
                    <div className="study-source-use" key={finding.id}>
                        <span>{getSourceRole(finding)}</span>
                        <p>{getSourceUseText(finding)}</p>
                    </div>
                ))}
            </div>

            {audit && (
                <p className={`study-source-check status-${audit.status}`.trim()}>
                    Source check: {audit.status === 'checked' ? 'checked' : 'review suggested'}
                </p>
            )}

            <details className="study-assistant-details study-assistant-why">
                <summary>Show why</summary>
                <div className="study-assistant-draft-lines">
                    {draft.context && (
                        <p>
                            <strong>Passage:</strong> {draft.context}
                        </p>
                    )}
                    {draft.meaning && (
                        <p>
                            <strong>Meaning:</strong> {draft.meaning}
                        </p>
                    )}
                    {draft.guardrail && (
                        <p>
                            <strong>Caution:</strong> {draft.guardrail}
                        </p>
                    )}
                    {draft.nextQuestion && (
                        <p>
                            <strong>Next:</strong> {draft.nextQuestion}
                        </p>
                    )}
                </div>

                <p className="study-assistant-draft-meta">
                    Confidence: {draft.confidence}
                    {draft.citations?.length > 0 && (
                        <em>Uses {draft.citations.join(', ')}</em>
                    )}
                    {draft.unstructured && (
                        <em>Cleaned plain text</em>
                    )}
                </p>

                {audit && <LocalDraftAudit audit={audit} />}
            </details>

            {canUseDraft && (
                <div className="study-background-actions" aria-label={`Use ${title}`}>
                    <button
                        type="button"
                        className="study-selection-action primary"
                        onClick={handleUseDraft}
                    >
                        Use draft
                    </button>
                    {draft.mainThought && (
                        <button
                            type="button"
                            className="study-selection-action"
                            onClick={() => onUseField('summary', draft.mainThought)}
                        >
                            Main thought
                        </button>
                    )}
                    {draft.context && (
                        <button
                            type="button"
                            className="study-selection-action"
                            onClick={() => onUseField('context', draft.context)}
                        >
                            Context
                        </button>
                    )}
                    {draft.meaning && (
                        <button
                            type="button"
                            className="study-selection-action"
                            onClick={() => onUseField('meaning', draft.meaning)}
                        >
                            Meaning
                        </button>
                    )}
                    {draft.guardrail && (
                        <button
                            type="button"
                            className="study-selection-action"
                            onClick={() => onUseField('guardrail', draft.guardrail)}
                        >
                            Caution
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function ObservationList({
    observations,
    onRemoveObservation,
    selectedId,
    onSelectObservation,
    workStage = 'interpret',
}) {
    if (!observations.length) {
        return (
            <p className="study-mode-empty">
                Your saved observations will collect here as you notice, wonder, and mark what matters.
            </p>
        );
    }

    return (
        <div className="study-observation-list">
            {observations.map(observation => {
                const selectable = !!onSelectObservation;
                const body = (
                    <>
                        <div className="study-observation-meta">
                            <span>{getObservationTypeLabel(observation.type)}</span>
                            <span>{getObservationDisplayReference(observation)}</span>
                        </div>
                        <p className="study-observation-quote">&ldquo;{observation.quote}&rdquo;</p>
                        {observation.note && (
                            <p className="study-observation-note">{observation.note}</p>
                        )}
                        {observation.type === 'repeated-word' && observation.relatedSelections?.length > 1 && (
                            <p className="study-observation-detail">
                                {observation.relatedSelections.length} linked uses in this chapter.
                            </p>
                        )}
                        {observation.contrast?.sideA?.length && observation.contrast?.sideB?.length ? (
                            <p className="study-observation-detail">
                                {getSelectionQuote(observation.contrast.sideA)} contrasts with {getSelectionQuote(observation.contrast.sideB)}
                            </p>
                        ) : null}
                        {selectable && (
                            <p className="study-observation-detail">
                                {workStage === 'apply' ? 'Apply' : 'Interpret'} {getObservationWorkStatus(observation, workStage)}
                            </p>
                        )}
                    </>
                );

                return (
                <article
                    key={observation.id}
                    className={`study-observation type-${observation.type} ${selectedId === observation.id ? 'selected' : ''}`.trim()}
                >
                    {selectable ? (
                        <button
                            type="button"
                            className="study-observation-body"
                            onClick={() => onSelectObservation(observation.id)}
                            aria-pressed={selectedId === observation.id}
                        >
                            {body}
                        </button>
                    ) : (
                        <div className="study-observation-body">
                            {body}
                        </div>
                    )}
                    {onRemoveObservation && (
                        <button
                            className="study-observation-remove"
                            onClick={() => onRemoveObservation(observation.id)}
                            aria-label={`Remove ${getObservationTypeLabel(observation.type)} observation`}
                        >
                            &times;
                        </button>
                    )}
                </article>
                );
            })}
        </div>
    );
}

function ContextCards({ book, chapter, focusVerse }) {
    const contextVerses = getContextVerses(chapter, focusVerse);
    const genre = getBookGenre(book?.id);

    return (
        <div className="study-context-grid">
            <section className="study-context-card">
                <span className="study-context-card-label">Genre</span>
                <strong>{genre}</strong>
                <p>Let the kind of writing shape what counts as evidence.</p>
            </section>
            <section className="study-context-card">
                <span className="study-context-card-label">Local context</span>
                <div className="study-context-verses">
                    {contextVerses.map(verse => (
                        <p key={verse.verse}>
                            <sup>{verse.verse}</sup> {verse.text}
                        </p>
                    ))}
                </div>
            </section>
        </div>
    );
}

function ObservationWorkbenchHeader({ observation, stage }) {
    const meaning = observation?.interpretation?.summary || observation?.interpretation?.meaning;

    return (
        <section className="study-workbench-anchor">
            <span className="study-context-card-label">
                {stage === 'apply' ? 'Applying' : 'Interpreting'}
            </span>
            <p className="study-workbench-reference">
                {getObservationTypeLabel(observation.type)} &middot; {getObservationDisplayReference(observation)}
            </p>
            <blockquote>&ldquo;{observation.quote}&rdquo;</blockquote>
            {observation.note && (
                <p className="study-workbench-note">{observation.note}</p>
            )}
            {stage === 'apply' && (
                <div className="study-workbench-meaning">
                    <span>Meaning so far</span>
                    <p>{meaning || 'Write a one-sentence interpretation first, then respond from that meaning.'}</p>
                </div>
            )}
        </section>
    );
}

function mergeHelperText(current = '', next = '') {
    const cleanNext = next.trim();
    const cleanCurrent = current.trim();
    if (!cleanNext) return current;
    if (cleanCurrent.includes(cleanNext)) return current;
    return cleanCurrent ? `${cleanCurrent}\n\n${cleanNext}` : cleanNext;
}

function BackgroundGuideCard({ observation, interpretation, bibles, book, chapter, onHelperChange }) {
    const guide = getBackgroundGuideForObservation(observation);
    const localDraftRequestRef = useRef(0);
    const [localDraftState, setLocalDraftState] = useState({
        status: 'idle',
        progress: '',
        draft: null,
        error: '',
    });
    const [staticGroundingState, setStaticGroundingState] = useState({
        key: '',
        status: 'idle',
        grounding: null,
    });
    const [selectedLocalModelId, setSelectedLocalModelId] = useState(LOCAL_STUDY_SLM_MODEL_ID);
    const chapterNumber = chapter?.chapter;
    const routeId = guide?.routeId ?? '';
    const routeLabel = guide?.routeLabel ?? '';
    const staticGroundingKey = guide
        ? [
            observation?.id,
            observation?.quote,
            observation?.note,
            observation?.reference,
            routeId,
            book?.name,
            chapterNumber,
        ].join('|')
        : '';

    useEffect(() => {
        localDraftRequestRef.current += 1;
        setLocalDraftState({
            status: 'idle',
            progress: '',
            draft: null,
            error: '',
        });
    }, [observation?.id, selectedLocalModelId]);

    useEffect(() => {
        if (!guide || !routeId || !book?.name || !chapterNumber) {
            setStaticGroundingState({
                key: '',
                status: 'idle',
                grounding: null,
            });
            return undefined;
        }

        let cancelled = false;
        setStaticGroundingState({
            key: staticGroundingKey,
            status: 'loading',
            grounding: null,
        });

        getLocalStudyGroundingWithStaticPacks({
            observation,
            route: {
                id: routeId,
                label: routeLabel,
            },
            scope: {
                bookName: book.name,
                chapterNumber,
            },
        }).then((grounding) => {
            if (cancelled) return;
            setStaticGroundingState({
                key: staticGroundingKey,
                status: 'ready',
                grounding,
            });
        }).catch(() => {
            if (cancelled) return;
            setStaticGroundingState({
                key: staticGroundingKey,
                status: 'error',
                grounding: null,
            });
        });

        return () => {
            cancelled = true;
        };
    }, [
        book?.name,
        chapterNumber,
        observation?.id,
        observation?.note,
        observation?.quote,
        observation?.reference,
        observation?.type,
        routeId,
        routeLabel,
        staticGroundingKey,
    ]);

    if (!guide) return null;

    const staticGrounding = staticGroundingState.key === staticGroundingKey
        ? staticGroundingState.grounding
        : null;
    const activeGuide = staticGrounding
        ? {
            ...guide,
            grounding: staticGrounding,
            sourceFindings: staticGrounding.sourceFindings,
            citations: staticGrounding.citations,
        }
        : guide;
    const capabilities = getLocalStudyCapabilities();
    const sourceFindings = activeGuide.sourceFindings ?? [];
    const sourceCount = sourceFindings.length;
    const isLoadingStaticGrounding = staticGroundingState.key === staticGroundingKey
        && staticGroundingState.status === 'loading';
    const canDraftLocally = capabilities.localSlmAvailable && sourceCount > 0;
    const isDraftingLocally = localDraftState.status === 'loading';
    const selectedLocalModel = LOCAL_STUDY_SLM_MODELS.find(model => (
        model.id === selectedLocalModelId
    )) ?? LOCAL_STUDY_SLM_MODELS[0];
    const groundedDraft = buildGroundedStudyDraft(activeGuide.grounding.synthesisRequest);
    const localDraft = localDraftState.draft;
    const localDraftHasFields = !!(
        localDraft?.context ||
        localDraft?.meaning ||
        localDraft?.guardrail ||
        localDraft?.nextQuestion
    );
    const localDraftIsRawOnly = !!(localDraft?.unstructured && !localDraftHasFields);
    const hasUsableLocalDraft = !!(localDraft && localDraftHasFields && !localDraftIsRawOnly);
    const localDraftAudit = localDraft
        ? auditLocalStudyDraft(localDraft, activeGuide.grounding.synthesisRequest, { bibles })
        : null;
    const groundedDraftAudit = groundedDraft
        ? auditLocalStudyDraft(groundedDraft, activeGuide.grounding.synthesisRequest, { bibles })
        : null;
    const primaryDraft = hasUsableLocalDraft ? localDraft : groundedDraft;
    const primaryDraftAudit = hasUsableLocalDraft ? localDraftAudit : groundedDraftAudit;
    const localModelMessage = capabilities.localSlmRecommended
        ? `Use ${selectedLocalModel.label} for a second pass on this device.`
        : capabilities.localSlmRisk === 'ios-webgpu-memory-risk'
            ? `${selectedLocalModel.label} can run here, but phone browsers may reload during model loading.`
            : 'This browser needs WebGPU before local model drafting can run.';

    const handleUseDraft = (key, value) => {
        onHelperChange(key, mergeHelperText(interpretation?.[key], value));
    };

    const handleDraftLocally = async () => {
        if (!canDraftLocally || isDraftingLocally) return;

        const requestId = localDraftRequestRef.current + 1;
        localDraftRequestRef.current = requestId;

        setLocalDraftState({
            status: 'loading',
            progress: 'Preparing local model...',
            draft: null,
            error: '',
        });

        try {
            const draft = await draftLocalStudySynthesis({
                synthesisRequest: activeGuide.grounding.synthesisRequest,
                modelId: selectedLocalModelId,
                onProgress: (progress) => {
                    if (localDraftRequestRef.current !== requestId) return;

                    setLocalDraftState(current => ({
                        ...current,
                        progress: progress.percent
                            ? `${progress.text} ${progress.percent}%`
                            : progress.text,
                    }));
                },
            });

            if (localDraftRequestRef.current !== requestId) return;

            setLocalDraftState({
                status: 'ready',
                progress: '',
                draft,
                error: '',
            });
        } catch (error) {
            if (localDraftRequestRef.current !== requestId) return;

            setLocalDraftState({
                status: 'error',
                progress: '',
                draft: null,
                error: error instanceof Error
                    ? error.message
                    : 'Local synthesis was not available on this device.',
            });
        }
    };

    return (
        <section className="study-assistant-card">
            <div className="study-assistant-top">
                <div>
                    <span className="study-context-card-label">
                        Interpret helper
                    </span>
                    <strong>{activeGuide.title}</strong>
                    <p>Start with the passage, then widen only as the sources help the question.</p>
                </div>
                <div className="study-assistant-status" aria-label="Assistant grounding status">
                    <span>
                        {isLoadingStaticGrounding
                            ? 'Loading chapter sources'
                            : `${sourceCount} source card${sourceCount === 1 ? '' : 's'}`}
                    </span>
                    <span>Bible refs checked</span>
                    <span>{hasUsableLocalDraft ? 'Local draft' : 'Curated draft'}</span>
                </div>
            </div>

            {primaryDraft ? (
                <StudyDraftCard
                    draft={primaryDraft}
                    title={hasUsableLocalDraft ? 'Local model pass' : 'Suggested path'}
                    kicker={hasUsableLocalDraft ? selectedLocalModel.label : 'Passage-first'}
                    note={hasUsableLocalDraft
                        ? 'Generated on this device, then checked against the local Bible and retrieved evidence.'
                        : 'Built from the selected passage and the strongest retrieved source cards.'}
                    audit={primaryDraftAudit}
                    sourceFindings={sourceFindings}
                    sourceLoading={isLoadingStaticGrounding}
                    onUseField={handleUseDraft}
                />
            ) : (
                <p className="study-background-note">
                    This helper has a route for the question, but no source-backed draft yet.
                </p>
            )}

            <details className="study-assistant-details">
                <summary>Optional local model</summary>
                <div className="study-assistant-local">
                    <div>
                        <span>Local model pass</span>
                        <p>{localModelMessage}</p>
                        {localDraftState.progress && (
                            <p>{localDraftState.progress}</p>
                        )}
                        {localDraftState.error && (
                            <p>{localDraftState.error}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="study-selection-action"
                        onClick={handleDraftLocally}
                        disabled={!canDraftLocally || isDraftingLocally}
                    >
                        {isDraftingLocally
                            ? 'Drafting...'
                            : hasUsableLocalDraft
                                ? 'Refresh draft'
                                : 'Draft locally'}
                    </button>
                </div>

                {capabilities.webGpu && (
                    <div className="study-assistant-settings">
                        <label className="study-local-model-control">
                            <span>Local model</span>
                            <select
                                value={selectedLocalModelId}
                                onChange={(event) => setSelectedLocalModelId(event.target.value)}
                                disabled={isDraftingLocally || !capabilities.localSlmAvailable}
                            >
                                {LOCAL_STUDY_SLM_MODELS.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.label} · {model.description}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}
            </details>

            {localDraftIsRawOnly && (
                <details className="study-assistant-diagnostic" open>
                    <summary>Local response kept out of the draft</summary>
                    <p>The model returned text that was not safe to promote into the interpretation fields.</p>
                    <pre className="study-local-raw-response">{localDraft.rawText}</pre>
                </details>
            )}

            {hasUsableLocalDraft && groundedDraft && (
                <details className="study-assistant-details">
                    <summary>Curated fallback draft</summary>
                    <StudyDraftCard
                        draft={groundedDraft}
                        title="Suggested draft"
                        kicker="Passage-first"
                        note="This deterministic draft remains available if the local model wanders."
                        audit={groundedDraftAudit}
                        sourceFindings={sourceFindings}
                        onUseField={handleUseDraft}
                    />
                </details>
            )}

            <details className="study-assistant-details">
                <summary>Evidence and method</summary>
                <div className="study-background-section">
                    <span>Route</span>
                    <p>
                        <strong>{activeGuide.routeLabel}:</strong> {activeGuide.subtitle}
                    </p>
                    <p>
                        <strong>Why:</strong> {activeGuide.reason}
                    </p>
                </div>

                {!activeGuide.exact && (
                    <p className="study-background-note">
                        We do not have a curated source card for this exact item yet, so this helper gives a careful research path instead of a finished answer.
                    </p>
                )}

                <div className="study-background-section">
                    <span>Local context</span>
                    {activeGuide.contextNotes.map(note => (
                        <p key={note}>{note}</p>
                    ))}
                </div>

                <div className="study-background-section">
                    <span>Trusted source notes</span>
                    {activeGuide.sourceNotes.map(note => (
                        <p key={`${note.label}-${note.text}`}>
                            <strong>{note.label}:</strong> {note.text}
                            {note.href && (
                                <>
                                    {' '}
                                    <a href={note.href} target="_blank" rel="noreferrer">
                                        {note.sourceLabel}
                                    </a>
                                </>
                            )}
                            {note.sourceLabel && !note.href && (
                                <em> {note.sourceLabel}</em>
                            )}
                        </p>
                    ))}
                </div>

                {sourceFindings.length > 0 && (
                    <div className="study-background-section">
                        <span>How sources are used</span>
                        {getVisibleSourceUses(sourceFindings).map(finding => (
                            <p key={`use-${finding.id}`}>
                                <strong>{getSourceRole(finding)}:</strong> {getSourceUseText(finding)}
                            </p>
                        ))}
                    </div>
                )}

                {sourceFindings.length > 0 && (
                    <div className="study-background-section">
                        <span>Retrieved source cards</span>
                        {sourceFindings.map(finding => (
                            <p key={finding.id}>
                                <strong>{finding.title}:</strong> {finding.text}
                                {finding.crossReferences?.length > 0 && (
                                    <em>
                                        {' '}
                                        Leads: {finding.crossReferences
                                            .slice(0, 4)
                                            .map(item => item.reference)
                                            .join(', ')}
                                    </em>
                                )}
                                {finding.source?.href && (
                                    <>
                                        {' '}
                                        <a href={finding.source.href} target="_blank" rel="noreferrer">
                                            {finding.source.label}
                                        </a>
                                    </>
                                )}
                                {finding.source && (
                                    <em> {finding.source.license}</em>
                                )}
                            </p>
                        ))}
                    </div>
                )}

                <div className="study-background-section">
                    <span>Careful synthesis</span>
                    {activeGuide.synthesis.map(note => (
                        <p key={note}>{note}</p>
                    ))}
                </div>

                <div className="study-background-section">
                    <span>Grounding</span>
                    <p>
                        <strong>Loaded pack:</strong> {activeGuide.grounding.version}
                    </p>
                </div>
            </details>
        </section>
    );
}

function InterpretWorkbench({
    book,
    bibles,
    chapter,
    observations,
    activeObservation,
    activeObservationId,
    onSelectObservation,
    onUpdateObservation,
    interpretValue,
    onInterpretChange,
}) {
    if (!observations.length) {
        return (
            <p className="study-mode-empty">
                Save at least one observation first. Interpretation starts with something you noticed in the passage.
            </p>
        );
    }

    const interpretation = activeObservation?.interpretation ?? {};
    const handleHelperChange = (key, value) => {
        onUpdateObservation?.(activeObservation.id, {
            interpretation: { [key]: value },
        });
    };

    return (
        <>
            <ObservationList
                observations={observations}
                selectedId={activeObservationId}
                onSelectObservation={onSelectObservation}
                workStage="interpret"
            />
            <div className="study-workbench">
                <ObservationWorkbenchHeader observation={activeObservation} stage="interpret" />
                <ContextCards book={book} chapter={chapter} focusVerse={activeObservation.verse} />
                <BackgroundGuideCard
                    observation={activeObservation}
                    interpretation={interpretation}
                    bibles={bibles}
                    book={book}
                    chapter={chapter}
                    onHelperChange={handleHelperChange}
                />
                <div className="study-helper-stack">
                    {INTERPRET_HELPERS.map(helper => (
                        <HelperField
                            key={helper.key}
                            helper={helper}
                            value={interpretation[helper.key]}
                            onChange={(value) => handleHelperChange(helper.key, value)}
                        />
                    ))}
                </div>
            </div>
            <StudyTextArea
                label="Chapter interpretation notes"
                value={interpretValue}
                placeholder="Pull the strongest meanings together for the passage."
                onChange={onInterpretChange}
            />
        </>
    );
}

function ApplicationWorkbench({
    observations,
    activeObservation,
    activeObservationId,
    onSelectObservation,
    onUpdateObservation,
    applyValue,
    onApplyChange,
}) {
    if (!observations.length) {
        return (
            <p className="study-mode-empty">
                Save at least one observation first. Application responds to interpreted meaning, not first impressions.
            </p>
        );
    }

    const application = activeObservation?.application ?? {};
    const handleHelperChange = (key, value) => {
        onUpdateObservation?.(activeObservation.id, {
            application: { [key]: value },
        });
    };

    return (
        <>
            <ObservationList
                observations={observations}
                selectedId={activeObservationId}
                onSelectObservation={onSelectObservation}
                workStage="apply"
            />
            <div className="study-workbench">
                <ObservationWorkbenchHeader observation={activeObservation} stage="apply" />
                <div className="study-helper-stack">
                    {APPLICATION_HELPERS.map(helper => (
                        <HelperField
                            key={helper.key}
                            helper={helper}
                            value={application[helper.key]}
                            onChange={(value) => handleHelperChange(helper.key, value)}
                        />
                    ))}
                </div>
            </div>
            <StudyTextArea
                label="Chapter application notes"
                value={applyValue}
                placeholder="What response does this passage call for?"
                onChange={onApplyChange}
            />
        </>
    );
}

export default function StudyMode({
    book,
    bibles = [],
    chapter,
    reference,
    study,
    stage,
    selection = [],
    workflow,
    onStageChange,
    onAddObservation,
    onClearSelection,
    onStartContrast,
    onCancelWorkflow,
    onRemoveObservation,
    onUpdateObservation,
    onSaveFields,
    onDeleteStudy,
    onClose,
}) {
    const observations = study?.observations ?? [];
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [trayOpen, setTrayOpen] = useState(() => !prefersCompactStudyTray());
    const [activeObservationId, setActiveObservationId] = useState(null);

    useEffect(() => {
        setDraft({
            observe: study?.observe ?? '',
            interpret: study?.interpret ?? '',
            apply: study?.apply ?? '',
        });
    }, [reference, study?.observe, study?.interpret, study?.apply]);

    useEffect(() => {
        setTrayOpen(!prefersCompactStudyTray());
    }, [reference]);

    useEffect(() => {
        if (!observations.length) {
            setActiveObservationId(null);
            return;
        }

        if (!observations.some(observation => observation.id === activeObservationId)) {
            setActiveObservationId(observations[0].id);
        }
    }, [activeObservationId, observations]);

    useEffect(() => {
        if (stage === 'observe' && observations[0]?.id) {
            setActiveObservationId(observations[0].id);
        }
    }, [observations, stage]);

    const currentStage = STUDY_STAGES.find(item => item.id === stage) ?? STUDY_STAGES[0];
    const activeObservation = observations.find(item => item.id === activeObservationId) ?? observations[0] ?? null;
    const hasStudyContent = !!(
        observations.length
        || draft.observe.trim()
        || draft.interpret.trim()
        || draft.apply.trim()
    );

    const handleFieldChange = (field, value) => {
        setDraft(prev => ({ ...prev, [field]: value }));
        onSaveFields?.({ [field]: value });
    };

    const handleStageSelect = (nextStage) => {
        onStageChange?.(nextStage);
        setTrayOpen(nextStage !== 'observe' || !prefersCompactStudyTray());
    };

    return (
        <>
            <header className="study-toolbar">
                <button className="study-toolbar-close" onClick={onClose} aria-label="Close study mode">
                    &times;
                </button>
                <div className="study-toolbar-title">
                    <span>Guided study</span>
                    <strong>{reference}</strong>
                </div>
                <div className="study-stage-tabs" role="tablist" aria-label="Study stage">
                    {STUDY_STAGES.map(item => (
                        <button
                            key={item.id}
                            className={`study-stage-tab ${stage === item.id ? 'active' : ''}`}
                            onClick={() => handleStageSelect(item.id)}
                            aria-selected={stage === item.id}
                            role="tab"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </header>

            <aside className={`study-tray ${trayOpen ? 'expanded' : 'collapsed'} stage-${stage}`}>
                <button
                    className="study-tray-handle"
                    onClick={() => setTrayOpen(open => !open)}
                    aria-expanded={trayOpen}
                >
                    <span>{currentStage.label}</span>
                    <span>{observations.length} marks</span>
                </button>

                <div className="study-tray-content">
                    <p className="study-stage-prompt">{currentStage.prompt}</p>

                    {stage === 'observe' && (
                        <div className="study-stage-panel">
                            <div className="study-tray-selection-panel">
                                <StudySelectionPanel
                                    selection={selection}
                                    workflow={workflow}
                                    showEmpty
                                    onAddObservation={onAddObservation}
                                    onClearSelection={onClearSelection}
                                    onStartContrast={onStartContrast}
                                    onCancelWorkflow={onCancelWorkflow}
                                />
                            </div>
                            <StudyTextArea
                                className="study-observe-notes-field"
                                label="Observation notes"
                                value={draft.observe}
                                placeholder="Patterns, structure, tensions, details."
                                onChange={(value) => handleFieldChange('observe', value)}
                            />
                            <ObservationList
                                observations={observations}
                                onRemoveObservation={onRemoveObservation}
                            />
                        </div>
                    )}

                    {stage === 'interpret' && (
                        <div className="study-stage-panel">
                            <InterpretWorkbench
                                book={book}
                                bibles={bibles}
                                chapter={chapter}
                                observations={observations}
                                activeObservation={activeObservation}
                                activeObservationId={activeObservation?.id}
                                onSelectObservation={setActiveObservationId}
                                onUpdateObservation={onUpdateObservation}
                                interpretValue={draft.interpret}
                                onInterpretChange={(value) => handleFieldChange('interpret', value)}
                            />
                        </div>
                    )}

                    {stage === 'apply' && (
                        <div className="study-stage-panel">
                            <ApplicationWorkbench
                                observations={observations}
                                activeObservation={activeObservation}
                                activeObservationId={activeObservation?.id}
                                onSelectObservation={setActiveObservationId}
                                onUpdateObservation={onUpdateObservation}
                                applyValue={draft.apply}
                                onApplyChange={(value) => handleFieldChange('apply', value)}
                            />
                        </div>
                    )}

                    {hasStudyContent && (
                        <footer className="study-mode-footer">
                            <button className="study-clear" onClick={onDeleteStudy}>
                                Clear study
                            </button>
                        </footer>
                    )}
                </div>
            </aside>
        </>
    );
}
