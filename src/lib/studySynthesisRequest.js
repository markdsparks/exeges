function getObservationLabel(observation) {
    return [
        observation?.reference,
        observation?.quote ? `"${observation.quote}"` : '',
    ].filter(Boolean).join(' ');
}

function formatSourceFinding(finding) {
    return {
        id: finding.id,
        title: finding.title,
        sourceId: finding.source?.id ?? '',
        sourceLabel: finding.source?.label ?? '',
        license: finding.source?.license ?? '',
        references: finding.references ?? [],
        text: finding.text,
    };
}

export function buildStudySynthesisRequest({ observation, route, sourceFindings }) {
    const findings = sourceFindings.map(formatSourceFinding);

    return {
        engine: 'on-device-slm',
        mode: 'grounded-interpretation-helper',
        observation: {
            label: getObservationLabel(observation),
            type: observation?.type ?? '',
            quote: observation?.quote ?? '',
            note: observation?.note ?? '',
            reference: observation?.reference ?? '',
        },
        route: {
            id: route?.id ?? 'general',
            label: route?.label ?? 'Study question',
        },
        sources: findings,
        instructions: [
            'Use only the observation, visible passage context, and source chunks supplied here.',
            'Keep the passage itself as the primary authority.',
            'Separate what the source supports from what remains uncertain.',
            'Do not invent lexical, historical, or cross-reference claims.',
        ],
        responseShape: {
            context: 'What the passage itself shows.',
            meaning: 'A concise interpretation shaped by the passage and sources.',
            guardrail: 'A caution that prevents over-reading.',
            nextQuestion: 'One helpful next study question.',
            citations: 'Source chunk ids used.',
            confidence: 'low | medium | high',
        },
    };
}
