import assert from 'node:assert/strict';
import {
    applyUserBackupTransaction,
    createUserBackup,
    getUserBackupCounts,
    mergeUserBackup,
    parseUserBackup,
} from '../src/lib/userBackup.js';

const backup = createUserBackup({
    bookmarks: { 'genesis-1-3': 100 },
    notes: { 'genesis-1-3': { text: 'God speaks.', updatedAt: 100 } },
    studies: {
        'genesis-1': {
            observe: 'Light follows God speaking.',
            observations: [{
                id: 'light-note',
                type: 'note',
                verse: 3,
                quote: 'Let there be light',
                note: 'The command is effective.',
                translationId: 'kjv',
                interpretation: { meaning: 'The local passage matters.' },
            }],
            updatedAt: 100,
        },
    },
    position: { bookId: 'genesis', chapterNum: 1, verseNum: 3 },
    preferences: { theme: 'dark', fontSize: 20, translation: 'esv' },
}, '2026-08-14T12:00:00.000Z');

const parsed = parseUserBackup(JSON.stringify(backup));
assert.equal(parsed.error, '');
assert.equal(parsed.backup.data.position.verseNum, 3);
assert.deepEqual(getUserBackupCounts(parsed.backup.data), {
    bookmarks: 1,
    notes: 1,
    studies: 1,
    observations: 1,
});
assert.equal(parsed.backup.data.studies['genesis-1'].observations[0].quote, 'Let there be light');

const esvBackup = createUserBackup({
    studies: {
        'john-3': {
            observations: [{
                id: 'esv-thread',
                type: 'note',
                verse: 16,
                quote: 'For God so loved the world',
                selections: [{ chapter: 3, verse: 16, text: 'For God so loved the world' }],
                note: "The user's own thought stays with the backup.",
                translationId: 'esv',
            }],
        },
    },
});
const redactedEsvObservation = esvBackup.data.studies['john-3'].observations[0];
assert.equal(redactedEsvObservation.quote, 'Verse 16');
assert.equal(redactedEsvObservation.selections.length, 0);
assert.equal(redactedEsvObservation.note, "The user's own thought stays with the backup.");
assert.equal(redactedEsvObservation.sourceTextExcluded, true);

assert.equal(parseUserBackup('{not json').backup, null);
assert.equal(parseUserBackup(JSON.stringify({ format: 'other', version: 1 })).backup, null);

const merged = mergeUserBackup({
    bookmarks: { 'genesis-1-1': 200 },
    notes: {
        'genesis-1-3': { text: 'Keep the local thought.', updatedAt: 300 },
    },
    studies: {
        'genesis-1': {
            observe: 'The local observation stays here.',
            apply: 'Read the passage again.',
            observations: [{
                id: 'light-note',
                type: 'note',
                verse: 3,
                quote: 'Let there be light',
                note: 'The command is effective.',
                interpretation: { meaning: 'The imported reflection is preserved too.' },
            }],
            updatedAt: 300,
        },
    },
    position: { bookId: 'john', chapterNum: 3, verseNum: 16 },
    preferences: { theme: 'light', fontSize: 18, translation: 'kjv' },
}, parsed.backup);

assert.equal(merged.data.notes['genesis-1-3'].text, 'Keep the local thought.');
assert.match(merged.data.studies['genesis-1'].observe, /The local observation stays here\./);
assert.match(merged.data.studies['genesis-1'].observe, /Light follows God speaking\./);
assert.equal(merged.data.studies['genesis-1'].apply, 'Read the passage again.');
assert.equal(merged.data.studies['genesis-1'].observations.length, 1);
assert.match(merged.data.studies['genesis-1'].observations[0].interpretation.meaning, /The local passage matters\./);
assert.match(merged.data.studies['genesis-1'].observations[0].interpretation.meaning, /The imported reflection is preserved too\./);
assert.equal(merged.data.position.bookId, 'genesis');
assert.equal(merged.data.preferences.theme, 'dark');
assert.deepEqual(merged.summary, {
    bookmarksAdded: 1,
    notesAdded: 0,
    notesKept: 1,
    studiesAdded: 0,
    studiesMerged: 1,
    observationsAdded: 0,
    observationsMerged: 1,
    studyTextMerged: 1,
    restoresPosition: true,
    restoresPreferences: true,
});

const mergedAgain = mergeUserBackup(merged.data, parsed.backup);
assert.equal(mergedAgain.data.studies['genesis-1'].observe, merged.data.studies['genesis-1'].observe);
assert.equal(
    mergedAgain.data.studies['genesis-1'].observations[0].interpretation.meaning,
    merged.data.studies['genesis-1'].observations[0].interpretation.meaning,
);

const transactionLog = [];
const failedTransaction = applyUserBackupTransaction({
    apply: [
        () => { transactionLog.push('apply bookmarks'); return true; },
        () => { transactionLog.push('apply notes'); return false; },
        () => { transactionLog.push('apply studies'); return true; },
    ],
    rollback: [
        () => { transactionLog.push('rollback bookmarks'); return true; },
        () => { transactionLog.push('rollback notes'); return true; },
        () => { transactionLog.push('rollback studies'); return true; },
    ],
});
assert.deepEqual(failedTransaction, { ok: false, rollbackComplete: true });
assert.deepEqual(transactionLog, [
    'apply bookmarks',
    'apply notes',
    'rollback notes',
    'rollback bookmarks',
]);

console.log('User backup checks passed.');
