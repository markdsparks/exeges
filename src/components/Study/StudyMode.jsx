import { useEffect, useMemo, useState } from 'react';
import {
    OBSERVATION_PROMPTS,
    OBSERVATION_TYPES,
    STUDY_STAGES,
    getBookGenre,
    getObservationTypeLabel,
    getSelectionQuote,
    getSelectionReference,
    getUniqueSelectionWords,
    sortSelectionItems,
} from '../../lib/studyMethod';

const EMPTY_DRAFT = {
    observe: '',
    interpret: '',
    apply: '',
};

function getContextVerses(chapter, focusVerse) {
    const verses = chapter?.verses ?? [];
    if (!verses.length) return [];

    const index = verses.findIndex(item => item.verse === focusVerse);
    if (index === -1) return verses.slice(0, Math.min(3, verses.length));

    return verses.slice(Math.max(0, index - 1), Math.min(verses.length, index + 2));
}

function StudyTextArea({ label, value, placeholder, onChange }) {
    return (
        <label className="study-mode-field">
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

function SelectionChips({ items, sideA = [], sideB = [], onAssignSide }) {
    const sideAIds = new Set(sideA.map(item => item.id));
    const sideBIds = new Set(sideB.map(item => item.id));

    return (
        <div className="study-selection-chips">
            {sortSelectionItems(items).map(item => (
                <span key={item.id} className="study-selection-chip">
                    {item.text}
                    {onAssignSide && (
                        <span className="study-chip-actions">
                            <button
                                className={sideAIds.has(item.id) ? 'active' : ''}
                                onClick={() => onAssignSide(item, 'sideA')}
                                aria-label={`Assign ${item.text} to contrast side A`}
                            >
                                A
                            </button>
                            <button
                                className={sideBIds.has(item.id) ? 'active' : ''}
                                onClick={() => onAssignSide(item, 'sideB')}
                                aria-label={`Assign ${item.text} to contrast side B`}
                            >
                                B
                            </button>
                        </span>
                    )}
                </span>
            ))}
        </div>
    );
}

function ObservationList({ observations, onRemoveObservation }) {
    if (!observations.length) {
        return (
            <p className="study-mode-empty">
                Begin with repeated words, contrasts, commands, questions, structure, people, places.
            </p>
        );
    }

    return (
        <div className="study-observation-list">
            {observations.map(observation => (
                <article key={observation.id} className={`study-observation type-${observation.type}`}>
                    <div className="study-observation-meta">
                        <span>{getObservationTypeLabel(observation.type)}</span>
                        <span>v{observation.verse}</span>
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
                    <button
                        className="study-observation-remove"
                        onClick={() => onRemoveObservation?.(observation.id)}
                        aria-label={`Remove ${getObservationTypeLabel(observation.type)} observation`}
                    >
                        &times;
                    </button>
                </article>
            ))}
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
    onSelectSameWord,
    onStartContrast,
    onCancelWorkflow,
    onRemoveObservation,
    onSaveFields,
    onDeleteStudy,
    onClose,
}) {
    const observations = study?.observations ?? [];
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [trayOpen, setTrayOpen] = useState(true);
    const [pendingObservation, setPendingObservation] = useState(null);
    const [contrastChoice, setContrastChoice] = useState(null);
    const [contrastSplit, setContrastSplit] = useState({ sideA: [], sideB: [] });

    useEffect(() => {
        setDraft({
            observe: study?.observe ?? '',
            interpret: study?.interpret ?? '',
            apply: study?.apply ?? '',
        });
    }, [reference, study?.observe, study?.interpret, study?.apply]);

    useEffect(() => {
        setTrayOpen(true);
        setPendingObservation(null);
        setContrastChoice(null);
        setContrastSplit({ sideA: [], sideB: [] });
    }, [reference]);

    const currentStage = STUDY_STAGES.find(item => item.id === stage) ?? STUDY_STAGES[0];
    const focusVerse = selection[0]?.verse ?? observations[0]?.verse ?? chapter?.verses?.[0]?.verse ?? 1;
    const selectionQuote = getSelectionQuote(selection);
    const selectionReference = getSelectionReference(selection);
    const uniqueWords = getUniqueSelectionWords(selection);
    const canSelectSame = uniqueWords.length === 1;
    const hasStudyContent = !!(
        observations.length
        || draft.observe.trim()
        || draft.interpret.trim()
        || draft.apply.trim()
    );

    const observationCounts = useMemo(() => {
        return observations.reduce((counts, observation) => {
            counts[observation.type] = (counts[observation.type] ?? 0) + 1;
            return counts;
        }, {});
    }, [observations]);

    const handleFieldChange = (field, value) => {
        setDraft(prev => ({ ...prev, [field]: value }));
        onSaveFields?.({ [field]: value });
    };

    const handleAddObservation = (type) => {
        if (!selection.length) return;

        if (type === 'contrast') {
            if (selection.length === 1) {
                onStartContrast?.(selection);
                setContrastChoice(null);
                return;
            }

            setContrastChoice('ambiguous');
            setPendingObservation(null);
            return;
        }

        if (OBSERVATION_PROMPTS[type]) {
            setPendingObservation({ type, note: '' });
            setContrastChoice(null);
            return;
        }

        onAddObservation?.({ type, selections: selection });
        setPendingObservation(null);
        setContrastChoice(null);
    };

    const handleSavePendingObservation = () => {
        if (!pendingObservation) return;

        onAddObservation?.({
            type: pendingObservation.type,
            selections: selection,
            note: pendingObservation.note,
        });
        setPendingObservation(null);
    };

    const handleAssignContrastSide = (item, side) => {
        setContrastSplit(prev => {
            const otherSide = side === 'sideA' ? 'sideB' : 'sideA';

            return {
                ...prev,
                [side]: prev[side].some(selectionItem => selectionItem.id === item.id)
                    ? prev[side].filter(selectionItem => selectionItem.id !== item.id)
                    : [...prev[side], item],
                [otherSide]: prev[otherSide].filter(selectionItem => selectionItem.id !== item.id),
            };
        });
    };

    const handleSaveSplitContrast = () => {
        if (!contrastSplit.sideA.length || !contrastSplit.sideB.length) return;

        onAddObservation?.({
            type: 'contrast',
            note: '',
            contrast: {
                sideA: contrastSplit.sideA,
                sideB: contrastSplit.sideB,
            },
        });
        setContrastChoice(null);
        setContrastSplit({ sideA: [], sideB: [] });
    };

    const handleSaveWorkflowContrast = () => {
        if (workflow?.type !== 'contrast' || !workflow.sideA?.length || !selection.length) return;

        onAddObservation?.({
            type: 'contrast',
            note: '',
            contrast: {
                sideA: workflow.sideA,
                sideB: selection,
            },
        });
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
                            onClick={() => onStageChange?.(item.id)}
                            aria-selected={stage === item.id}
                            role="tab"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </header>

            <aside className={`study-tray ${trayOpen ? 'expanded' : 'collapsed'}`}>
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
                            {workflow?.type === 'contrast' && (
                                <section className="study-selection-card">
                                    <span className="study-selection-reference">Contrast</span>
                                    <p>
                                        First side: <strong>{getSelectionQuote(workflow.sideA)}</strong>
                                    </p>
                                    <p className="study-selection-help">
                                        Now tap the word or phrase it contrasts with.
                                    </p>
                                    {selection.length > 0 && (
                                        <>
                                            <span className="study-selection-reference">
                                                Second side: {selectionReference}
                                            </span>
                                            <SelectionChips items={selection} />
                                            <div className="study-selection-actions">
                                                <button className="study-selection-action primary" onClick={handleSaveWorkflowContrast}>
                                                    Save contrast
                                                </button>
                                                <button className="study-selection-action" onClick={onClearSelection}>
                                                    Clear second side
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    <button className="study-inline-cancel" onClick={onCancelWorkflow}>
                                        Cancel contrast
                                    </button>
                                </section>
                            )}

                            {selection.length > 0 && !workflow && (
                                <section className="study-selection-card">
                                    <span className="study-selection-reference">
                                        {selection.length} selected · {selectionReference}
                                    </span>
                                    <p>&ldquo;{selectionQuote}&rdquo;</p>
                                    <SelectionChips items={selection} />
                                    <div className="study-selection-tools">
                                        {canSelectSame && (
                                            <button onClick={onSelectSameWord}>
                                                Select all &ldquo;{uniqueWords[0].text}&rdquo;
                                            </button>
                                        )}
                                        <button onClick={onClearSelection}>Deselect all</button>
                                    </div>
                                    <div className="study-selection-actions">
                                        {OBSERVATION_TYPES.map(type => (
                                            <button
                                                key={type.id}
                                                className="study-selection-action"
                                                onClick={() => handleAddObservation(type.id)}
                                                disabled={type.id === 'repeated-word' && uniqueWords.length !== 1}
                                            >
                                                {type.label}
                                                {observationCounts[type.id] ? (
                                                    <span>{observationCounts[type.id]}</span>
                                                ) : null}
                                            </button>
                                        ))}
                                    </div>
                                    {contrastChoice === 'ambiguous' && (
                                        <div className="study-followup-card">
                                            <span className="study-selection-reference">Contrast helper</span>
                                            <p className="study-selection-help">
                                                Did this selection include both sides of the contrast?
                                            </p>
                                            <div className="study-selection-actions">
                                                <button
                                                    className="study-selection-action primary"
                                                    onClick={() => {
                                                        onStartContrast?.(selection);
                                                        setContrastChoice(null);
                                                    }}
                                                >
                                                    Use as first side
                                                </button>
                                                <button
                                                    className="study-selection-action"
                                                    onClick={() => {
                                                        setContrastChoice('split');
                                                        setContrastSplit({ sideA: [], sideB: [] });
                                                    }}
                                                >
                                                    Split into two sides
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {contrastChoice === 'split' && (
                                        <div className="study-followup-card">
                                            <span className="study-selection-reference">Split contrast</span>
                                            <p className="study-selection-help">
                                                Assign selected chips to side A or side B.
                                            </p>
                                            <SelectionChips
                                                items={selection}
                                                sideA={contrastSplit.sideA}
                                                sideB={contrastSplit.sideB}
                                                onAssignSide={handleAssignContrastSide}
                                            />
                                            <div className="study-selection-actions">
                                                <button
                                                    className="study-selection-action primary"
                                                    onClick={handleSaveSplitContrast}
                                                    disabled={!contrastSplit.sideA.length || !contrastSplit.sideB.length}
                                                >
                                                    Save contrast
                                                </button>
                                                <button className="study-selection-action" onClick={() => setContrastChoice(null)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {pendingObservation && (
                                        <div className="study-followup-card">
                                            <span className="study-selection-reference">
                                                {getObservationTypeLabel(pendingObservation.type)}
                                            </span>
                                            <label className="study-followup-field">
                                                <span>{OBSERVATION_PROMPTS[pendingObservation.type]}</span>
                                                <textarea
                                                    value={pendingObservation.note}
                                                    onChange={(event) => setPendingObservation(prev => ({
                                                        ...prev,
                                                        note: event.target.value,
                                                    }))}
                                                />
                                            </label>
                                            <div className="study-selection-actions">
                                                <button
                                                    className="study-selection-action primary"
                                                    onClick={handleSavePendingObservation}
                                                >
                                                    Save observation
                                                </button>
                                                <button className="study-selection-action" onClick={() => setPendingObservation(null)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}
                            {!selection.length && !workflow && (
                                <p className="study-mode-empty">
                                    Tap words in the passage to collect them here. Tap again to deselect.
                                </p>
                            )}
                            <StudyTextArea
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
                            <ContextCards book={book} chapter={chapter} focusVerse={focusVerse} />
                            <ObservationList
                                observations={observations}
                                onRemoveObservation={onRemoveObservation}
                            />
                            <StudyTextArea
                                label="Interpretation"
                                value={draft.interpret}
                                placeholder="What does this mean in context?"
                                onChange={(value) => handleFieldChange('interpret', value)}
                            />
                        </div>
                    )}

                    {stage === 'apply' && (
                        <div className="study-stage-panel">
                            <section className="study-context-card">
                                <span className="study-context-card-label">Interpretation</span>
                                <p>{draft.interpret || 'Summarize the meaning before application.'}</p>
                            </section>
                            <StudyTextArea
                                label="Application"
                                value={draft.apply}
                                placeholder="What response does this call for?"
                                onChange={(value) => handleFieldChange('apply', value)}
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
