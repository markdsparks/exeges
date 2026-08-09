import assert from 'node:assert/strict';
import { getAdjacentChapters, getChapterSwipeIntent } from '../src/lib/readerNavigation.js';

const bibles = [
    {
        id: 'genesis',
        name: 'Genesis',
        chapters: [{ chapter: 1 }, { chapter: 2 }],
    },
    {
        id: 'exodus',
        name: 'Exodus',
        chapters: [{ chapter: 1 }],
    },
];

assert.deepEqual(getAdjacentChapters(bibles, 'genesis', 1), {
    previous: null,
    next: { bookId: 'genesis', bookName: 'Genesis', chapterNum: 2 },
});

assert.deepEqual(getAdjacentChapters(bibles, 'genesis', 2), {
    previous: { bookId: 'genesis', bookName: 'Genesis', chapterNum: 1 },
    next: { bookId: 'exodus', bookName: 'Exodus', chapterNum: 1 },
});

assert.deepEqual(getAdjacentChapters(bibles, 'exodus', 1), {
    previous: { bookId: 'genesis', bookName: 'Genesis', chapterNum: 2 },
    next: null,
});

assert.equal(getChapterSwipeIntent({
    startX: 40, startY: 240, startTime: 0, endX: 148, endY: 250, endTime: 280,
}), 'next');
assert.equal(getChapterSwipeIntent({
    startX: 260, startY: 240, startTime: 0, endX: 145, endY: 245, endTime: 320,
}), 'previous');
assert.equal(getChapterSwipeIntent({
    startX: 40, startY: 240, startTime: 0, endX: 112, endY: 245, endTime: 240,
}), null);
assert.equal(getChapterSwipeIntent({
    startX: 40, startY: 240, startTime: 0, endX: 164, endY: 315, endTime: 340,
}), null);
assert.equal(getChapterSwipeIntent({
    startX: 40, startY: 240, startTime: 0, endX: 160, endY: 245, endTime: 1200,
}), null);

console.log('Reader navigation checks passed.');
