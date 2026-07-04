import { useEffect, useState } from 'react';
import {
    STUDY_STAGES,
    getBookGenre,
    getObservationTypeLabel,
    getSelectionQuote,
} from '../../lib/studyMethod';
import StudySelectionPanel from './StudySelectionPanel';

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

function ObservationList({ observations, onRemoveObservation }) {
    if (!observations.length) {
        return (
            <p className="study-mode-empty">
                Your saved observations will collect here as you notice, wonder, and mark what matters.
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
    onStartContrast,
    onCancelWorkflow,
    onRemoveObservation,
    onSaveFields,
    onDeleteStudy,
    onClose,
}) {
    const observations = study?.observations ?? [];
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [trayOpen, setTrayOpen] = useState(() => !prefersCompactStudyTray());

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

    const currentStage = STUDY_STAGES.find(item => item.id === stage) ?? STUDY_STAGES[0];
    const focusVerse = selection[0]?.verse ?? observations[0]?.verse ?? chapter?.verses?.[0]?.verse ?? 1;
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
