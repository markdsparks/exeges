import { useState, useCallback } from 'react';

const STORAGE_KEY = 'exeges-notes';

function makeNoteKey(bookId, chapter, verse) {
    return `${bookId}-${chapter}-${verse}`;
}

function parseNoteKey(key) {
    const parts = key.split('-');
    if (parts.length < 3) return null;

    const verse = parseInt(parts.pop(), 10);
    const chapter = parseInt(parts.pop(), 10);
    const bookId = parts.join('-');

    if (!bookId || Number.isNaN(chapter) || Number.isNaN(verse)) return null;
    return { bookId, chapter, verse };
}

export function useNotes() {
    const [notes, setNotes] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    const getNote = useCallback(
        (bookId, chapter, verse) => {
            const note = notes[makeNoteKey(bookId, chapter, verse)];
            if (!note) return null;

            if (typeof note === 'string') {
                return { text: note, updatedAt: 0 };
            }

            return note.text?.trim() ? note : null;
        },
        [notes]
    );

    const hasNote = useCallback(
        (bookId, chapter, verse) => {
            return !!getNote(bookId, chapter, verse);
        },
        [getNote]
    );

    const saveNote = useCallback((bookId, chapter, verse, text) => {
        const key = makeNoteKey(bookId, chapter, verse);
        const cleanText = text.trim();

        setNotes(prev => {
            const next = { ...prev };

            if (cleanText) {
                next[key] = { text: cleanText, updatedAt: Date.now() };
            } else {
                delete next[key];
            }

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}

            return next;
        });
    }, []);

    const deleteNote = useCallback((bookId, chapter, verse) => {
        const key = makeNoteKey(bookId, chapter, verse);

        setNotes(prev => {
            const next = { ...prev };
            delete next[key];

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}

            return next;
        });
    }, []);

    const getAllNotes = useCallback(() => {
        return Object.entries(notes)
            .map(([key, note]) => {
                const parsed = parseNoteKey(key);
                if (!parsed) return null;

                const normalizedNote = typeof note === 'string'
                    ? { text: note, updatedAt: 0 }
                    : note;

                if (!normalizedNote?.text?.trim()) return null;
                return { ...parsed, ...normalizedNote };
            })
            .filter(Boolean)
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }, [notes]);

    return { notes, getNote, hasNote, saveNote, deleteNote, getAllNotes };
}
