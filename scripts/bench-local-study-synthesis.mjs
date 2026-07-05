import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGroundedStudyDraft } from '../src/lib/groundedStudyDraft.js';
import { auditLocalStudyDraft } from '../src/lib/localStudyDraftAudit.js';
import { retrieveStudySourceChunks } from '../src/lib/localStudyGrounding.js';
import { buildStudySynthesisRequest } from '../src/lib/studySynthesisRequest.js';
import { STUDY_SOURCE_CHUNKS } from '../src/data/studySourcePacks.js';
import {
    isLocalStudySelfTalkText,
    isLocalStudyRefusalText,
    normalizeLocalStudyModelDraft,
} from '../src/lib/localStudySynthesis.js';

const bibles = JSON.parse(readFileSync(new URL('../src/data/bible.json', import.meta.url), 'utf8'));
const genesisOneStaticPack = JSON.parse(readFileSync(
    new URL('../public/study-packs/v1/genesis/1.json', import.meta.url),
    'utf8',
));

const observation = {
    id: 'bench-joshua-10-1-adoni-zedek',
    type: 'question',
    quote: 'Adoni-zedek',
    note: "Doesn't Adoni have a positive meaning?",
    reference: 'Joshua 10:1',
};

const route = {
    id: 'word-name',
    label: 'Word/name study',
};

const sourceFindings = [
    {
        id: 'method-word-name',
        title: 'Word and name study guardrail',
        text: 'A word or name study can sharpen an observation, but lexical range is not the same as meaning in context. Give most weight to how the passage uses the word or name.',
        references: [],
        source: {
            id: 'exeges-method',
            label: 'Exeges method notes',
            license: 'App-authored',
        },
    },
    {
        id: 'adoni-zedek-lexical-note',
        title: 'Adoni-zedek lexical note',
        text: 'Adoni-zedek is commonly connected with terms for lord and righteousness or justice. Treat that as a modest lexical clue, not the foundation of the whole interpretation.',
        references: ['Joshua 10:1'],
        source: {
            id: 'exeges-method',
            label: 'Exeges method notes',
            license: 'App-authored',
        },
    },
    {
        id: 'joshua-10-adoni-zedek-context',
        title: 'Adoni-zedek in Joshua 10',
        text: 'Joshua 10 presents Adoni-zedek as the king of Jerusalem who hears about Joshua, Ai, and Gibeon, then gathers other kings against Gibeon.',
        references: ['Joshua 10:1-5'],
        source: {
            id: 'passage-context',
            label: 'Passage context',
            license: 'Derived from the visible Bible passage',
        },
    },
];

const synthesisRequest = buildStudySynthesisRequest({
    observation,
    route,
    sourceFindings,
});

const groundedDraft = buildGroundedStudyDraft(synthesisRequest);

assert.ok(
    groundedDraft?.meaning.includes('Adoni-zedek is commonly connected'),
    'grounded draft should produce a usable meaning from evidence cards without model inference',
);
assert.ok(
    groundedDraft?.guardrail.includes('word or name study'),
    'grounded draft should preserve a passage-first method guardrail',
);

const lightObservation = {
    id: 'bench-genesis-1-3-light',
    type: 'question',
    quote: 'light',
    note: 'What does light mean here?',
    reference: 'Genesis 1:3',
};
const lightRoute = {
    id: 'word-name',
    label: 'Word/name study',
};
const lightFindings = retrieveStudySourceChunks({
    observation: lightObservation,
    route: lightRoute,
    limit: 6,
});
const lightFindingIds = lightFindings.map(finding => finding.id);
const lightExploreFindings = retrieveStudySourceChunks({
    observation: {
        ...lightObservation,
        note: 'Look how powerful God is',
    },
    route: {
        id: 'theological',
        label: 'Theological meaning question',
    },
    limit: 12,
    chunks: [
        ...STUDY_SOURCE_CHUNKS,
        ...genesisOneStaticPack.records,
    ],
});
const lightExploreFindingIds = lightExploreFindings.map(finding => finding.id);

