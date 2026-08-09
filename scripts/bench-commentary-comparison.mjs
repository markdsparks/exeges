import assert from 'node:assert/strict';
import {
    buildCommentaryComparisonRequest,
    buildCommentaryOverview,
    loadPassageCommentaryReport,
    normalizeCommentaryComparisonDraft,
    selectRelevantCommentaryEntry,
    toCommentaryFinding,
} from '../src/lib/commentaryComparison.js';

const target = {
    id: 'genesis-1-3',
    bookName: 'Genesis',
    chapter: 1,
    verse: 3,
    quote: 'Let there be light',
    reference: 'Genesis 1:3',
};

const selected = selectRelevantCommentaryEntry([
    { verse: null, text: 'A chapter-wide note about creation.' },
    { verse: 3, text: 'The word of God brings forth light.' },
], { targetVerse: 3, query: 'light' });
assert.equal(selected.verse, 3);

const rejectedNeighbor = selectRelevantCommentaryEntry([
    { verse: 1, text: 'In the beginning God created the heaven and the earth.' },
], { targetVerse: 3, query: 'God said let there be light' });
assert.equal(rejectedNeighbor, null);

const selectedRelevantNeighbor = selectRelevantCommentaryEntry([
    { verse: 1, text: 'Gen 1:3 God creates light by speaking his effective word.' },
], { targetVerse: 3, targetReference: 'Genesis 1:3', query: 'God said let there be light' });
assert.equal(selectedRelevantNeighbor.verse, 1);

const rejectedSubstringMatch = selectRelevantCommentaryEntry([
    { verse: 20, text: 'The godly person delighted in a different subject.' },
], { targetVerse: 3, targetReference: 'Genesis 1:3', query: 'God light' });
assert.equal(rejectedSubstringMatch, null, 'partial-word matches must not qualify an unrelated entry');

const nearerGroupedEntry = selectRelevantCommentaryEntry([
    {
        verse: 1,
        text: 'God said that light belongs to the created heaven and earth, with further discussion of the beginning.',
    },
    {
        verse: 2,
        text: 'Gen 1:3 The word of God calls light into being and begins the ordered work of creation.',
    },
], { targetVerse: 3, targetReference: 'Genesis 1:3', query: 'And God said, Let there be light' });
assert.equal(
    nearerGroupedEntry?.verse,
    2,
    'when a source groups verses, the nearer relevant section should outrank a broader earlier section',
);

const groupedFinding = toCommentaryFinding(
    { id: 'grouped', label: 'Grouped source', href: '', license: 'Public domain' },
    {
        verse: 2,
        text: 'A long note on verse two. Gen 1:3 The word of God calls light into being. This begins the ordered work of creation.',
    },
    'Genesis',
    1,
    3,
);
assert.equal(groupedFinding.references[0], 'Genesis 1:3');
assert.match(groupedFinding.text, /^Gen 1:3 The word of God/);

const failedReport = await loadPassageCommentaryReport({
    target,
    loadCommentary: async () => {
        throw new Error('offline');
    },
});
assert.equal(failedReport.findings.length, 0);
assert.equal(failedReport.failedSourceCount, failedReport.sourceCount);

const commentaryFindings = [
    {
        id: 'commentary-one',
        title: 'First source',
        text: 'God speaks, and light immediately appears. The divine word is effective.',
        references: ['Genesis 1:3'],
        source: { id: 'commentary-one', label: 'First source' },
    },
    {
        id: 'commentary-two',
        title: 'Second source',
        text: 'Light appears in response to the word God speaks. The passage emphasizes order.',
        references: ['Genesis 1:3'],
        source: { id: 'commentary-two', label: 'Second source' },
    },
    {
        id: 'commentary-three',
        title: 'Third source',
        text: 'The creation of light displays the authority of God and his spoken word.',
        references: ['Genesis 1:3'],
        source: { id: 'commentary-three', label: 'Third source' },
    },
];

