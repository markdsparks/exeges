import { cleanStudyToken } from './studyMethod';

const BACKGROUND_SOURCES = {
    bibleHubHebrew139: {
        label: "BibleHub Strong's Hebrew 139",
        href: 'https://biblehub.com/hebrew/139.htm',
    },
    bibleHubBdbHebrew139: {
        label: 'BDB summary via BibleHub',
        href: 'https://biblehub.com/hebrew/139.htm',
    },
};

function attachSource(note) {
    if (!note.sourceId) return note;

    const source = BACKGROUND_SOURCES[note.sourceId];
    if (!source) return note;

    return {
        ...note,
        sourceLabel: source.label,
        href: source.href,
    };
}

const EXACT_BACKGROUND_GUIDES = [
    {
        id: 'adoni-zedek',
        routeId: 'word-name',
        title: 'Adoni-zedek',
        subtitle: 'Name / word question',
        matches: ['adoni-zedek', 'adonizedek', 'adoni zedek'],
        reason: 'Matched a curated lexical card for Adoni-zedek.',
        sourceNotes: [
            attachSource({
                label: 'Lexical note',
                text: 'The name is commonly connected with terms for lord and righteousness or justice.',
                sourceId: 'bibleHubHebrew139',
            }),
            attachSource({
                label: 'Caution',
                text: 'Lexicons give a few possible readings, including Lord of righteousness, my lord is righteous, or a divine-name reading.',
                sourceId: 'bibleHubBdbHebrew139',
            }),
        ],
        contextNotes: [
            'In Joshua 10, Adoni-zedek hears about Joshua, Ai, and Gibeon, then gathers a coalition against Gibeon.',
            'The immediate context presents him as a threatened king resisting Israel and the protected Gibeonites.',
        ],
        synthesis: [
            'The righteousness-sounding name may sharpen the irony of a ruler acting against the LORD\'s covenant movement.',
            'Keep the claim modest: the passage emphasizes his actions, while the name can support the observation.',
        ],
        contextDraft: 'Adoni-zedek has a righteousness- or justice-sounding name, but Joshua 10 presents him gathering opposition after hearing about Joshua, Ai, and Gibeon.',
        guardrailDraft: 'Do not build the interpretation on the name alone. The name may add irony, but the passage itself should remain the main evidence.',
        meaningDraft: 'The name may highlight an irony: a ruler associated with righteousness or justice acts in resistance to the LORD\'s covenant purposes.',
    },
];

