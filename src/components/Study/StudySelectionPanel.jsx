import { useEffect, useState } from 'react';
import {
    OBSERVATION_PROMPTS,
    OBSERVATION_TYPES,
    getObservationTypeLabel,
    getSelectionQuote,
    getSelectionReference,
    getUniqueSelectionWords,
    sortSelectionItems,
} from '../../lib/studyMethod';

export function SelectionChips({ items, sideA = [], sideB = [], onAssignSide }) {
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

export default function StudySelectionPanel({
    className = '',
    selection = [],
    workflow,
    observationCounts = {},
    showEmpty = false,
    onAddObservation,
    onClearSelection,
    onSelectSameWord,
    onStartContrast,
    onCancelWorkflow,
}) {
    const [pendingObservation, setPendingObservation] = useState(null);
    const [contrastChoice, setContrastChoice] = useState(null);
    const [contrastSplit, setContrastSplit] = useState({ sideA: [], sideB: [] });

    const selectionQuote = getSelectionQuote(selection);
    const selectionReference = getSelectionReference(selection);
    const uniqueWords = getUniqueSelectionWords(selection);
    const canSelectSame = uniqueWords.length === 1;
    const selectionSignature = selection.map(item => item.id).join('|');

    useEffect(() => {
        setPendingObservation(null);
        setContrastChoice(null);
        setContrastSplit({ sideA: [], sideB: [] });
    }, [selectionSignature, workflow?.type]);

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

    if (workflow?.type === 'contrast') {
        return (
            <section className={`study-selection-card ${className}`}>
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
        );
    }

    if (!selection.length) {
        return showEmpty ? (
            <p className={`study-mode-empty ${className}`}>
                Tap words in the passage to collect them here. Tap again to deselect.
            </p>
        ) : null;
    }

    return (
        <section className={`study-selection-card ${className}`}>
            <span className="study-selection-reference">
                {selection.length} selected &middot; {selectionReference}
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
    );
}
