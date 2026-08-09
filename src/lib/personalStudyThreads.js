function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function hasPersonalStudyThread(study, verse) {
    return Boolean(study?.observations?.some(observation => (
        observation.verse === verse && cleanText(observation.note)
    )));
}

export function findPersonalStudyThreadObservation(study, target) {
    const observations = study?.observations ?? [];
    if (!target) return null;

    const byId = target.id
        ? observations.find(observation => observation.id === target.id)
        : null;
    if (byId) return byId;

    return observations.find(observation => (
        observation.reference === target.reference
        && observation.quote === target.quote
    )) ?? null;
}

export function getPersonalStudyThreads(studies, bibles) {
    if (!Array.isArray(studies) || !Array.isArray(bibles)) return [];

    return studies.flatMap(study => {
        const book = bibles.find(item => item.id === study.bookId);
        if (!book) return [];

        const personalThreads = (study.observations ?? [])
            .filter(observation => cleanText(observation.note))
            .map(observation => ({
                id: observation.id,
                bookId: study.bookId,
                bookName: book.name,
                chapter: study.chapter,
                verse: observation.verse,
                reference: observation.reference || `${book.name} ${study.chapter}:${observation.verse}`,
                quote: observation.quote,
                selections: observation.selections ?? [],
                takeaway: cleanText(observation.note),
                updatedAt: observation.updatedAt ?? study.updatedAt ?? observation.createdAt ?? 0,
            }));

        const legacyTakeaway = cleanText(study.interpret)
            || cleanText(study.observe)
            || cleanText(study.apply);
        const legacyThread = legacyTakeaway ? [{
            id: `legacy-${study.bookId}-${study.chapter}`,
            kind: 'legacy',
            bookId: study.bookId,
            bookName: book.name,
            chapter: study.chapter,
            reference: `${book.name} ${study.chapter}`,
            takeaway: `Earlier guided study: ${legacyTakeaway}`,
            updatedAt: study.updatedAt ?? 0,
        }] : [];

        return [...personalThreads, ...legacyThread];
    }).sort((a, b) => b.updatedAt - a.updatedAt);
}
