import { cleanStudyToken } from './studyMethod';

const BACKGROUND_GUIDES = [
    {
        id: 'adoni-zedek',
        title: 'Adoni-zedek',
        subtitle: 'Name / word question',
        matches: ['adoni-zedek', 'adonizedek', 'adoni zedek'],
        sourceNotes: [
            {
                label: 'Lexical note',
                text: 'The name is commonly connected with terms for lord and righteousness or justice.',
                sourceLabel: "BibleHub Strong's Hebrew 139",
                href: 'https://biblehub.com/hebrew/139.htm',
            },
            {
                label: 'Caution',
                text: 'Lexicons give a few possible readings, including Lord of righteousness, my lord is righteous, or a divine-name reading.',
                sourceLabel: 'BDB summary via BibleHub',
                href: 'https://biblehub.com/hebrew/139.htm',
            },
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

function normalizeLookupText(text) {
    return (text ?? '')
        .toLowerCase()
        .replace(/[\u2019']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function makeLookupCandidates(observation) {
    const pieces = [
        observation?.quote,
        observation?.note,
        ...(observation?.selections ?? []).map(item => item.text),
    ];

    const joined = normalizeLookupText(pieces.join(' '));
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
    const observationText = normalizeLookupText([
        observation?.quote,
        observation?.note,
        ...(observation?.selections ?? []).map(item => item.text),
    ].join(' '));

    return guide.matches.some(match => {
        const normalizedMatch = normalizeLookupText(match);
        return candidates.has(normalizedMatch)
            || candidates.has(normalizedMatch.replace(/\s+/g, ''))
            || observationText.includes(normalizedMatch);
    });
}

export function getBackgroundGuideForObservation(observation) {
    if (!observation) return null;

    const exactGuide = BACKGROUND_GUIDES.find(guide => guideMatchesObservation(guide, observation));
    if (exactGuide) return { ...exactGuide, exact: true };

    if (observation.type !== 'question') return null;

    return {
        id: 'generic-background-question',
        title: observation.quote,
        subtitle: 'Background question',
        exact: false,
        sourceNotes: [
            {
                label: 'Research path',
                text: 'Start with the passage, then check curated lexicons, cross references, and Bible dictionary notes before broad web results.',
            },
        ],
        contextNotes: [
            'Ask what the immediate passage already tells you before importing outside material.',
            'Use background information to sharpen the observation, not to replace the text.',
        ],
        synthesis: [
            'This may be a word, name, geography, history, or culture question.',
            'A good answer should say what is known, what is uncertain, and how much it changes the interpretation.',
        ],
        contextDraft: `This question needs background research on ${observation.quote}, but the interpretation should start from how it functions in this passage.`,
        guardrailDraft: 'Treat background material as supporting evidence. Do not let an outside source control the meaning apart from the passage.',
        meaningDraft: '',
    };
}
