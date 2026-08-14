import assert from 'node:assert/strict';
import {
    normalizeReadingPosition,
    parseReadingPosition,
    sameReadingPosition,
    serializeReadingPosition,
} from '../src/lib/readingPosition.js';

assert.deepEqual(normalizeReadingPosition({
    bookId: '1-john',
    chapterNum: 4,
    verseNum: 7,
}), {
    bookId: '1-john',
    chapterNum: 4,
    verseNum: 7,
});

assert.deepEqual(parseReadingPosition('{"bookId":"genesis","chapterNum":2}'), {
    bookId: 'genesis',
    chapterNum: 2,
    verseNum: null,
});

assert.equal(parseReadingPosition('{not json'), null);
assert.equal(normalizeReadingPosition({ bookId: '', chapterNum: 1 }), null);
assert.equal(normalizeReadingPosition({ bookId: 'john', chapterNum: 0 }), null);
assert.equal(serializeReadingPosition({ bookId: 'john', chapterNum: 3, verseNum: 16 }), '{"bookId":"john","chapterNum":3,"verseNum":16}');
assert.equal(sameReadingPosition(
    { bookId: 'john', chapterNum: 3, verseNum: 16 },
    { bookId: 'john', chapterNum: 3, verseNum: 16 },
), true);
assert.equal(sameReadingPosition(
    { bookId: 'john', chapterNum: 3, verseNum: 16 },
    { bookId: 'john', chapterNum: 3, verseNum: 17 },
), false);

console.log('Reading position checks passed.');
