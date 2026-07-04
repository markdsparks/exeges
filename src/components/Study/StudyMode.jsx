import { useEffect, useRef, useState } from 'react';
import {
    STUDY_STAGES,
    getBookGenre,
    getObservationTypeLabel,
    getSelectionQuote,
} from '../../lib/studyMethod';
import { getBackgroundGuideForObservation } from '../../lib/backgroundGuides';
import { getLocalStudyCapabilities } from '../../lib/localStudyGrounding';
import { LOCAL_STUDY_SLM_MODEL_ID, draftLocalStudySynthesis } from '../../lib/localStudySynthesis';
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

function BackgroundGuideCard({ observation, interpretation, onHelperChange }) {
    const guide = getBackgroundGuideForObservation(observation);
    const localDraftRequestRef = useRef(0);
    const [localDraftState, setLocalDraftState] = useState({
        status: 'idle',
        progress: '',
        draft: null,
        error: '',
    });

    useEffect(() => {
        localDraftRequestRef.current += 1;
        setLocalDraftState({
            status: 'idle',
            progress: '',
            draft: null,
            error: '',
        });
    }, [observation?.id]);

    if (!guide) return null;

    const capabilities = getLocalStudyCapabilities();
    const sourceFindings = guide.sourceFindings ?? [];
    const sourceCount = sourceFindings.length;
    const canDraftLocally = capabilities.webGpu && sourceCount > 0;
    const isDraftingLocally = localDraftState.status === 'loading';
    const localDraft = localDraftState.draft;
    const localDraftMeaning = localDraft?.meaning || (localDraft?.unstructured ? localDraft.rawText : '');

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
                synthesisRequest: guide.grounding.synthesisRequest,
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
        <section className="study-background-card">
            <div className="study-background-heading">
                <span className="study-context-card-label">
                    {guide.exact ? 'Grounded help' : 'Study path'}
                </span>
                <strong>{guide.title}</strong>
                <p>{guide.subtitle}</p>
            </div>

            <div className="study-background-route">
                <span>{guide.routeLabel}</span>
                <p>{guide.reason}</p>
            </div>

            <div className="study-background-grounding">
                <span>
                    Local grounding &middot; {sourceCount} chunk{sourceCount === 1 ? '' : 's'}
                </span>
                <p>
                    {sourceCount
                        ? 'This helper is using local source-pack retrieval before any model synthesis.'
                        : 'No local source chunks matched yet; keep this as a method prompt until the source pack grows.'}
                </p>
                <p>
                    {capabilities.webGpu
                        ? 'This device exposes WebGPU, and the helper now prepares a grounded packet for future on-device SLM synthesis.'
                        : 'This device is running retrieval-only guidance until local SLM support is available.'}
                </p>
            </div>

            <div className="study-local-synthesis">
                <div>
                    <span>Experimental local draft</span>
                    <p>
                        {capabilities.webGpu
                            ? `Uses ${LOCAL_STUDY_SLM_MODEL_ID} on this device and only the retrieved chunks above.`
                            : 'This browser needs WebGPU before it can run a local study model.'}
                    </p>
                    {localDraftState.progress && (
                        <p>{localDraftState.progress}</p>
                    )}
                    {localDraftState.error && (
                        <p>{localDraftState.error}</p>
                    )}
                </div>
                <button
                    type="button"
                    className="study-selection-action primary"
                    onClick={handleDraftLocally}
                    disabled={!canDraftLocally || isDraftingLocally}
                >
                    {isDraftingLocally ? 'Drafting...' : 'Draft locally'}
                </button>
            </div>

            {localDraft && (
                <div className="study-background-section study-local-draft">
                    <span>Local model draft</span>
                    {localDraft.unstructured && (
                        <>
                            <p className="study-local-draft-note">
                                Raw local response shown for testing because the model skipped the requested structure.
                            </p>
                            <pre className="study-local-raw-response">{localDraft.rawText}</pre>
                        </>
                    )}
                    {!localDraft.unstructured && localDraft.context && (
                        <p>
                            <strong>Context:</strong> {localDraft.context}
                        </p>
                    )}
                    {!localDraft.unstructured && localDraft.meaning && (
                        <p>
                            <strong>Meaning:</strong> {localDraft.meaning}
                        </p>
                    )}
                    {!localDraft.unstructured && localDraft.guardrail && (
                        <p>
                            <strong>Guardrail:</strong> {localDraft.guardrail}
                        </p>
                    )}
                    {!localDraft.unstructured && localDraft.nextQuestion && (
                        <p>
                            <strong>Next question:</strong> {localDraft.nextQuestion}
                        </p>
                    )}
                    <p>
                        <strong>Confidence:</strong> {localDraft.confidence}
                        {localDraft.unstructured && (
                            <em> Raw response</em>
                        )}
                        {localDraft.citations.length > 0 && (
                            <em> Uses {localDraft.citations.join(', ')}</em>
                        )}
                    </p>
                    <div className="study-background-actions" aria-label="Use local model draft">
                        {localDraft.context && (
                            <button
                                type="button"
                                className="study-selection-action primary"
                                onClick={() => handleUseDraft('context', localDraft.context)}
                            >
                                Add context
                            </button>
                        )}
                        {localDraftMeaning && (
                            <button
                                type="button"
                                className="study-selection-action"
                                onClick={() => handleUseDraft('meaning', localDraftMeaning)}
                            >
                                {localDraft.unstructured ? 'Add raw draft' : 'Add meaning'}
                            </button>
                        )}
                        {localDraft.guardrail && (
                            <button
                                type="button"
                                className="study-selection-action"
                                onClick={() => handleUseDraft('guardrail', localDraft.guardrail)}
                            >
                                Add caution
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!guide.exact && (
                <p className="study-background-note">
                    We do not have a curated source card for this exact item yet, so this helper gives a careful research path instead of a finished answer.
                </p>
            )}

            <div className="study-background-section">
                <span>Local context</span>
                {guide.contextNotes.map(note => (
                    <p key={note}>{note}</p>
                ))}
            </div>

            <div className="study-background-section">
                <span>Trusted source notes</span>
                {guide.sourceNotes.map(note => (
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
                    <span>Retrieved source chunks</span>
                    {sourceFindings.map(finding => (
                        <p key={finding.id}>
                            <strong>{finding.title}:</strong> {finding.text}
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
                {guide.synthesis.map(note => (
                    <p key={note}>{note}</p>
                ))}
            </div>

            <div className="study-background-actions" aria-label="Use grounded help">
                {guide.contextDraft && (
                    <button
                        type="button"
                        className="study-selection-action primary"
                        onClick={() => handleUseDraft('context', guide.contextDraft)}
                    >
                        Add to context
                    </button>
                )}
                {guide.meaningDraft && (
                    <button
                        type="button"
                        className="study-selection-action"
                        onClick={() => handleUseDraft('meaning', guide.meaningDraft)}
                    >
                        Add to meaning
                    </button>
                )}
                {guide.guardrailDraft && (
                    <button
                        type="button"
                        className="study-selection-action"
                        onClick={() => handleUseDraft('guardrail', guide.guardrailDraft)}
                    >
                        Add caution
                    </button>
                )}
            </div>
        </section>
    );
}

function InterpretWorkbench({
    book,
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