const BACKGROUND_ROUTES = {
    'word-name': {
        id: 'word-name',
        label: 'Word / name question',
        subtitle: 'Word / name study path',
        reason: 'This looks like a question about meaning, naming, wording, or translation.',
        sourceNotes: [
            {
                label: 'Primary check',
                text: 'Use original-language and name resources to learn the range of possible meanings.',
                sourceLabel: 'Lexicons, name dictionaries, translation notes',
            },
            {
                label: 'Second check',
                text: 'Compare how the word or name functions in the surrounding passage before using it as interpretive evidence.',
                sourceLabel: 'Immediate context and cross references',
            },
        ],
        contextNotes: focus => [
            `Ask what ${focus} is doing in this sentence and chapter before reaching for a word study.`,
            'Notice whether the author draws attention to the word or name, or whether it simply identifies someone or something.',
        ],
        synthesis: [
            'A word or name can sharpen an observation, but context decides how much weight it should carry.',
            'A careful answer should distinguish lexical possibility from what the passage is actually emphasizing.',
        ],
        drafts: focus => ({
            contextDraft: `${focus} may need a word or name study, but its role in this passage should control the interpretation.`,
            guardrailDraft: 'Do not build the main interpretation on a lexical detail unless the passage itself supports that emphasis.',
            meaningDraft: '',
        }),
    },
    person: {
        id: 'person',
        label: 'Person / role question',
        subtitle: 'Person and role study path',
        reason: 'This looks like a question about a person, title, office, or role in the passage.',
        sourceNotes: [
            {
                label: 'Primary check',
                text: 'Start with what this passage says about the person before importing a profile from elsewhere.',
                sourceLabel: 'Immediate context',
            },
            {
                label: 'Second check',
                text: 'If needed, use a Bible dictionary or canonical references to identify the person and their role.',
                sourceLabel: 'Bible dictionaries and cross references',
            },
        ],
        contextNotes: focus => [
            `List what the passage directly says ${focus} does, wants, fears, says, or receives.`,
            'Separate the person in this scene from everything else known about them in the canon.',
        ],
        synthesis: [
            'People in narrative usually matter because of their actions, relationships, speech, or contrast with others.',
            'A good interpretation should explain the role this person plays in the movement of the passage.',
        ],
        drafts: focus => ({
            contextDraft: `${focus} should be interpreted first by their role and actions in this scene.`,
            guardrailDraft: 'Do not flatten this person into a dictionary entry. Let the passage show why they matter here.',
            meaningDraft: '',
        }),
    },
    place: {
        id: 'place',
        label: 'Place / geography question',
        subtitle: 'Place and geography study path',
        reason: 'This looks like a question about place, geography, movement, or territory.',
        sourceNotes: [
            {
                label: 'Primary check',
                text: 'Use the passage to identify who is there, who moves, and why the place matters in the scene.',
                sourceLabel: 'Immediate context',
            },
            {
                label: 'Second check',
                text: 'Use an atlas or Bible dictionary only after the passage has framed the place.',
                sourceLabel: 'Bible atlas and dictionary',
            },
        ],
        contextNotes: focus => [
            `Ask whether ${focus} marks danger, promise, distance, territory, worship, exile, or conflict.`,
            'Watch for movement into or out of the place; geography often carries narrative pressure.',
        ],
        synthesis: [
            'A place can matter historically, theologically, or narratively, but not every location carries the same weight.',
            'The strongest answer will connect geography to the passage movement rather than trivia.',
        ],
        drafts: focus => ({
            contextDraft: `${focus} may matter geographically, but the interpretation should begin with how the place functions in this passage.`,
            guardrailDraft: 'Use maps and background notes to clarify the scene, not to add significance the passage does not suggest.',
            meaningDraft: '',
        }),
    },
    'historical-cultural': {
        id: 'historical-cultural',
        label: 'History / culture question',
        subtitle: 'Historical background path',
        reason: 'This looks like a question about customs, history, politics, conflict, or ancient practice.',
        sourceNotes: [
            {
                label: 'Primary check',
                text: 'Identify what the passage itself explains and what it leaves assumed.',
                sourceLabel: 'Immediate context',
            },
            {
                label: 'Second check',
                text: 'Use historical background sources to clarify ancient setting without making them the main point.',
                sourceLabel: 'Bible dictionaries, atlases, historical introductions',
            },
        ],
        contextNotes: focus => [
            `Ask why ${focus} would matter to the original scene and first hearers.`,
            'Look for cause, threat, covenant, public honor, shame, ritual, law, or political pressure in the passage.',
        ],
        synthesis: [
            'Historical background is most helpful when it clarifies a detail the text assumes.',
            'A good answer should say what the background explains and what remains uncertain.',
        ],
        drafts: focus => ({
            contextDraft: `${focus} may require historical or cultural background, but the passage should define the interpretive question first.`,
            guardrailDraft: 'Treat background material as clarifying evidence. Do not let it replace the main argument of the passage.',
            meaningDraft: '',
        }),
    },
    canonical: {
        id: 'canonical',
        label: 'Cross-reference question',
        subtitle: 'Canonical context path',
        reason: 'This looks like a question about how this passage relates to other passages.',
        sourceNotes: [
            {
                label: 'Primary check',
                text: 'First interpret this passage in its own literary context.',
                sourceLabel: 'Immediate context',
            },
            {
                label: 'Second check',
                text: 'Then compare clear cross references, quotations, echoes, promises, or fulfillment patterns.',
                sourceLabel: 'Cross references and canonical context',
            },
        ],
        contextNotes: focus => [
            `Ask whether ${focus} is repeated, quoted, fulfilled, contrasted, or developed elsewhere.`,
            'Favor clear textual links over loose thematic similarities.',
        ],
        synthesis: [
            'Cross references can widen interpretation, but they should not short-circuit the local meaning.',
            'The safest path is local meaning first, then canonical development.',
        ],
        drafts: focus => ({
            contextDraft: `${focus} may connect to other passages, but this chapter should be interpreted on its own terms first.`,
            guardrailDraft: 'Use cross references after local context. Do not import a later idea unless the connection is textually clear.',
            meaningDraft: '',
        }),
    },
    theological: {
        id: 'theological',
        label: 'Theological meaning question',
        subtitle: 'Theological synthesis path',
        reason: 'This looks like an observation about God, humanity, sin, covenant, promise, worship, or obedience.',
        sourceNotes: [
            {
                label: 'Primary check',
                text: 'Name what the passage directly reveals before turning it into a broad doctrine.',
                sourceLabel: 'Immediate context',
            },
            {
                label: 'Second check',
                text: 'Compare the observation with the book context and clearer teaching elsewhere in Scripture.',
                sourceLabel: 'Book context and whole-Bible theology',
            },
        ],
        contextNotes: focus => [
            `Ask what ${focus} shows in this passage before asking how it fits larger theology.`,
            'Notice whether the passage reveals character, promise, warning, command, judgment, mercy, or worship.',
        ],
        synthesis: [
            'Theology should rise from the passage, not hover above it.',
            'A good interpretation can say both what is true and how this text uniquely shows it.',
        ],
        drafts: focus => ({
            contextDraft: `${focus} appears to raise a theological observation. The interpretation should name what this passage specifically reveals.`,
            guardrailDraft: 'Do not turn the observation into a broad doctrine too quickly. Let this passage shape the claim.',
            meaningDraft: '',
        }),
    },
    general: {
        id: 'general',
        label: 'Study question',
        subtitle: 'Grounded study path',
        reason: 'This question needs a careful passage-first study path.',
        sourceNotes: [
            {
                label: 'Primary check',
                text: 'Start with the sentence, paragraph, and chapter before consulting outside resources.',
                sourceLabel: 'Immediate context',
            },
            {
                label: 'Second check',
                text: 'Only then use trusted study tools that fit the question being asked.',
                sourceLabel: 'Curated study resources',
            },
        ],
        contextNotes: focus => [
            `Ask what the passage already tells you about ${focus}.`,
            'Write down what is known, what is unclear, and what would actually change the interpretation.',
        ],
        synthesis: [
            'The goal is not to answer every curiosity, but to answer the questions that help interpret the passage faithfully.',
            'A careful answer should be honest about uncertainty.',
        ],
        drafts: focus => ({
            contextDraft: `${focus} needs a passage-first study path before drawing a conclusion.`,
            guardrailDraft: 'Use outside resources to support interpretation, not to replace careful reading.',
            meaningDraft: '',
        }),
    },
};

