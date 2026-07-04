import assert from 'node:assert/strict';
import { buildGroundedStudyDraft } from '../src/lib/groundedStudyDraft.js';
import { buildStudySynthesisRequest } from '../src/lib/studySynthesisRequest.js';
import {
    isLocalStudySelfTalkText,
    isLocalStudyRefusalText,
    normalizeLocalStudyModelDraft,
} from '../src/lib/localStudySynthesis.js';

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

console.log('local study synthesis benchmark passed');
