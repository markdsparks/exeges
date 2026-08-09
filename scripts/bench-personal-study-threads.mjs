import assert from 'node:assert/strict';
import {
    findPersonalStudyThreadObservation,
    getPersonalStudyThreads,
    hasPersonalStudyThread,
} from '../src/lib/personalStudyThreads.js';

const bibles = [{ id: 'genesis', name: 'Genesis' }];
const studies = [{
    bookId: 'genesis',
    chapter: 1,
    updatedAt: 40,
    observations: [
        {
            id: 'thread-1',
            verse: 3,
            reference: 'Genesis 1:3',
            quote: 'And God said, Let there be light.',
            note: 'God speaks and creation responds.',
            selections: [],
            updatedAt: 50,
        },
        {
            id: 'unfinished',
            verse: 4,
            quote: 'And God saw the light, that it was good.',
            note: '   ',
        },
    ],
}];

const threads = getPersonalStudyThreads(studies, bibles);
assert.equal(threads.length, 1);
assert.deepEqual(threads[0], {
    id: 'thread-1',
    bookId: 'genesis',
    bookName: 'Genesis',
    chapter: 1,
    verse: 3,
    reference: 'Genesis 1:3',
    quote: 'And God said, Let there be light.',
    selections: [],
    takeaway: 'God speaks and creation responds.',
    updatedAt: 50,
});
assert.equal(hasPersonalStudyThread(studies[0], 3), true);
assert.equal(hasPersonalStudyThread(studies[0], 4), false);

const duplicateThreads = {
    observations: [
        { id: 'first', reference: 'Genesis 1:3', quote: 'Let there be light.' },
        { id: 'second', reference: 'Genesis 1:3', quote: 'Let there be light.' },
    ],
};
assert.equal(
    findPersonalStudyThreadObservation(duplicateThreads, {
        id: 'second',
        reference: 'Genesis 1:3',
        quote: 'Let there be light.',
    })?.id,
    'second',
);

const legacyThreads = getPersonalStudyThreads([{
    bookId: 'genesis',
    chapter: 2,
    updatedAt: 60,
    observe: 'God rests on the seventh day.',
    observations: [],
}], bibles);
assert.deepEqual(legacyThreads[0], {
    id: 'legacy-genesis-2',
    kind: 'legacy',
    bookId: 'genesis',
    bookName: 'Genesis',
    chapter: 2,
    reference: 'Genesis 2',
    takeaway: 'Earlier guided study: God rests on the seventh day.',
    updatedAt: 60,
});

console.log('Personal study thread checks passed.');
