import assert from 'node:assert/strict';
import {
    buildCommentaryComparisonRequest,
    buildCommentaryOverview,
    getSuggestedCommentarySourceIds,
    loadPassageCommentaryReport,
    normalizeCommentaryComparisonDraft,
    selectRelevantCommentaryEntry,
    toCommentaryFinding,
} from '../src/lib/commentaryComparison.js';
import {
    parseLocalCommentaryComparison,
    runLocalStudyTaskWithDeadline,
    shouldRetryLocalCommentaryComparison,
    stopLocalStudyGeneration,
} from '../src/lib/localStudySynthesis.js';

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
assert.equal(groupedFinding.source.type, 'commentary');

const tyndaleFinding = toCommentaryFinding(
    {
        id: 'tyndale',
        label: 'Tyndale Study Notes',
        href: 'https://tyndaleopenresources.com/',
        license: 'CC BY-SA 4.0',
        licenseHref: 'https://creativecommons.org/licenses/by-sa/4.0/',
        attribution: 'Tyndale Open Study Notes Copyright 2022 Tyndale House Publishers.',
        type: 'study-notes',
    },
    { verse: 3, text: 'God speaks, and light appears.' },
    'Genesis',
    1,
    3,
);
assert.equal(tyndaleFinding.source.type, 'study-notes');
assert.match(tyndaleFinding.allowedUse, /study notes/i);
assert.doesNotMatch(tyndaleFinding.allowedUse, /historical commentary/i);

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
assert.match(overview.shared, /selected source excerpts/i);

const singleSourceOverview = buildCommentaryOverview({
    target,
    commentaryFindings: [commentaryFindings[0]],
});
assert.equal(singleSourceOverview.mode, 'single');
assert.match(singleSourceOverview.summary, /First source offers one commentary perspective/i);
assert.match(singleSourceOverview.caution, /cannot show consensus or disagreement/i);
assert.equal(singleSourceOverview.perspectives.length, 1);

const emptyOverview = buildCommentaryOverview({ target, commentaryFindings: [] });
assert.equal(emptyOverview.mode, 'empty');
assert.match(emptyOverview.summary, /no commentary excerpt could be matched/i);
assert.doesNotMatch(emptyOverview.summary, /commentaries|consensus|disagreement/i);
assert.equal(emptyOverview.perspectives.length, 0);

const suggestedSources = getSuggestedCommentarySourceIds([
    commentaryFindings[0],
    {
        ...commentaryFindings[1],
        source: { id: 'commentary-tyndale', label: 'Tyndale Study Notes', type: 'study-notes' },
    },
    commentaryFindings[2],
], 2);
assert.deepEqual(suggestedSources, ['commentary-tyndale', 'commentary-one']);
assert.deepEqual(getSuggestedCommentarySourceIds([
    commentaryFindings[0],
    {
        ...commentaryFindings[1],
        source: { id: 'commentary-tyndale', label: 'Tyndale Study Notes', type: 'study-notes' },
    },
], 1), ['commentary-tyndale']);
assert.equal(getSuggestedCommentarySourceIds(commentaryFindings, 9).length, 3);

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

const tyndaleRequest = buildCommentaryComparisonRequest({
    target,
    commentaryFindings: [tyndaleFinding, commentaryFindings[0]],
});
const tyndaleCard = tyndaleRequest.evidenceCards.find(card => card.id === tyndaleFinding.id);
assert.equal(tyndaleCard.sourceType, 'study-notes');
assert.match(tyndaleCard.attribution, /Tyndale House Publishers/i);
assert.match(tyndaleCard.licenseUrl, /creativecommons\.org/i);

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

const locallyParsedComparison = parseLocalCommentaryComparison(JSON.stringify({
    agreements: [{
        evidence: [
            { cardId: 'commentary-one', quote: 'God speaks, and light immediately appears.' },
            { cardId: 'commentary-two', quote: 'Light appears in response to the word God speaks.' },
        ],
    }],
    differences: [],
}), request);
assert.equal(locallyParsedComparison?.agreements.length, 1);
assert.equal(
    parseLocalCommentaryComparison('{"agreements":[', request),
    null,
    'an incomplete local-model response should be recognized for retry instead of surfacing a JSON parser error',
);
assert.equal(
    shouldRetryLocalCommentaryComparison(parseLocalCommentaryComparison(JSON.stringify({
        agreements: [{
            evidence: [
                { cardId: 'commentary-one', quote: 'This is not an exact source quotation.' },
                { cardId: 'commentary-two', quote: 'Nor is this source evidence.' },
            ],
        }],
        differences: [],
    }), request)),
    true,
    'a syntactically valid response with unverified evidence should get one recovery attempt',
);
assert.doesNotThrow(
    () => stopLocalStudyGeneration(),
    'stopping a comparison must remain safe when no local model has loaded',
);
let rejectTimeoutCancellation;
const timeoutRun = {
    cancellation: new Promise((_, reject) => {
        rejectTimeoutCancellation = reject;
    }),
    cancel(message) {
        rejectTimeoutCancellation(new Error(message));
    },
};
await assert.rejects(
    runLocalStudyTaskWithDeadline(timeoutRun, () => new Promise(() => {}), {
        timeoutMs: 0,
        timeoutMessage: 'The local comparison took too long to finish.',
    }),
    /took too long/i,
);
let stopCancellation;
let stopCalls = 0;
const stoppedRun = {
    cancellation: new Promise((_, reject) => {
        stopCancellation = reject;
    }),
    cancel(message) {
        stopCalls += 1;
        stopCancellation(new Error(message));
    },
};
const stoppedTask = runLocalStudyTaskWithDeadline(stoppedRun, () => new Promise(() => {}), {
    timeoutMs: 20,
    timeoutMessage: 'The stale deadline should not fire after stopping.',
});
stoppedRun.cancel('Local model pass stopped.');
await assert.rejects(stoppedTask, /stopped/i);
await new Promise(resolve => setTimeout(resolve, 30));
assert.equal(stopCalls, 1, 'stopping a local run should clear its deadline before a later retry can start');

console.log('PASS  Commentary comparison selection, overview, and grounding packet');
