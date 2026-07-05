const SOURCE_PRIORITIES = [
    'passage-context',
    'exeges-method',
    'easton-dictionary',
    'smith-dictionary',
    'openbible-cross-references',
    'openbible-geocoding',
];

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function getEvidenceCards(synthesisRequest) {
    if (synthesisRequest?.evidenceCards?.length) {
        return synthesisRequest.evidenceCards;
    }

    return (synthesisRequest?.sources ?? []).map(source => ({
        id: source.id,
        title: source.title,
        sourceId: source.sourceId,
        sourceLabel: source.sourceLabel,
        scope: source.references?.join(', ') || 'source chunk',
        allowedUse: 'Use only as supporting context.',
        claim: source.text,
    }));
}

function getCardsBySource(cards, sourceId) {
    return cards.filter(card => card.sourceId === sourceId);
}

function getFirstCard(cards, sourceId) {
    return getCardsBySource(cards, sourceId)[0] ?? null;
}

function isGenericMethodCard(card) {
    return card.sourceId === 'exeges-method'
        && (
            /^method-(passage-first|word-name|cross-reference-guardrail|historical-cultural|theological-synthesis)$/u.test(card.id ?? '')
            || (card.id ?? '').startsWith('source-')
            || /guardrail|source path|passage-first interpretation/i.test(`${card.title} ${card.claim}`)
        );
}

function truncateSentence(text, maxLength = 220) {
    const clean = cleanText(text).replace(/\s+/g, ' ');
    if (clean.length <= maxLength) return clean;

    const sentenceEnd = clean.slice(0, maxLength).lastIndexOf('.');
    if (sentenceEnd > 80) return clean.slice(0, sentenceEnd + 1);

    return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function sortCards(cards) {
    return [...cards].sort((first, second) => {
        const firstPriority = SOURCE_PRIORITIES.indexOf(first.sourceId);
        const secondPriority = SOURCE_PRIORITIES.indexOf(second.sourceId);
        const normalizedFirst = firstPriority === -1 ? SOURCE_PRIORITIES.length : firstPriority;
        const normalizedSecond = secondPriority === -1 ? SOURCE_PRIORITIES.length : secondPriority;

        return normalizedFirst - normalizedSecond || first.title.localeCompare(second.title);
    });
}

function makeContext({ cards, observation }) {
    const passageCard = getFirstCard(cards, 'passage-context');
    if (passageCard?.claim) return cleanText(passageCard.claim);

    const reference = cleanText(observation.reference);
    const quote = cleanText(observation.quote);

    if (reference && quote) {
        return `${quote} is the selected detail in ${reference}; start by asking how it functions in the sentence and chapter.`;
    }

    if (reference) {
        return `Start with what the selected detail does in ${reference} before widening to background sources.`;
    }

    return 'Start with the selected words in their sentence and chapter before widening to background sources.';
}

function makeMainThought({ cards, observation }) {
    const passageCard = getFirstCard(cards, 'passage-context');
    const crossReferenceCard = getFirstCard(cards, 'openbible-cross-references');
    const quote = cleanText(observation.quote);
    const reference = cleanText(observation.reference);

    if (passageCard?.claim && crossReferenceCard?.claim) {
        return `${truncateSentence(passageCard.claim, 170)} Use cross references as next-step leads, not as the foundation.`;
    }

    if (passageCard?.claim) {
        return truncateSentence(passageCard.claim);
    }

    if (crossReferenceCard?.claim && reference) {
        return `${reference} should be read locally first; then use the cross-reference leads to trace the theme carefully.`;
    }

    if (quote && reference) {
        return `${reference} is the anchor. Ask what ${quote} does in the passage before widening to outside sources.`;
    }

    if (quote) {
        return `Start with what ${quote} does in the sentence and chapter before widening to outside sources.`;
    }

    return 'Start with the passage itself, then let curated sources clarify one focused question at a time.';
}

function makeMeaning({ cards, observation }) {
    const quote = cleanText(observation.quote);
    const lexicalCard = cards.find(card => (
        !isGenericMethodCard(card) && /lexical|word|name/i.test(`${card.title} ${card.claim}`)
    ));
    const passageCard = getFirstCard(cards, 'passage-context');
    const crossReferenceCard = getFirstCard(cards, 'openbible-cross-references');

    if (lexicalCard?.claim && passageCard?.claim) {
        return `${cleanText(lexicalCard.claim)} In this passage, weigh that clue under the local context: ${cleanText(passageCard.claim)}`;
    }

    if (lexicalCard?.claim) {
        return cleanText(lexicalCard.claim);
    }

    if (passageCard?.claim) {
        return cleanText(passageCard.claim);
    }

    if (crossReferenceCard?.claim) {
        return cleanText(crossReferenceCard.claim);
    }

    const factualCard = sortCards(cards).find(card => (
        card.sourceId !== 'exeges-method' || !isGenericMethodCard(card)
    ));
    if (factualCard?.claim) {
        return cleanText(factualCard.claim);
    }

    const methodCard = getFirstCard(cards, 'exeges-method');
    if (methodCard?.claim && quote) {
        return `${quote} may matter, but its meaning should be tested by how the passage uses it. ${cleanText(methodCard.claim)}`;
    }

    return 'This is worth exploring, but keep the interpretation tied to what the passage itself shows.';
}

function makeGuardrail({ cards }) {
    const methodCard = getCardsBySource(cards, 'exeges-method').find(card => (
        /guardrail|method|passage-first|word and name/i.test(`${card.title} ${card.claim}`)
    )) ?? getFirstCard(cards, 'exeges-method');

    if (methodCard?.claim) return cleanText(methodCard.claim);

    return 'Use background as a servant to the text: do not make a lexical, historical, or theological claim stronger than the passage supports.';
}

function makeNextQuestion({ observation }) {
    const quote = cleanText(observation.quote);
    const note = cleanText(observation.note);

    if (quote && note) {
        return `How does the passage itself confirm, complicate, or limit this question about ${quote}?`;
    }

    if (quote) {
        return `What does the passage emphasize about ${quote}, and what would be over-reading it?`;
    }

    return 'What in the immediate context most clearly supports this interpretation?';
}

export function buildGroundedStudyDraft(synthesisRequest) {
    const cards = sortCards(getEvidenceCards(synthesisRequest));
    const observation = synthesisRequest?.observation ?? {};

    if (!cards.length) return null;

    return {
        mainThought: makeMainThought({ cards, observation }),
        context: makeContext({ cards, observation }),
        meaning: makeMeaning({ cards, observation }),
        guardrail: makeGuardrail({ cards, observation }),
        nextQuestion: makeNextQuestion({ observation }),
        citations: cards.map(card => card.id).filter(Boolean),
        confidence: cards.some(card => card.sourceId === 'passage-context') ? 'medium' : 'low',
        modelId: 'curated-grounding',
        rawText: '',
        unstructured: false,
        parseError: '',
        sourceCount: synthesisRequest?.sources?.length ?? cards.length,
    };
}
