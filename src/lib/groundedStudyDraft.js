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

function makeMeaning({ cards, observation }) {
    const quote = cleanText(observation.quote);
    const lexicalCard = cards.find(card => (
        /lexical|word|name/i.test(`${card.title} ${card.claim}`)
    ));
    const passageCard = getFirstCard(cards, 'passage-context');

    if (lexicalCard?.claim && passageCard?.claim) {
        return `${cleanText(lexicalCard.claim)} In this passage, weigh that clue under the local context: ${cleanText(passageCard.claim)}`;
    }

    if (lexicalCard?.claim) {
        return cleanText(lexicalCard.claim);
    }

    const factualCard = sortCards(cards).find(card => card.sourceId !== 'exeges-method');
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