assert.ok(
    lightFindingIds.includes('passage-genesis-1-3-divine-speech'),
    'light question should retrieve the Genesis 1:3 passage-context source',
);
assert.ok(
    lightFindingIds.includes('openbible-cross-genesis-1-3-light-word'),
    'light question should retrieve the Genesis 1:3 cross-reference source',
);
assert.ok(
    !lightFindingIds.includes('easton-adoni-zedek-king'),
    'route match alone should not retrieve unrelated Adoni-zedek evidence for light',
);
assert.ok(
    lightExploreFindingIds.includes('openbible-cross-genesis-1-3'),
    'light source explorer should retrieve the exact Genesis 1:3 cross-reference source',
);
assert.ok(
    !lightExploreFindingIds.includes('openbible-cross-genesis-1-30'),
    'light source explorer should not treat Genesis 1:30 as a strong match for Genesis 1:3',
);

const lightDraft = buildGroundedStudyDraft(buildStudySynthesisRequest({
    observation: lightObservation,
    route: lightRoute,
    sourceFindings: lightFindings,
}));

assert.ok(
    lightDraft?.mainThought.includes('Genesis 1:3 presents God'),
    'light draft should state the passage-first main thought before details',
);
assert.ok(
    !lightDraft?.meaning.includes('word or name study can sharpen'),
    'light draft should not make a generic word-study guardrail the meaning',
);

function countMatches(text, pattern) {
    return text.match(pattern)?.length ?? 0;
}

assert.equal(
    isLocalStudyRefusalText(
        "I'm sorry, but I would need to see the source chunks before I can generate this.",
    ),
    true,
    'refusal detector should catch overly cautious local output',
);

const selfTalkRaw = [
    "Okay, let's tackle this task. The user wants a small grounded interpretation helper based on the provided observation and evidence cards.",
    'First, I need to structure the response with the exact headings: Context, Meaning, Guardrail, Next question, Citations, Confidence.',
    'Guardrail: The user might be testing if they can apply the method.',
].join('\n');

assert.equal(
    isLocalStudySelfTalkText(selfTalkRaw),
    true,
    'self-talk detector should catch local reasoning leakage',
);

const selfTalkDraft = normalizeLocalStudyModelDraft({
    rawText: selfTalkRaw,
    synthesisRequest,
});

assert.equal(
    selfTalkDraft.meaning,
    '',
    'self-talk output should not be promoted into a usable draft field',
);
assert.equal(
    selfTalkDraft.unstructured,
    true,
    'self-talk output should stay quarantined as raw debug text',
);

const repeatedDraft = normalizeLocalStudyModelDraft({
    rawText: [
        'Question: What does Adoni-zedek mean?',
        'Response:',
        'Adoni-zedek means a righteous lord or king, but Joshua 10 presents him as opposing Gibeon.',
        'Question: What does Adoni-zedek mean?',
        'Response:',
        'Adoni-zedek means a righteous lord or king, but Joshua 10 presents him as opposing Gibeon.',
        'Guardrail: Treat the name as a modest clue, not the foundation of the interpretation.',
        'Citations',
        'adoni-zedek-lexical-note',
        'adoni-zedek-lexical-note',
        'Confidence: medium',
    ].join('\n'),
    synthesisRequest,
});

assert.equal(
    countMatches(repeatedDraft.meaning, /Adoni-zedek means/g),
    1,
    'plain-text normalization should collapse repeated Q/A answers',
);
assert.deepEqual(
    repeatedDraft.citations,
    ['adoni-zedek-lexical-note'],
    'citation normalization should dedupe valid evidence-card ids',
);

const bogusCitationDraft = normalizeLocalStudyModelDraft({
    rawText: JSON.stringify({
        context: 'The name appears in Joshua 10:1.',
        meaning: 'The name can raise a lexical question.',
        guardrail: 'Do not cite the selected word as a source.',
        nextQuestion: 'How does Joshua 10 portray this king?',
        citations: ['Adoni-zedek'],
        confidence: 'medium',
    }),
    synthesisRequest,
});

assert.deepEqual(
    bogusCitationDraft.citations,
    [],
    'structured normalization should drop citations that are not evidence-card ids',
);

const validCitationDraft = normalizeLocalStudyModelDraft({
    rawText: JSON.stringify({
        context: 'Joshua 10 presents Adoni-zedek as the king of Jerusalem gathering opposition.',
        meaning: 'The name may carry a positive lexical clue, but the passage emphasizes his hostile role.',
        guardrail: 'Keep the lexical point secondary to the passage context.',
        nextQuestion: 'How does the chapter contrast his title with his actions?',
        citations: ['joshua-10-adoni-zedek-context', 'adoni-zedek-lexical-note'],
        confidence: 'medium',
    }),
    synthesisRequest,
});

