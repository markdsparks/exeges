import { useEffect, useState } from 'react';
import '../../styles/notes.css';

export default function NoteEditor({ open, noteTarget, note, onSave, onDelete, onClose }) {
    const [draft, setDraft] = useState('');

    useEffect(() => {
        if (open) {
            setDraft(note?.text ?? '');
        }
    }, [open, note?.text]);

    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open || !noteTarget) return null;

    const reference = `${noteTarget.bookName} ${noteTarget.chapter}:${noteTarget.verse}`;
    const hasExistingNote = !!note?.text?.trim();

    return (
        <div className="note-overlay" onClick={onClose}>
            <section
                className="note-editor"
                role="dialog"
                aria-modal="true"
                aria-labelledby="note-editor-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="note-header">
                    <div>
                        <p className="note-kicker">Verse note</p>
                        <h2 id="note-editor-title" className="note-reference">{reference}</h2>
                    </div>
                    <button className="note-close" onClick={onClose} aria-label="Close note editor">
                        &times;
                    </button>
                </header>

                <p className="note-verse-text">{noteTarget.text}</p>

                <textarea
                    className="note-textarea"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Add a note..."
                    rows={7}
                    autoFocus
                />

                <footer className="note-actions">
                    {hasExistingNote && (
                        <button
                            className="note-delete"
                            onClick={() => {
                                onDelete?.();
                                onClose?.();
                            }}
                        >
                            Delete
                        </button>
                    )}
                    <span className="note-action-spacer" />
                    <button className="note-cancel" onClick={onClose}>Cancel</button>
                    <button
                        className="note-save"
                        onClick={() => {
                            onSave?.(draft);
                            onClose?.();
                        }}
                    >
                        Save
                    </button>
                </footer>
            </section>
        </div>
    );
}