const overview = buildCommentaryOverview({ target, commentaryFindings });
assert.equal(overview.sourceCount, 3);
assert.equal(overview.mode, 'multiple');
assert.match(overview.shared, /God|light|word/i);
assert.match(overview.differences, /not necessarily direct disagreement/i);
assert.equal(overview.perspectives.length, 3);

const singleSourceOverview = buildCommentaryOverview({
    target,
    commentaryFindings: [commentaryFindings[0]],
});
assert.equal(singleSourceOverview.mode, 'single');
assert.match(singleSourceOverview.summary, /First source offers one historical perspective/i);
assert.match(singleSourceOverview.caution, /cannot show consensus or disagreement/i);
assert.equal(singleSourceOverview.perspectives.length, 1);

const emptyOverview = buildCommentaryOverview({ target, commentaryFindings: [] });
assert.equal(emptyOverview.mode, 'empty');
assert.match(emptyOverview.summary, /no commentary excerpt could be matched/i);
assert.doesNotMatch(emptyOverview.summary, /commentaries|consensus|disagreement/i);
assert.equal(emptyOverview.perspectives.length, 0);

const request = buildCommentaryComparisonRequest({
    target,
    passageFindings: [{
        id: 'passage-context',
        title: 'Immediate context',
        text: 'God speaks and light appears.',
        references: ['Genesis 1:3'],
        source: { id: 'passage-context', label: 'Selected passage' },
    }],
    commentaryFindings,
});
assert.equal(request.mode, 'commentary-comparison');
assert.equal(request.evidenceCards.length, 4);
assert.ok(request.evidenceCards.every(card => card.id));

const validComparison = normalizeCommentaryComparisonDraft({
    agreements: [{
        evidence: [
            { cardId: 'commentary-one', quote: 'God speaks, and light immediately appears.' },
            { cardId: 'commentary-two', quote: 'Light appears in response to the word God speaks.' },
        ],
    }],
    differences: [{
        kind: 'disagreement',
        reasonKind: 'application-focus',
        evidence: [
            { cardId: 'commentary-two', quote: 'The passage emphasizes order.' },
            { cardId: 'commentary-three', quote: 'The creation of light displays the authority of God and his spoken word.' },
        ],
        reasonEvidence: [
            { cardId: 'commentary-two', quote: 'The passage emphasizes order.' },
            { cardId: 'commentary-three', quote: 'The creation of light displays the authority of God and his spoken word.' },
        ],
    }],
}, request);
assert.equal(validComparison.agreements.length, 1);
assert.equal(validComparison.differences.length, 1);
assert.equal(validComparison.differences[0].kind, 'emphasis');
assert.equal(validComparison.differences[0].reasonKind, 'application-focus');

const oneSidedReason = normalizeCommentaryComparisonDraft({
    differences: [{
        kind: 'emphasis',
        reasonKind: 'theological-premise',
        evidence: [
            { cardId: 'commentary-one', quote: 'God speaks, and light immediately appears.' },
            { cardId: 'commentary-two', quote: 'Light appears in response to the word God speaks.' },
        ],
        reasonEvidence: [
            { cardId: 'commentary-one', quote: 'The divine word is effective.' },
        ],
    }],
}, request);
assert.equal(oneSidedReason.differences[0].reasonKind, 'unclear');

const rejectedComparison = normalizeCommentaryComparisonDraft({
    agreements: [{
        evidence: [
            { cardId: 'commentary-one', quote: 'God speaks, and light immediately appears.' },
            { cardId: 'commentary-one', quote: 'The divine word is effective.' },
        ],
    }],
    differences: [{
        kind: 'disagreement',
        reasonKind: 'theological-premise',
        evidence: [
            { cardId: 'commentary-one', quote: 'This quotation was fabricated.' },
            { cardId: 'unknown-card', quote: 'Unknown evidence cannot be used.' },
        ],
    }],
}, request);
assert.equal(rejectedComparison.agreements.length, 0);
assert.equal(rejectedComparison.differences.length, 0);

console.log('PASS  Commentary comparison selection, overview, and grounding packet');
