import { useCallback, useState } from 'react';

const STORAGE_KEY = 'exeges-studies';

function makeStudyKey(bookId, chapter) {
    return `${bookId}-${chapter}`;
}

function parseStudyKey(key) {
    const parts = key.split('-');
    if (parts.length < 2) return null;

    const chapter = parseInt(parts.pop(), 10);
    const bookId = parts.join('-');

    if (!bookId || Number.isNaN(chapter)) return null;
    return { bookId, chapter };
}

function normalizeStudy(study) {
    return {
        observe: study?.observe?.trim() ?? '',
        interpret: study?.interpret?.trim() ?? '',
        apply: study?.apply?.trim() ?? '',
        updatedAt: study?.updatedAt ?? 0,
    };
}

function hasStudyText(study) {
    return !!(study.observe || study.interpret || study.apply);
}

export function useStudies() {
    const [studies, setStudies] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    const getStudy = useCallback(
        (bookId, chapter) => {
            const study = normalizeStudy(studies[makeStudyKey(bookId, chapter)]);
            return hasStudyText(study) ? study : null;
        },
        [studies]
    );

    const hasStudy = useCallback(
        (bookId, chapter) => !!getStudy(bookId, chapter),
        [getStudy]
    );

    const saveStudy = useCallback((bookId, chapter, fields) => {
        const key = makeStudyKey(bookId, chapter);
        const cleanStudy = normalizeStudy(fields);

        setStudies(prev => {
            const next = { ...prev };

            if (hasStudyText(cleanStudy)) {
                next[key] = { ...cleanStudy, updatedAt: Date.now() };
            } else {
                delete next[key];
            }

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}

            return next;
        });
    }, []);

    const deleteStudy = useCallback((bookId, chapter) => {
        const key = makeStudyKey(bookId, chapter);

        setStudies(prev => {
            const next = { ...prev };
            delete next[key];

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}

            return next;
        });
    }, []);

    const getAllStudies = useCallback(() => {
        return Object.entries(studies)
            .map(([key, study]) => {
                const parsed = parseStudyKey(key);
                if (!parsed) return null;

                const normalizedStudy = normalizeStudy(study);
                if (!hasStudyText(normalizedStudy)) return null;
                return { ...parsed, ...normalizedStudy };
            })
            .filter(Boolean)
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }, [studies]);

    return { studies, getStudy, hasStudy, saveStudy, deleteStudy, getAllStudies };
}
