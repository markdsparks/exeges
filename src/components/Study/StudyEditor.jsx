import { useEffect, useMemo, useState } from 'react';
import '../../styles/study.css';

const FIELD_CONFIG = [
    {
        key: 'observe',
        label: 'Observe',
        prompt: 'Repeated words, contrasts, commands, questions, structure, people, places.',
        placeholder: 'What do you see in the text?',
    },
    {
        key: 'interpret',
        label: 'Interpret',
        prompt: 'Meaning in context, supported by the passage, chapter, book, and genre.',
        placeholder: 'What does this mean here?',
    },
    {
        key: 'apply',
        label: 'Apply',
        prompt: 'A faithful response after observation and interpretation.',
        placeholder: 'What response does this call for?',
    },
];

const EMPTY_DRAFT = {
    observe: '',
    interpret: '',
    apply: '',
};

export default function StudyEditor({ open, studyTarget, study, onSave, onDelete, onClose }) {
    const [draft, setDraft] = useState(EMPTY_DRAFT);

    useEffect(() => {
        if (open) {
            setDraft({
                observe: study?.observe ?? '',
                interpret: study?.interpret ?? '',
                apply: study?.apply ?? '',
            });
        }
    }, [open, study?.observe, study?.interpret, study?.apply]);

    const hasExistingStudy = !!study;
    const hasDraftText = useMemo(
        () => Object.values(draft).some(value => value.trim()),
        [draft]
    );

    if (!open || !studyTarget) return null;

    const reference = `${studyTarget.bookName} ${studyTarget.chapter}`;

    const handleDraftChange = (key, value) => {
        setDraft(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSave?.(draft);
        onClose?.();
    };

    const handleDelete = () => {
        onDelete?.();
        onClose?.();
    };

    return (
        <div className="study-overlay" role="dialog" aria-modal="true" aria-labelledby="study-editor-title">
            <section className="study-editor">
                <header className="study-header">
                    <div>
                        <p className="study-kicker">Guided study</p>
                        <h2 id="study-editor-title" className="study-reference">{reference}</h2>
                    </div>
                    <button className="study-close" onClick={onClose} aria-label="Close study">
                        &times;
                    </button>
                </header>

                <div className="study-fields">
                    {FIELD_CONFIG.map(field => (
                        <label key={field.key} className="study-field">
                            <span className="study-field-label">{field.label}</span>
                            <span className="study-field-prompt">{field.prompt}</span>
                            <textarea
                                className="study-textarea"
                                value={draft[field.key]}
                                onChange={(event) => handleDraftChange(field.key, event.target.value)}
                                placeholder={field.placeholder}
                            />
                        </label>
                    ))}
                </div>

                <footer className="study-actions">
                    {hasExistingStudy && (
                        <button className="study-delete" onClick={handleDelete}>Delete</button>
                    )}
                    <span className="study-action-spacer" />
                    <button className="study-cancel" onClick={onClose}>Cancel</button>
                    <button className="study-save" onClick={handleSave} disabled={!hasDraftText}>
                        Save
                    </button>
                </footer>
            </section>
        </div>
    );
}
