import { useEffect, useState } from 'react';
import {
    getSelectionQuote,
    getSelectionReference,
    getUniqueSelectionWords,
    sortSelectionItems,
} from '../../lib/studyMethod';

const CAPTURE_CHOICES = [
    {
        id: 'notice',
        label: 'I notice...',
        type: 'note',
        title: 'I notice',
        prompt: 'What do you notice in the text?',
        saveLabel: 'Save observation',
    },
    {
        id: 'wonder',
        label: 'I wonder...',
        type: 'question',
        title: 'I wonder',
        prompt: 'What question does this raise?',
        saveLabel: 'Save question',
    },
    {
        id: 'important',
        label: 'This seems important',
        type: 'key-term',
        title: 'This seems important',
        prompt: 'Why does this seem important here?',
        saveLabel: 'Save insight',
    },
];

const PATTERN_PROMPTS = {
    command: {
        type: 'command',
        title: 'Command',
        prompt: 'Who is commanded, and what action is required?',
        saveLabel: 'Save command',
    },
};

function stopPanelEvent(event) {
    event.stopPropagation();
}

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
                                type="button"
                                className={sideAIds.has(item.id) ? 'active' : ''}
                                onClick={() => onAssignSide(item, 'sideA')}
                                aria-label={`Assign ${item.text} to contrast side A`}
                            >
                                A
                            </button>
                            <button
                                type="button"
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
    showEmpty = false,
    onAddObservation,
    onClearSelection,
    onStartContrast,
    onCancelWorkflow,
}) {
    const [pendingObservation, setPendingObservation] = useState(null);
    const [contrastChoice, setContrastChoice] = useState(null);
    const [contrastSplit, setContrastSplit] = useState({ sideA: [], sideB: [] });

    const selectionQuote = getSelectionQuote(selection);
    const selectionReference = getSelectionReference(selection);
    const uniqueWords = getUniqueSelectionWords(selection);
    const canMarkRepeatedWord = uniqueWords.length === 1;
    const selectionSignature = selection.map(item => item.id).join('|');
    const pendingCanSave = pendingObservation?.note.trim().length > 0;

    useEffect(() => {
        setPendingObservation(null);
        setContrastChoice(null);
        setContrastSplit({ sideA: [], sideB: [] });
    }, [selectionSignature, workflow?.type]);

    const handleStartCapture = (choice) => {
        if (!selection.length) return;

        setPendingObservation({ ...choice, note: '' });
        setContrastChoice(null);
    };

    const handleQuickPattern = (type) => {
        if (!selection.length) return;

        if (type === 'repeated-word') {
            onAddObservation?.({ type, selections: selection });
            setPendingObservation(null);
            setContrastChoice(null);
            return;
        }

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

        if (PATTERN_PROMPTS[type]) {
            setPendingObservation({ ...PATTERN_PROMPTS[type], note: '' });
            setContrastChoice(null);
        }
    };

    const handleSavePendingObservation = () => {
        if (!pendingObservation || !pendingCanSave) return;

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
            <section className={`study-selection-card ${className}`} onClick={stopPanelEvent}>
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
                            <button type="button" className="study-selection-action primary" onClick={handleSaveWorkflowContrast}>
                                Save contrast
                            </button>
                            <button type="button" className="study-selection-action" onClick={onClearSelection}>
                                Clear second side
                            </button>
                        </div>
                    </>
                )}
                <button type="button" className="study-inline-cancel" onClick={onCancelWorkflow}>
                    Cancel contrast
                </button>
            </section>
        );
    }

    if (!selection.length) {
        return showEmpty ? (
            <p className={`study-mode-empty ${className}`}>
                Select a word or phrase that stands out in the passage.
            </p>
        ) : null;
    }

    return (
        <section className={`study-selection-card ${className}`} onClick={stopPanelEvent}>
            <div className="study-selection-current">
                <span className="study-selection-reference">
                    Selection &middot; {selectionReference}
                </span>
                <p>&ldquo;{selectionQuote}&rdquo;</p>
            </div>
            <SelectionChips items={selection} />

            {!pendingObservation && !contrastChoice && (
                <>
                    <div className="study-intent-actions" aria-label="Study note choices">
                        {CAPTURE_CHOICES.map(choice => (
                            <button
                                type="button"
                                key={choice.id}
                                className="study-intent-action"
                                onClick={() => handleStartCapture(choice)}
                            >
                                {choice.label}
                            </button>
                        ))}
                    </div>

                    <div className="study-pattern-actions" aria-label="Specific patterns">
                        <span className="study-selection-reference study-pattern-label">
                            Optional pattern
                        </span>
                        {canMarkRepeatedWord && (
                            <button
                                type="button"
                                className="study-selection-action"
                                onClick={() => handleQuickPattern('repeated-word')}
                            >
                                Repeated word
                            </button>
                        )}
                        <button
                            type="button"
                            className="study-selection-action"
                            onClick={() => handleQuickPattern('command')}
                        >
                            Command
                        </button>
                        <button
                            type="button"
                            className="study-selection-action"
                            onClick={() => handleQuickPattern('contrast')}
                        >
                            Contrast...
                        </button>
                    </div>

                    <div className="study-selection-tools" aria-label="Selection options">
                        <button type="button" onClick={onClearSelection}>
                            Clear selection
                        </button>
                    </div>

                    {canMarkRepeatedWord && (
                        <p className="study-selection-help">
                            Repeated word will also link matching uses in this chapter.
                        </p>
                    )}
                </>
            )}

            {contrastChoice === 'ambiguous' && (
                <div className="study-followup-card">
                    <span className="study-selection-reference">Contrast helper</span>
                    <p className="study-selection-help">
                        Did this selection include both sides of the contrast?
                    </p>
                    <div className="study-selection-actions">
                        <button
                            type="button"
                            className="study-selection-action primary"
                            onClick={() => {
                                onStartContrast?.(selection);
                                setContrastChoice(null);
                            }}
                        >
                            Use as first side
                        </button>
                        <button
                            type="button"
                            className="study-selection-action"
                            onClick={() => {
                                setContrastChoice('split');
                                setContrastSplit({ sideA: [], sideB: [] });
                            }}
                        >
                            Split into two sides
                        </button>
                        <button type="button" className="study-selection-action" onClick={() => setContrastChoice(null)}>
                            Back
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
                            type="button"
                            className="study-selection-action primary"
                            onClick={handleSaveSplitContrast}
                            disabled={!contrastSplit.sideA.length || !contrastSplit.sideB.length}
                        >
                            Save contrast
                        </button>
                        <button type="button" className="study-selection-action" onClick={() => setContrastChoice(null)}>
                            Back
                        </button>
                    </div>
                </div>
            )}

            {pendingObservation && (
                <div className="study-followup-card">
                    <span className="study-selection-reference">
                        {pendingObservation.title}
                    </span>
                    <label className="study-followup-field">
                        <span>{pendingObservation.prompt}</span>
                        <textarea
                            value={pendingObservation.note}
                            autoFocus
                            onChange={(event) => setPendingObservation(prev => ({
                                ...prev,
                                note: event.target.value,
                            }))}
                        />
                    </label>
                    <div className="study-selection-actions">
                        <button
                            type="button"
                            className="study-selection-action primary"
                            onClick={handleSavePendingObservation}
                            disabled={!pendingCanSave}
                        >
                            {pendingObservation.saveLabel}
                        </button>
                        <button type="button" className="study-selection-action" onClick={() => setPendingObservation(null)}>
                            Back
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
