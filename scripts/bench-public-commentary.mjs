import assert from 'node:assert/strict';
import { cleanPublicCommentaryText } from '../src/lib/publicCommentary.js';

const calvinEntry = [
    '1 John 4:7-10',
    '7. Beloved, let us love one another: for love is of God.',
    '7. Dilecti, diligamus nos mutuo, quia dilectio ex Deo est.',
    '8. He that loveth not knoweth not God; for God is love.',
    '8. Qui non diligit, non novit Deum; quia Deus dilectio est.',
    '7 Beloved He returns to that exhortation which he enforces almost throughout the Epistle.',
    'When he commands mutual love, he does not mean that we discharge this duty when we love our friends.',
].join('\n\n');

const calvinCommentary = cleanPublicCommentaryText(calvinEntry, 'john-calvin');
assert.match(calvinCommentary, /^7 Beloved He returns to that exhortation/);
assert.doesNotMatch(calvinCommentary, /Dilecti/);
assert.doesNotMatch(calvinCommentary, /^1 John 4:7-10/);

assert.equal(
    cleanPublicCommentaryText('A short Matthew Henry excerpt.', 'matthew-henry'),
    'A short Matthew Henry excerpt.',
);

assert.equal(
    cleanPublicCommentaryText('John 1:1\n\n1. In the beginning was the Word.', 'john-calvin'),
    '',
);

console.log('Public commentary checks passed.');
