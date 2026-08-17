import assert from 'node:assert/strict';
import { cleanPublicCommentaryText, PUBLIC_COMMENTARY_SOURCES } from '../src/lib/publicCommentary.js';

const tyndale = PUBLIC_COMMENTARY_SOURCES.find(source => source.id === 'tyndale');
assert.ok(tyndale, 'Tyndale Open Study Notes should be available as a source');
assert.equal(tyndale.type, 'study-notes');
assert.equal(tyndale.license, 'CC BY-SA 4.0');
assert.match(tyndale.attribution, /Tyndale House Publishers/i);
assert.match(tyndale.licenseHref, /creativecommons\.org/i);

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