const WORD_NAME_CUE = /\b(mean|means|meaning|name|named|called|word|phrase|hebrew|greek|aramaic|translate|translated|translation|root|lexicon|strongs?)\b/;
const PLACE_CUE = /\b(where|place|city|town|region|land|mountain|river|valley|wilderness|border|territory|jerusalem|gibeon|ai|egypt|babylon|galilee|judea|samaria)\b/;
const PERSON_CUE = /\b(person|king|queen|priest|prophet|judge|apostle|pharisee|sadducee|ruler|commander|son of|daughter of)\b/;
const HISTORICAL_CUE = /\b(why did|why would|custom|culture|histor|background|war|battle|empire|kingdom|circumcis|devoted|destruction|exile|feast|sabbath|sacrifice|temple|tabernacle)\b/;
const CANONICAL_CUE = /\b(elsewhere|again|cross reference|another passage|new testament|old testament|fulfill|fulfilled|promise|prophecy|echo|allude|allusion|quoted)\b/;
const THEOLOGICAL_CUE = /\b(god|lord|yahweh|christ|jesus|spirit|sin|grace|faith|righteous|justice|mercy|judg|salvation|covenant|promise|kingdom|glory|worship|powerful|sovereign|holy)\b/;

function normalizeLookupText(text) {
    return (text ?? '')
        .toLowerCase()
        .replace(/[\u2019']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function getObservationText(observation) {
    return [
        observation?.quote,
        observation?.note,
        ...(observation?.selections ?? []).map(item => item.text),
    ].join(' ');
}

function getObservationFocus(observation) {
    const focus = (observation?.quote || (observation?.selections ?? []).map(item => item.text).join(' ')).replace(/\s+/g, ' ').trim();
    return focus || 'this observation';
}

function makeLookupCandidates(observation) {
    const joined = normalizeLookupText(getObservationText(observation));
    const tokens = joined.split(/\s+/).filter(Boolean);
    const cleanTokens = tokens.map(cleanStudyToken).filter(Boolean);

    return new Set([
        joined,
        joined.replace(/\s+/g, ''),
        ...tokens,
        ...cleanTokens,
    ]);
}

function guideMatchesObservation(guide, observation) {
    const candidates = makeLookupCandidates(observation);
    const observationText = normalizeLookupText(getObservationText(observation));

    return guide.matches.some(match => {
        const normalizedMatch = normalizeLookupText(match);
        return candidates.has(normalizedMatch)
            || candidates.has(normalizedMatch.replace(/\s+/g, ''))
            || observationText.includes(normalizedMatch);
    });
}

function hasCue(text, cue) {
    cue.lastIndex = 0;
    return cue.test(text);
}

export function classifyBackgroundQuestion(observation) {
    if (!observation) return BACKGROUND_ROUTES.general;

    const text = normalizeLookupText(getObservationText(observation));
    const quote = observation?.quote ?? '';

    if (hasCue(text, WORD_NAME_CUE) || /\w-\w/.test(quote)) return BACKGROUND_ROUTES['word-name'];
    if (observation.type === 'place' || hasCue(text, PLACE_CUE)) return BACKGROUND_ROUTES.place;
    if (observation.type === 'person' || hasCue(text, PERSON_CUE)) return BACKGROUND_ROUTES.person;
    if (hasCue(text, CANONICAL_CUE)) return BACKGROUND_ROUTES.canonical;
    if (hasCue(text, HISTORICAL_CUE)) return BACKGROUND_ROUTES['historical-cultural'];
    if (hasCue(text, THEOLOGICAL_CUE) || observation.type === 'command') return BACKGROUND_ROUTES.theological;

    return BACKGROUND_ROUTES.general;
}

function shouldShowRoutedGuide(observation, route) {
    if (!observation) return false;
    if (observation.type === 'question') return true;
    if (/[?]/.test(observation.note ?? '')) return true;
    if (['person', 'place', 'key-term'].includes(observation.type)) return true;
    if (route.id === 'theological' && hasCue(normalizeLookupText(getObservationText(observation)), THEOLOGICAL_CUE)) return true;
    if (route.id === 'historical-cultural' && hasCue(normalizeLookupText(getObservationText(observation)), HISTORICAL_CUE)) return true;
    return false;
}

function buildRoutedGuide(observation, route) {
    const focus = getObservationFocus(observation);
    const drafts = route.drafts(focus);

    return {
        id: `routed-${route.id}`,
        title: focus,
        subtitle: route.subtitle,
        routeId: route.id,
        routeLabel: route.label,
        reason: route.reason,
        exact: false,
        sourceNotes: route.sourceNotes,
        contextNotes: route.contextNotes(focus),
        synthesis: route.synthesis,
        ...drafts,
    };
}

function hydrateExactGuide(guide) {
    const route = BACKGROUND_ROUTES[guide.routeId] ?? BACKGROUND_ROUTES.general;

    return {
        ...guide,
        routeLabel: route.label,
        exact: true,
    };
}

export function getBackgroundGuideForObservation(observation) {
    if (!observation) return null;

    const exactGuide = EXACT_BACKGROUND_GUIDES.find(guide => guideMatchesObservation(guide, observation));
    if (exactGuide) return hydrateExactGuide(exactGuide);

    const route = classifyBackgroundQuestion(observation);
    if (!shouldShowRoutedGuide(observation, route)) return null;

    return buildRoutedGuide(observation, route);
}
