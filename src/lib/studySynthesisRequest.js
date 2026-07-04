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

function getAllowedUse(finding) {
    const sourceId = finding.source?.id ?? '';

    if (sourceId === 'passage-context') {
        return 'Use as local passage context only; do not turn it into a lexical or historical claim.';
    }

    if (sourceId === 'exeges-method') {
        return 'Use as a method guardrail; do not cite as factual background beyond the method principle.';
    }

    if (sourceId.includes('dictionary')) {
        return 'Use as background starting-point evidence; keep the claim modest and passage-first.';
    }

    if (sourceId.includes('cross-references')) {
        return 'Use after local context is clear; favor direct textual links over loose thematic links.';
    }

    if (sourceId.includes('geocoding')) {
        return 'Use for geography or place-setting questions; keep location claims tentative.';
    }

    return 'Use only as supporting context.';
}

function getEvidenceScope(finding) {
    return finding.references?.length
        ? finding.references.join(', ')
        : 'general method or background';
}

function formatEvidenceCard(finding) {
    return {
        id: finding.id,
        title: finding.title,
        sourceId: finding.source?.id ?? '',
        sourceLabel: finding.source?.label ?? '',
        license: finding.source?.license ?? '',
        scope: getEvidenceScope(finding),
        allowedUse: getAllowedUse(finding),
        claim: finding.text,
    };
}

export function buildStudySynthesisRequest({ observation, route, sourceFindings }) {
    const findings = (sourceFindings ?? []).map(formatSourceFinding);
    const evidenceCards = (sourceFindings ?? []).map(formatEvidenceCard);

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
        evidenceCards,
        instructions: [
            'Use only the observation, visible passage context, and evidence cards supplied here.',
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