assert.deepEqual(
    validCitationDraft.citations,
    ['joshua-10-adoni-zedek-context', 'adoni-zedek-lexical-note'],
    'structured normalization should preserve valid evidence-card ids',
);

const promisingButShakyDraft = normalizeLocalStudyModelDraft({
    rawText: [
        'Context: Adoni-zedek is a significant figure in the biblical narrative, particularly noted for his role as king of Jerusalem (Joshua 10:1-5).',
        "Meaning: The Israelites were commanded to honor God's commandments, including those concerning Adoni-zedek (Exodus 23:4).",
        'Guardrail: Zedek could have symbolic connotations related to justice, righteousness, and divine law.',
        'Next question: What does it mean to say that Adoni-zedek was considered righteous?',
        'Confidence: low',
    ].join('\n'),
    synthesisRequest,
});
const shakyAudit = auditLocalStudyDraft(promisingButShakyDraft, synthesisRequest, { bibles });

assert.equal(
    shakyAudit.status,
    'review',
    'audit should flag drafts with unsupported claims or references',
);
assert.ok(
    shakyAudit.sections.some(section => (
        section.detailsToVerify.includes('Exodus 23:4: valid Bible reference, but not in the retrieved evidence.')
    )),
    'audit should distinguish valid but unretrieved Bible references',
);
assert.ok(
    !shakyAudit.sections.some(section => (
        section.detailsToVerify.some(detail => detail.startsWith('Joshua 10:1-5'))
    )),
    'audit should not flag passage references covered by retrieved evidence',
);
assert.ok(
    !shakyAudit.sections.some(section => section.detailsToVerify.includes('What')),
    'audit should not flag ordinary question starters',
);

const invalidReferenceDraft = normalizeLocalStudyModelDraft({
    rawText: [
        'Context: Joshua 10:99 says Adoni-zedek was a king.',
        'Meaning: The passage should be checked carefully.',
        'Guardrail: Stay close to the text.',
        'Next question: What does Joshua 10 actually say?',
        'Confidence: low',
    ].join('\n'),
    synthesisRequest,
});
const invalidReferenceAudit = auditLocalStudyDraft(invalidReferenceDraft, synthesisRequest, { bibles });

assert.equal(
    invalidReferenceAudit.status,
    'review',
    'audit should review drafts with impossible Bible references',
);
assert.ok(
    invalidReferenceAudit.sections.some(section => (
        section.detailsToVerify.includes('Joshua 10:99: not found in the local Bible corpus.')
    )),
    'audit should flag impossible Bible references against the local Bible corpus',
);

const psalmAliasRequest = buildStudySynthesisRequest({
    observation: {
        id: 'bench-psalm-alias',
        type: 'note',
        quote: 'shepherd',
        reference: 'Psalms 23:1',
    },
    route,
    sourceFindings: [{
        id: 'psalm-23-local-context',
        title: 'Psalm 23 local context',
        text: 'Psalms 23:1 presents the LORD as shepherd.',
        references: ['Psalms 23:1'],
        source: {
            id: 'passage-context',
            label: 'Passage context',
            license: 'Derived from the visible Bible passage',
        },
    }],
});
const psalmAliasDraft = normalizeLocalStudyModelDraft({
    rawText: [
        'Context: Psalm 23:1 presents the LORD as shepherd.',
        'Meaning: The image should be read from the psalm first.',
        'Guardrail: Do not outrun the local image.',
        'Next question: How does the rest of the psalm develop shepherd care?',
        'Citations: psalm-23-local-context',
        'Confidence: medium',
    ].join('\n'),
    synthesisRequest: psalmAliasRequest,
});
const psalmAliasAudit = auditLocalStudyDraft(psalmAliasDraft, psalmAliasRequest, { bibles });

assert.ok(
    !psalmAliasAudit.sections.some(section => (
        section.detailsToVerify.some(detail => detail.startsWith('Psalm 23:1'))
    )),
    'audit should treat Psalm and Psalms aliases as the same book when evidence covers the verse',
);

console.log('local study synthesis benchmark passed');
