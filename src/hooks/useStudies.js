import { useCallback, useRef, useState } from 'react';

const STORAGE_KEY = 'exeges-studies';
const INTERPRETATION_KEYS = ['anchor', 'context', 'meaning', 'guardrail', 'summary'];
const APPLICATION_KEYS = ['worship', 'trust', 'turn', 'obey', 'prayer'];

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
        observe: typeof study?.observe === 'string' ? study.observe : '',
        interpret: typeof study?.interpret === 'string' ? study.interpret : '',
        apply: typeof study?.apply === 'string' ? study.apply : '',
        observations,
        updatedAt: study?.updatedAt ?? 0,
    };
}

function normalizeObservation(observation) {
    const verse = parseInt(observation?.verse, 10);
    const quote = (observation?.quote ?? observation?.text ?? '').trim();
    const selections = Array.isArray(observation?.selections)
        ? observation.selections.map(normalizeSelectionItem).filter(Boolean)
        : [];
    const relatedSelections = Array.isArray(observation?.relatedSelections)
        ? observation.relatedSelections.map(normalizeSelectionItem).filter(Boolean)
        : [];
    const contrast = observation?.contrast ? {
        sideA: Array.isArray(observation.contrast.sideA)
            ? observation.contrast.sideA.map(normalizeSelectionItem).filter(Boolean)
            : [],
        sideB: Array.isArray(observation.contrast.sideB)
            ? observation.contrast.sideB.map(normalizeSelectionItem).filter(Boolean)
            : [],
    } : null;

    if (Number.isNaN(verse) || !quote) return null;

    return {
        id: observation?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: observation?.type ?? 'note',
        scope: observation?.scope ?? 'verse',
        verse,
        quote,
        reference: observation?.reference?.trim() ?? '',
        selections,
        relatedSelections,
        contrast,
        note: observation?.note?.trim() ?? '',
        interpretation: normalizeFieldMap(observation?.interpretation, INTERPRETATION_KEYS),
        application: normalizeFieldMap(observation?.application, APPLICATION_KEYS),
        createdAt: observation?.createdAt ?? Date.now(),
        updatedAt: observation?.updatedAt ?? observation?.createdAt ?? Date.now(),
    };
}

function normalizeFieldMap(fields, keys) {
    return keys.reduce((normalized, key) => ({
        ...normalized,
        [key]: typeof fields?.[key] === 'string' ? fields[key] : '',
    }), {});
}

function normalizeSelectionItem(item) {
    const verse = parseInt(item?.verse, 10);
    const chapter = parseInt(item?.chapter, 10);
    const text = (item?.text ?? item?.quote ?? '').trim();

    if (Number.isNaN(verse) || Number.isNaN(chapter) || !text) return null;

    return {
        id: item?.id ?? `${item?.bookId ?? 'book'}-${chapter}-${verse}-${item?.tokenIndex ?? text}`,
        bookId: item?.bookId ?? '',
        bookName: item?.bookName ?? '',
        chapter,
        verse,
        tokenIndex: item?.tokenIndex ?? Number.MAX_SAFE_INTEGER,
        scope: item?.scope ?? 'word',
        text,
        normalized: item?.normalized ?? text.toLowerCase(),
    };
}

function hasStudyText(study) {
    return !!(
        study.observe.trim()
        || study.interpret.trim()
        || study.apply.trim()
        || study.observations.length
    );
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
    const studiesRef = useRef(studies);

    const commitStudies = useCallback((next) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            return false;
        }

        studiesRef.current = next;
        setStudies(next);
        return true;
    }, []);

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
        const next = { ...studiesRef.current };
        const previousStudy = normalizeStudy(next[key]);
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

        return commitStudies(next);
    }, [commitStudies]);

    const addObservation = useCallback((bookId, chapter, observation) => {
        const key = makeStudyKey(bookId, chapter);
        const cleanObservation = normalizeObservation(observation);
        if (!cleanObservation) return false;

        const next = { ...studiesRef.current };
        const previousStudy = normalizeStudy(next[key]);
        const alreadySaved = previousStudy.observations.some(item => (
            item.type === cleanObservation.type
            && item.verse === cleanObservation.verse
            && item.quote.toLowerCase() === cleanObservation.quote.toLowerCase()
            && item.note.toLowerCase() === cleanObservation.note.toLowerCase()
        ));
        if (alreadySaved) return true;

        next[key] = {
            ...previousStudy,
            observations: [cleanObservation, ...previousStudy.observations],
            updatedAt: Date.now(),
        };

        return commitStudies(next);
    }, [commitStudies]);

    const removeObservation = useCallback((bookId, chapter, observationId) => {
        const key = makeStudyKey(bookId, chapter);
        const next = { ...studiesRef.current };
        const previousStudy = normalizeStudy(next[key]);
        const observations = previousStudy.observations.filter(item => item.id !== observationId);
        if (observations.length === previousStudy.observations.length) return false;

        const cleanStudy = { ...previousStudy, observations };
        if (hasStudyText(cleanStudy)) {
            next[key] = { ...cleanStudy, updatedAt: Date.now() };
        } else {
            delete next[key];
        }

        return commitStudies(next);
    }, [commitStudies]);

    const updateObservation = useCallback((bookId, chapter, observationId, fields) => {
        const key = makeStudyKey(bookId, chapter);
        const next = { ...studiesRef.current };
        const previousStudy = normalizeStudy(next[key]);
        let didUpdate = false;
        const observations = previousStudy.observations.map(item => {
            if (item.id !== observationId) return item;
            didUpdate = true;

            return normalizeObservation({
                ...item,
                ...fields,
                updatedAt: Date.now(),
                interpretation: fields?.interpretation
                    ? { ...item.interpretation, ...fields.interpretation }
                    : item.interpretation,
                application: fields?.application
                    ? { ...item.application, ...fields.application }
                    : item.application,
            });
        }).filter(Boolean);
        if (!didUpdate) return false;

        const cleanStudy = { ...previousStudy, observations };
        if (hasStudyText(cleanStudy)) {
            next[key] = { ...cleanStudy, updatedAt: Date.now() };
        } else {
            delete next[key];
        }

        return commitStudies(next);
    }, [commitStudies]);

    const deleteStudy = useCallback((bookId, chapter) => {
        const key = makeStudyKey(bookId, chapter);
        if (!studiesRef.current[key]) return false;

        const next = { ...studiesRef.current };
        delete next[key];
        return commitStudies(next);
    }, [commitStudies]);

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
        updateObservation,
        deleteStudy,
        getAllStudies,
    };
}
