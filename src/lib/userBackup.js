import { normalizeReadingPosition } from './readingPosition.js';

export const USER_BACKUP_FORMAT = 'exeges-user-backup';
export const USER_BACKUP_VERSION = 1;
export const MAX_USER_BACKUP_BYTES = 5 * 1024 * 1024;

const MAX_TEXT_LENGTH = 100_000;
const FONT_SIZES = new Set([14, 15, 16, 17, 18, 19, 20, 22, 24]);
const THEMES = new Set(['auto', 'light', 'dark']);
const TRANSLATIONS = new Set(['kjv', 'esv']);

function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function positiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
}

function timestamp(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function text(value) {
    return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : '';
}

function parseVerseKey(key) {
    if (typeof key !== 'string') return null;

    const parts = key.split('-');
    if (parts.length < 3) return null;

    const verse = positiveInteger(parts.pop());
    const chapter = positiveInteger(parts.pop());
    const bookId = parts.join('-').trim();
    return bookId && chapter && verse ? { bookId, chapter, verse } : null;
}

function parseStudyKey(key) {
    if (typeof key !== 'string') return null;

    const parts = key.split('-');
    if (parts.length < 2) return null;

    const chapter = positiveInteger(parts.pop());
    const bookId = parts.join('-').trim();
    return bookId && chapter ? { bookId, chapter } : null;
}

function normalizeSelections(selections) {
    if (!Array.isArray(selections)) return [];

    return selections.map(selection => {
        if (!isRecord(selection)) return null;

        const chapter = positiveInteger(selection.chapter);
        const verse = positiveInteger(selection.verse);
        const selectionText = text(selection.text ?? selection.quote);
        if (!chapter || !verse || !selectionText) return null;

        return {
            id: text(selection.id) || undefined,
            bookId: text(selection.bookId),
            bookName: text(selection.bookName),
            chapter,
            verse,
            tokenIndex: Number.isInteger(selection.tokenIndex)
                ? selection.tokenIndex
                : Number.MAX_SAFE_INTEGER,
            scope: text(selection.scope) || 'word',
            text: selectionText,
            normalized: text(selection.normalized) || selectionText.toLowerCase(),
        };
    }).filter(Boolean);
}

function normalizeObservation(observation) {
    if (!isRecord(observation)) return null;

    const verse = positiveInteger(observation.verse);
    const quote = text(observation.quote ?? observation.text);
    if (!verse || !quote) return null;

    const contrast = isRecord(observation.contrast) ? {
        sideA: normalizeSelections(observation.contrast.sideA),
        sideB: normalizeSelections(observation.contrast.sideB),
    } : null;

    return {
        id: text(observation.id) || undefined,
        type: text(observation.type) || 'note',
        scope: text(observation.scope) || 'verse',
        verse,
        quote,
        reference: text(observation.reference),
        translationId: TRANSLATIONS.has(observation.translationId) ? observation.translationId : '',
        sourceTextExcluded: observation.sourceTextExcluded === true,
        selections: normalizeSelections(observation.selections),
        relatedSelections: normalizeSelections(observation.relatedSelections),
        contrast,
        note: text(observation.note),
        interpretation: normalizeFieldMap(observation.interpretation, [
            'anchor', 'context', 'meaning', 'guardrail', 'summary',
        ]),
        application: normalizeFieldMap(observation.application, [
            'worship', 'trust', 'turn', 'obey', 'prayer',
        ]),
        createdAt: timestamp(observation.createdAt),
        updatedAt: timestamp(observation.updatedAt ?? observation.createdAt),
    };
}

function normalizeFieldMap(fields, keys) {
    return keys.reduce((result, key) => ({
        ...result,
        [key]: text(fields?.[key]),
    }), {});
}

function hasStudyContent(study) {
    return !!(
        study.observe
        || study.interpret
        || study.apply
        || study.observations.length
    );
}

function normalizeStudy(study) {
    if (!isRecord(study)) return null;

    const normalized = {
        observe: text(study.observe),
        interpret: text(study.interpret),
        apply: text(study.apply),
        observations: Array.isArray(study.observations)
            ? study.observations.map(normalizeObservation).filter(Boolean)
            : [],
        updatedAt: timestamp(study.updatedAt),
    };

    return hasStudyContent(normalized) ? normalized : null;
}

function normalizeBookmarks(bookmarks) {
    if (!isRecord(bookmarks)) return {};

    return Object.fromEntries(Object.entries(bookmarks)
        .filter(([key]) => !!parseVerseKey(key))
        .map(([key, value]) => [key, timestamp(value)]));
}

function normalizeNotes(notes) {
    if (!isRecord(notes)) return {};

    return Object.fromEntries(Object.entries(notes).map(([key, value]) => {
        if (!parseVerseKey(key)) return null;

        const noteText = text(typeof value === 'string' ? value : value?.text);
        if (!noteText) return null;

        return [key, {
            text: noteText,
            updatedAt: timestamp(typeof value === 'string' ? 0 : value?.updatedAt),
        }];
    }).filter(Boolean));
}

function normalizeStudies(studies) {
    if (!isRecord(studies)) return {};

    return Object.fromEntries(Object.entries(studies).map(([key, value]) => {
        if (!parseStudyKey(key)) return null;
        const study = normalizeStudy(value);
        return study ? [key, study] : null;
    }).filter(Boolean));
}

function normalizePreferences(preferences) {
    if (!isRecord(preferences)) return {};

    const theme = THEMES.has(preferences.theme) ? preferences.theme : null;
    const fontSize = FONT_SIZES.has(preferences.fontSize) ? preferences.fontSize : null;
    const translation = TRANSLATIONS.has(preferences.translation) ? preferences.translation : null;

    return {
        ...(theme ? { theme } : {}),
        ...(fontSize ? { fontSize } : {}),
        ...(translation ? { translation } : {}),
    };
}

function redactObservationSourceText(observation) {
    if (observation.translationId === 'kjv') return observation;

    return {
        ...observation,
        quote: `Verse ${observation.verse}`,
        selections: [],
        relatedSelections: [],
        contrast: null,
        sourceTextExcluded: true,
    };
}

function normalizeBackupData(data, { forExport = false } = {}) {
    const studies = normalizeStudies(data?.studies);

    return {
        bookmarks: normalizeBookmarks(data?.bookmarks),
        notes: normalizeNotes(data?.notes),
        studies: forExport
            ? Object.fromEntries(Object.entries(studies).map(([key, study]) => [key, {
                ...study,
                observations: study.observations.map(redactObservationSourceText),
            }]))
            : studies,
        position: normalizeReadingPosition(data?.position),
        preferences: normalizePreferences(data?.preferences),
    };
}

function observationIdentity(observation) {
    return JSON.stringify({
        type: observation.type,
        scope: observation.scope,
        verse: observation.verse,
        quote: observation.quote.toLowerCase(),
        reference: observation.reference,
        note: observation.note,
        selections: observation.selections,
        relatedSelections: observation.relatedSelections,
        contrast: observation.contrast,
        interpretation: observation.interpretation,
        application: observation.application,
    });
}

function mergeText(currentText, importedText) {
    const restoredText = `From restored backup:\n${importedText}`;
    if (!importedText || currentText === importedText || currentText.includes(restoredText)) {
        return { value: currentText, added: false };
    }
    if (!currentText) {
        return { value: importedText, added: true };
    }

    return {
        value: `${currentText}\n\nFrom restored backup:\n${importedText}`,
        added: true,
    };
}

function mergeFieldMap(currentFields, importedFields) {
    return Object.fromEntries(Object.keys(currentFields).map(key => {
        const merged = mergeText(currentFields[key], importedFields[key]);
        return [key, merged];
    }));
}

function mergeObservation(current, imported) {
    const note = mergeText(current.note, imported.note);
    const interpretation = mergeFieldMap(current.interpretation, imported.interpretation);
    const application = mergeFieldMap(current.application, imported.application);
    const added = note.added
        || Object.values(interpretation).some(field => field.added)
        || Object.values(application).some(field => field.added);

    const createdAtValues = [current.createdAt, imported.createdAt].filter(value => value > 0);

    return {
        observation: {
            ...current,
            type: current.type || imported.type,
            scope: current.scope || imported.scope,
            quote: current.quote || imported.quote,
            reference: current.reference || imported.reference,
            translationId: current.translationId || imported.translationId,
            sourceTextExcluded: current.sourceTextExcluded && imported.sourceTextExcluded,
            selections: current.selections.length ? current.selections : imported.selections,
            relatedSelections: current.relatedSelections.length
                ? current.relatedSelections
                : imported.relatedSelections,
            contrast: current.contrast || imported.contrast,
            note: note.value,
            interpretation: Object.fromEntries(Object.entries(interpretation)
                .map(([key, field]) => [key, field.value])),
            application: Object.fromEntries(Object.entries(application)
                .map(([key, field]) => [key, field.value])),
            createdAt: createdAtValues.length ? Math.min(...createdAtValues) : 0,
            updatedAt: Math.max(current.updatedAt, imported.updatedAt),
        },
        added,
    };
}

function mergeStudy(current, imported) {
    const observations = [...current.observations];
    const observationIds = new Set(observations.map(observationIdentity));
    const observationIndexesById = new Map(observations
        .filter(observation => observation.id)
        .map((observation, index) => [observation.id, index]));
    const observe = mergeText(current.observe, imported.observe);
    const interpret = mergeText(current.interpret, imported.interpret);
    const apply = mergeText(current.apply, imported.apply);
    let observationsAdded = 0;
    let observationsMerged = 0;

    imported.observations.forEach(observation => {
        if (observationIds.has(observationIdentity(observation))) return;

        const existingIndex = observation.id
            ? observationIndexesById.get(observation.id)
            : undefined;
        if (existingIndex !== undefined) {
            const merged = mergeObservation(observations[existingIndex], observation);
            observations[existingIndex] = merged.observation;
            if (merged.added) observationsMerged += 1;
            return;
        }

        observationIds.add(observationIdentity(observation));
        observations.push(observation);
        observationsAdded += 1;
    });

    return {
        study: {
            observe: observe.value,
            interpret: interpret.value,
            apply: apply.value,
            observations,
            updatedAt: Math.max(current.updatedAt, imported.updatedAt),
        },
        observationsAdded,
        observationsMerged,
        studyTextMerged: Number(observe.added) + Number(interpret.added) + Number(apply.added),
    };
}

function backupDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function createUserBackup(data, createdAt = new Date().toISOString()) {
    return {
        format: USER_BACKUP_FORMAT,
        version: USER_BACKUP_VERSION,
        createdAt: backupDate(createdAt) ?? new Date().toISOString(),
        data: normalizeBackupData(data, { forExport: true }),
    };
}

export function parseUserBackup(serialized) {
    if (typeof serialized !== 'string') {
        return { backup: null, error: 'Choose an Exeges backup file.' };
    }

    if (new TextEncoder().encode(serialized).byteLength > MAX_USER_BACKUP_BYTES) {
        return { backup: null, error: 'That backup is too large to restore here.' };
    }

    try {
        const value = JSON.parse(serialized);
        if (!isRecord(value) || value.format !== USER_BACKUP_FORMAT) {
            return { backup: null, error: 'This is not an Exeges backup.' };
        }
        if (value.version !== USER_BACKUP_VERSION) {
            return { backup: null, error: 'This backup was made by a newer or incompatible version of Exeges.' };
        }

        const createdAt = backupDate(value.createdAt);
        if (!createdAt) {
            return { backup: null, error: 'This backup does not include a valid creation date.' };
        }

        return {
            backup: {
                format: USER_BACKUP_FORMAT,
                version: USER_BACKUP_VERSION,
                createdAt,
                data: normalizeBackupData(value.data),
            },
            error: '',
        };
    } catch {
        return { backup: null, error: 'Exeges could not read that backup file.' };
    }
}

export function mergeUserBackup(currentData, backup) {
    const current = normalizeBackupData(currentData);
    const imported = normalizeBackupData(backup?.data);
    const bookmarks = { ...current.bookmarks };
    let bookmarksAdded = 0;

    Object.entries(imported.bookmarks).forEach(([key, importedTimestamp]) => {
        if (!bookmarks[key]) bookmarksAdded += 1;
        bookmarks[key] = Math.max(timestamp(bookmarks[key]), importedTimestamp);
    });

    const notes = { ...current.notes };
    let notesAdded = 0;
    let notesKept = 0;
    Object.entries(imported.notes).forEach(([key, importedNote]) => {
        if (notes[key]) {
            notesKept += 1;
            return;
        }
        notes[key] = importedNote;
        notesAdded += 1;
    });

    const studies = { ...current.studies };
    let studiesAdded = 0;
    let studiesMerged = 0;
    let observationsAdded = 0;
    let observationsMerged = 0;
    let studyTextMerged = 0;
    Object.entries(imported.studies).forEach(([key, importedStudy]) => {
        if (!studies[key]) {
            studies[key] = importedStudy;
            studiesAdded += 1;
            observationsAdded += importedStudy.observations.length;
            return;
        }

        const merged = mergeStudy(studies[key], importedStudy);
        studies[key] = merged.study;
        studiesMerged += 1;
        observationsAdded += merged.observationsAdded;
        observationsMerged += merged.observationsMerged;
        studyTextMerged += merged.studyTextMerged;
    });

    return {
        data: {
            bookmarks,
            notes,
            studies,
            position: imported.position ?? current.position,
            preferences: {
                ...current.preferences,
                ...imported.preferences,
            },
        },
        summary: {
            bookmarksAdded,
            notesAdded,
            notesKept,
            studiesAdded,
            studiesMerged,
            observationsAdded,
            observationsMerged,
            studyTextMerged,
            restoresPosition: !!imported.position,
            restoresPreferences: Object.keys(imported.preferences).length > 0,
        },
    };
}

export function getUserBackupCounts(data) {
    const normalized = normalizeBackupData(data);
    return {
        bookmarks: Object.keys(normalized.bookmarks).length,
        notes: Object.keys(normalized.notes).length,
        studies: Object.keys(normalized.studies).length,
        observations: Object.values(normalized.studies)
            .reduce((total, study) => total + study.observations.length, 0),
    };
}

export function applyUserBackupTransaction({ apply, rollback }) {
    if (!Array.isArray(apply) || !Array.isArray(rollback) || apply.length !== rollback.length) {
        return { ok: false, rollbackComplete: true };
    }

    for (let index = 0; index < apply.length; index += 1) {
        let applied = false;
        try {
            applied = apply[index]?.() === true;
        } catch {}
        if (applied) continue;

        const rollbackResults = rollback
            .slice(0, index + 1)
            .reverse()
            .map(restorePreviousValue => {
                try {
                    return restorePreviousValue?.() === true;
                } catch {
                    return false;
                }
            });
        return { ok: false, rollbackComplete: rollbackResults.every(Boolean) };
    }

    return { ok: true, rollbackComplete: true };
}
