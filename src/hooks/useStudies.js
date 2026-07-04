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
    const observations = Array.isArray(study?.observations)
        ? study.observations.map(normalizeObservation).filter(Boolean)
        : [];

    return {
        observe: study?.observe?.trim() ?? '',
        interpret: study?.interpret?.trim() ?? '',
        apply: study?.apply?.trim() ?? '',
        observations,
        updatedAt: study?.updatedAt ?? 0,
    };
}

function normalizeObservation(observation) {
    const verse = parseInt(observation?.verse, 10);
    const quote = (observation?.quote ?? observation?.text ?? '').trim();

    if (Number.isNaN(verse) || !quote) return null;

    return {
        id: observation?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: observation?.type ?? 'note',
        scope: observation?.scope ?? 'verse',
        verse,
        quote,
        note: observation?.note?.trim() ?? '',
        createdAt: observation?.createdAt ?? Date.now(),
    };
}

function hasStudyText(study) {
    return !!(study.observe || study.interpret || study.apply || study.observations.length);
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

        setStudies(prev => {
            const next = { ...prev };
            const previousStudy = normalizeStudy(prev[key]);
            const cleanStudy = normalizeStudy({
                ...previousStudy,
                ...fields,
                observations: fields?.observations ?? previousStudy.observations,
            });

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

    const addObservation = useCallback((bookId, chapter, observation) => {
        const key = makeStudyKey(bookId, chapter);
        const cleanObservation = normalizeObservation(observation);
        if (!cleanObservation) return;

        setStudies(prev => {
            const next = { ...prev };
            const previousStudy = normalizeStudy(prev[key]);
            const alreadySaved = previousStudy.observations.some(item => (
                item.type === cleanObservation.type
                && item.verse === cleanObservation.verse
                && item.quote.toLowerCase() === cleanObservation.quote.toLowerCase()
            ));
            const observations = alreadySaved
                ? previousStudy.observations
                : [cleanObservation, ...previousStudy.observations];

            next[key] = {
                ...previousStudy,
                observations,
                updatedAt: Date.now(),
            };

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}

            return next;
        });
    }, []);

    const removeObservation = useCallback((bookId, chapter, observationId) => {
        const key = makeStudyKey(bookId, chapter);

        setStudies(prev => {
            const next = { ...prev };
            const previousStudy = normalizeStudy(prev[key]);
            const observations = previousStudy.observations.filter(item => item.id !== observationId);
            const cleanStudy = { ...previousStudy, observations };

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

    return {
        studies,
        getStudy,
        hasStudy,
        saveStudy,
        addObservation,
        removeObservation,
        deleteStudy,
        getAllStudies,
    };
}
