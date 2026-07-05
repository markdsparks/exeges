import { useEffect, useRef, useState } from 'react';
import {
    STUDY_STAGES,
    getObservationTypeLabel,
    getSelectionQuote,
} from '../../lib/studyMethod';
import { getBackgroundGuideForObservation } from '../../lib/backgroundGuides';
import { buildGroundedStudyDraft } from '../../lib/groundedStudyDraft';
import { auditLocalStudyDraft } from '../../lib/localStudyDraftAudit';
import {
    getLocalStudyCapabilities,
    getLocalStudyGroundingWithStaticPacks,
} from '../../lib/localStudyGrounding';
import {
    LOCAL_STUDY_SLM_MODEL_ID,
    LOCAL_STUDY_SLM_MODELS,
    draftLocalStudySynthesis,
} from '../../lib/localStudySynthesis';
import StudySelectionPanel from './StudySelectionPanel';

const EMPTY_DRAFT = {
    observe: '',
    interpret: '',
    apply: '',
};

const INTERPRET_HELPERS = [
    {
        key: 'summary',
        label: 'Working meaning',
        prompt: 'Write one faithful sentence from what the passage shows.',
        placeholder: "Genesis 1:3 shows that God's word powerfully brings light into being.",
    },
];

const INTERPRET_PATHS = [
    {
        key: 'word-name',
        label: 'Word or name',
        question: 'What does this word or name mean here?',
        routeIds: ['word-name', 'person', 'place'],
    },
    {
        key: 'purpose',
        label: 'Why here',
        question: 'Why is this detail here?',
        routeIds: ['general', 'historical-cultural'],
    },
    {
        key: 'reveal',
        label: 'Reveals',
        question: 'What does this show about God or people?',
        routeIds: ['theological'],
    },
    {
        key: 'connect',
        label: 'Connects',
        question: 'How does this connect to the rest of Scripture?',
        routeIds: ['canonical'],
    },
];

const SOURCE_BUCKETS = [
    { key: 'bible', label: 'Bible refs' },
    { key: 'word', label: 'Word / name' },
    { key: 'context', label: 'Context' },
    { key: 'method', label: 'Method' },
    { key: 'other', label: 'Other sources' },
];

const APPLICATION_HELPERS = [
    {
        key: 'worship',
        label: 'Worship',
        prompt: 'What does this lead you to praise God for?',
        placeholder: 'Praise God that his word is powerful and life-giving.',
    },
    {
        key: 'trust',
        label: 'Trust',
        prompt: 'What truth about God should you rely on?',
        placeholder: 'I can trust what God says even before I see the outcome.',
    },
    {
        key: 'turn',
        label: 'Turn',
        prompt: 'What false belief, fear, or response does this correct?',
        placeholder: 'I should not treat darkness or disorder as stronger than God.',
    },
    {
        key: 'obey',
        label: 'Obey',
        prompt: 'What faithful response does this call for?',
        placeholder: "Listen carefully to God's word and respond with faith.",
    },
    {
        key: 'prayer',
        label: 'Pray',
        prompt: 'Turn the meaning into prayer.',
        placeholder: 'Lord, help me trust your word and worship your power.',
    },
];

function prefersCompactStudyTray() {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(max-width: 860px)').matches;
}

function StudyTextArea({ label, value, placeholder, onChange, className = '' }) {
    return (
        <label className={`study-mode-field ${className}`.trim()}>
            <span className="study-mode-field-label">{label}</span>
            <textarea
                className="study-mode-textarea"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}

function countFilledFields(fields = {}, helpers = []) {
    return helpers.reduce((count, helper) => (
        fields?.[helper.key]?.trim() ? count + 1 : count
    ), 0);
}

function getObservationWorkStatus(observation, stage) {
    const helpers = stage === 'apply' ? APPLICATION_HELPERS : INTERPRET_HELPERS;
    const fields = stage === 'apply' ? observation?.application : observation?.interpretation;
    return `${countFilledFields(fields, helpers)}/${helpers.length}`;
}

function getObservationDisplayReference(observation) {
    return observation?.reference || `v${observation?.verse}`;
}

function HelperField({ helper, value, onChange }) {
    return (
        <label className="study-helper-field">
            <span>{helper.label}</span>
            <p>{helper.prompt}</p>
            <textarea
                value={value ?? ''}
                placeholder={helper.placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}

function LocalDraftAudit({ audit }) {
    if (!audit) return null;

    const sectionsToReview = audit.sections.filter(section => (
        !['empty', 'supported'].includes(section.status)
    ));
    const needsReview = sectionsToReview.length > 0;
    const statusLabel = audit.status === 'supported'
        ? 'Checked'
        : audit.status === 'uncited'
            ? 'Needs citations'
            : 'Review';

    return (
        <details
            className={`study-local-audit status-${audit.status}`.trim()}
            open={needsReview}
        >
            <summary>
                <span>Source check</span>
                <strong>{statusLabel}</strong>
            </summary>
            <p>{audit.summary}</p>
            {needsReview && (
                <div className="study-local-audit-list">
                    {sectionsToReview.map(section => (
                        <div
                            key={section.key}
                            className={`study-local-audit-row status-${section.status}`.trim()}
                        >
                            <strong>{section.label}</strong>
                            <p>{section.reason}</p>
                            {section.matchedCards.length > 0 && (
                                <em>Cards: {section.matchedCards.join(', ')}</em>
                            )}
                            {section.detailsToVerify.length > 0 && (
                                <em>Check: {section.detailsToVerify.join('; ')}</em>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </details>
    );
}

function getDraftUsableFields(draft) {
    return [
        ['summary', draft?.mainThought],
        ['context', draft?.context],
        ['meaning', draft?.meaning],
        ['guardrail', draft?.guardrail],
    ].filter(([, value]) => value?.trim());
}

function getDraftMainThought(draft) {
    return draft?.mainThought || draft?.meaning || draft?.context || '';
}

function getSourceRole(finding) {
    const sourceId = finding.source?.id ?? finding.sourceId ?? '';

    if (sourceId === 'passage-context') return 'Passage anchor';
    if (sourceId === 'openbible-cross-references') return 'Cross references';
    if (sourceId === 'exeges-method') return 'Method guardrail';
    if (sourceId.includes('dictionary')) return 'Background';
    if (sourceId.includes('geocoding')) return 'Place context';

    return 'Source note';
}

function getSourceUseText(finding) {
    const role = getSourceRole(finding);

    if (role === 'Passage anchor') return 'Sets the first boundary for interpretation.';
    if (role === 'Cross references') return 'Offers passages to compare after local meaning is clear.';
    if (role === 'Method guardrail') return 'Keeps the answer from over-reading the detail.';
    if (role === 'Background') return 'Adds modest historical or lexical context.';
    if (role === 'Place context') return 'Clarifies setting without making geography the point.';

    return 'Supports the answer as a checked source.';
}

function getSourceBucketKey(finding) {
    const sourceId = finding.source?.id ?? finding.sourceId ?? '';
    const role = getSourceRole(finding);

    if (role === 'Cross references') return 'bible';
    if (role === 'Passage anchor' || role === 'Place context') return 'context';
    if (role === 'Method guardrail') return 'method';
    if (sourceId.includes('dictionary')) return 'word';

    return 'other';
}

function getSourceReferenceText(finding) {
    if (finding.crossReferences?.length) {
        return finding.crossReferences
            .slice(0, 6)
            .map(item => item.reference)
            .join(', ');
    }

    return finding.references?.length ? finding.references.join(', ') : '';
}

function getSourceMetaText(finding) {
    return [
        finding.source?.label ?? finding.attribution,
        finding.license || finding.source?.license,
        finding.confidence ? `${finding.confidence} confidence` : '',
        finding.reviewStatus,
    ].filter(Boolean).join(' · ');
}

function appendStudyText(current = '', addition = '') {
    const cleanCurrent = current.trim();
    const cleanAddition = addition.trim();

    if (!cleanAddition) return cleanCurrent;
    if (!cleanCurrent) return cleanAddition;

    return `${cleanCurrent}\n\n${cleanAddition}`;
}

function getSourceAppendText(finding, field) {
    if (field === 'guardrail') {
        return finding.allowedUse || getSourceUseText(finding);
    }

    return `${finding.title}: ${finding.text}`;
}

function getDraftAppendText(draft, field) {
    if (!draft) return '';
    if (field === 'summary') return draft.mainThought || draft.meaning || draft.context || '';
    if (field === 'context') return draft.context || draft.mainThought || '';
    if (field === 'meaning') return draft.meaning || draft.mainThought || '';
    if (field === 'guardrail') return draft.guardrail || '';

    return '';
}

function getVisibleSourceUses(sourceFindings = []) {
    const preferredRoles = ['Passage anchor', 'Cross references', 'Method guardrail', 'Background', 'Place context'];
    const sourceUses = [];

    for (const role of preferredRoles) {
        const finding = sourceFindings.find(item => getSourceRole(item) === role);
        if (finding) sourceUses.push(finding);
        if (sourceUses.length === 3) break;
    }

    return sourceUses.length ? sourceUses : sourceFindings.slice(0, 3);
}

function getDefaultInterpretPathKey(routeId = '') {
    return INTERPRET_PATHS.find(path => path.routeIds.includes(routeId))?.key ?? 'purpose';
}

function getSourceCheckText({ sourceFindings = [], sourceLoading = false, audit = null }) {
    if (sourceLoading) return 'Checking passage sources...';
    if (!sourceFindings.length) return 'No extra source cards yet. Start from the passage.';

    const roles = getVisibleSourceUses(sourceFindings)
        .map(getSourceRole)
        .map(role => role.toLowerCase());
    const sourceText = roles.length ? roles.join(', ') : `${sourceFindings.length} source cards`;
    const auditText = audit?.status === 'checked' || audit?.status === 'supported'
        ? 'refs checked'
        : 'review gently';

    return `Checked: ${sourceText}; ${auditText}.`;
}

function StudyDetailsCard({
    draft,
    audit,
    sourceFindings = [],
    interpretation = {},
}) {
    const savedNotes = [
        ['context', 'Context'],
        ['meaning', 'Meaning note'],
        ['guardrail', 'Caution'],
    ].filter(([key]) => interpretation?.[key]?.trim());

    if (!draft && !sourceFindings.length && !savedNotes.length) return null;

    return (
        <div className="study-source-detail-stack">
            {savedNotes.length > 0 && (
                <div className="study-background-section">
                    <span>Saved notes</span>
                    {savedNotes.map(([key, label]) => (
                        <p key={key}>
                            <strong>{label}:</strong> {interpretation[key]}
                        </p>
                    ))}
                </div>
            )}

            {draft && (
                <div className="study-assistant-draft-lines">
                    {draft.context && (
                        <p>
                            <strong>Passage:</strong> {draft.context}
                        </p>
                    )}
                    {draft.meaning && (
                        <p>
                            <strong>Meaning:</strong> {draft.meaning}
                        </p>
                    )}
                    {draft.guardrail && (
                        <p>
                            <strong>Caution:</strong> {draft.guardrail}
                        </p>
                    )}
                    {draft.nextQuestion && (
                        <p>
                            <strong>Next:</strong> {draft.nextQuestion}
                        </p>
                    )}
                    <p className="study-assistant-draft-meta">
                        Confidence: {draft.confidence}
                        {draft.citations?.length > 0 && (
                            <em>Uses {draft.citations.join(', ')}</em>
                        )}
                        {draft.unstructured && (
                            <em>Cleaned plain text</em>
                        )}
                    </p>
                </div>
            )}

            {audit && <LocalDraftAudit audit={audit} />}

            {sourceFindings.length > 0 && (
                <div className="study-background-section">
                    <span>Source cards</span>
                    {sourceFindings.map(finding => (
                        <p key={finding.id}>
                            <strong>{finding.title}:</strong> {finding.text}
                            {finding.crossReferences?.length > 0 && (
                                <em>
                                    {' '}
                                    Leads: {finding.crossReferences
                                        .slice(0, 4)
                                        .map(item => item.reference)
                                        .join(', ')}
                                </em>
                            )}
                            {finding.source?.href && (
                                <>
                                    {' '}
                                    <a href={finding.source.href} target="_blank" rel="noreferrer">
                                        {finding.source.label}
                                    </a>
                                </>
                            )}
                            {finding.source && (
                                <em> {finding.source.license}</em>
                            )}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

function SourceCard({ finding, interpretation = {}, onUseField }) {
    const references = getSourceReferenceText(finding);
    const metaText = getSourceMetaText(finding);

    const handleUse = (field) => {
        onUseField(field, appendStudyText(
            interpretation?.[field] ?? '',
            getSourceAppendText(finding, field),
        ));
    };

    return (
        <article className={`study-source-card bucket-${getSourceBucketKey(finding)}`.trim()}>
            <div className="study-source-card-top">
                <span>{getSourceRole(finding)}</span>
                {references && <em>{references}</em>}
            </div>
            <h4>{finding.title}</h4>
            <p>{finding.text}</p>
            {finding.crossReferences?.length > 0 && (
                <p className="study-source-card-refs">
                    Leads: {finding.crossReferences
                        .slice(0, 6)
                        .map(item => item.reference)
                        .join(', ')}
                </p>
            )}
            {metaText && <p className="study-source-card-meta">{metaText}</p>}
            {finding.source?.href && (
                <a
                    className="study-source-card-link"
                    href={finding.source.href}
                    target="_blank"
                    rel="noreferrer"
                >
                    Open source
                </a>
            )}
            <div className="study-source-actions" aria-label={`Use ${finding.title}`}>
                <button
                    type="button"
                    className="study-selection-action primary"
                    onClick={() => handleUse('summary')}
                >
                    Use in meaning
                </button>
                <button
                    type="button"
                    className="study-selection-action"
                    onClick={() => handleUse('context')}
                >
                    Save context
                </button>
                <button
                    type="button"
                    className="study-selection-action"
                    onClick={() => handleUse('guardrail')}
                >
                    Save caution
                </button>
            </div>
        </article>
    );
}

function SourceBucketSection({ bucket, findings, interpretation, onUseField }) {
    if (!findings.length) return null;

    return (
        <section className="study-source-bucket">
            <div className="study-source-bucket-heading">
                <span>{bucket.label}</span>
                <em>{findings.length}</em>
            </div>
            <div className="study-source-card-list">
                {findings.map(finding => (
                    <SourceCard
                        key={finding.id}
                        finding={finding}
                        interpretation={interpretation}
                        onUseField={onUseField}
                    />
                ))}
            </div>
        </section>
    );
}

function ResearchDraftBlock({ label, note, draft, emptyText, interpretation = {}, onUseField }) {
    if (!draft) {
        return (
            <section className="study-research-draft">
                <div className="study-source-bucket-heading">
                    <span>{label}</span>
                </div>
                <p>{emptyText}</p>
            </section>
        );
    }

    const rawText = draft.rawText || [
        draft.context && `Context: ${draft.context}`,
        draft.meaning && `Meaning: ${draft.meaning}`,
        draft.guardrail && `Guardrail: ${draft.guardrail}`,
        draft.nextQuestion && `Next question: ${draft.nextQuestion}`,
    ].filter(Boolean).join('\n\n');

    const handleUseDraft = (field) => {
        onUseField(field, appendStudyText(
            interpretation?.[field] ?? '',
            getDraftAppendText(draft, field),
        ));
    };

    return (
        <section className="study-research-draft">
            <div className="study-source-bucket-heading">
                <span>{label}</span>
                {draft.confidence && <em>{draft.confidence}</em>}
            </div>
            {note && <p>{note}</p>}
            <div className="study-source-actions" aria-label={`Use ${label}`}>
                <button
                    type="button"
                    className="study-selection-action primary"
                    onClick={() => handleUseDraft('summary')}
                    disabled={!getDraftAppendText(draft, 'summary')}
                >
                    Use meaning
                </button>
                <button
                    type="button"
                    className="study-selection-action"
                    onClick={() => handleUseDraft('context')}
                    disabled={!getDraftAppendText(draft, 'context')}
                >
                    Save context
                </button>
                <button
                    type="button"
                    className="study-selection-action"
                    onClick={() => handleUseDraft('guardrail')}
                    disabled={!getDraftAppendText(draft, 'guardrail')}
                >
                    Save caution
                </button>
            </div>
            {rawText && (
                <pre className="study-local-raw-response">{rawText}</pre>
            )}
        </section>
    );
}

function SourceExplorer({
    observation,
    activePath,
    guide,
    groundedDraft,
    localDraft,
    localDraftState,
    sourceFindings = [],
    exploreFindings = [],
    sourceLoading = false,
    interpretation = {},
    onUseField,
}) {
    const findings = exploreFindings.length ? exploreFindings : sourceFindings;
    const groupedFindings = SOURCE_BUCKETS.map(bucket => ({
        ...bucket,
        findings: findings.filter(finding => getSourceBucketKey(finding) === bucket.key),
    }));
    const uncategorizedCount = findings.filter(finding => (
        !SOURCE_BUCKETS.some(bucket => bucket.key === getSourceBucketKey(finding))
    )).length;
    const summaryText = sourceLoading
        ? 'Loading'
        : `${findings.length}${uncategorizedCount ? `+${uncategorizedCount}` : ''} cards`;

    return (
        <details className="study-deep-dive">
            <summary>
                <span>Dig deeper</span>
                <em>{summaryText}</em>
            </summary>
            <div className="study-deep-dive-body">
                <header className="study-deep-dive-focus">
                    <span>{activePath.label}</span>
                    <strong>&ldquo;{observation.quote}&rdquo;</strong>
                    {observation.note && <p>{observation.note}</p>}
                </header>

                <section className="study-deep-dive-route">
                    <span>Question</span>
                    <p>{activePath.question}</p>
                    {guide?.routeLabel && (
                        <p>
                            <strong>{guide.routeLabel}:</strong> {guide.reason}
                        </p>
                    )}
                </section>

                {sourceLoading && (
                    <p className="study-background-note">
                        Loading passage-specific source cards.
                    </p>
                )}

                {!sourceLoading && !findings.length && (
                    <p className="study-background-note">
                        No source cards are available for this mark yet.
                    </p>
                )}

                {groupedFindings.map(bucket => (
                    <SourceBucketSection
                        key={bucket.key}
                        bucket={bucket}
                        findings={bucket.findings}
                        interpretation={interpretation}
                        onUseField={onUseField}
                    />
                ))}

                <ResearchDraftBlock
                    label="Curated draft"
                    note="Deterministic synthesis from the source cards."
                    draft={groundedDraft}
                    emptyText="No curated draft is available for this mark yet."
                    interpretation={interpretation}
                    onUseField={onUseField}
                />

                <ResearchDraftBlock
                    label="Local model raw"
                    note={localDraft ? 'Raw local response, kept available for review.' : ''}
                    draft={localDraft}
                    emptyText={localDraftState.status === 'loading'
                        ? localDraftState.progress || 'Drafting locally...'
                        : 'Run the optional local model pass to see raw model output here.'}
                    interpretation={interpretation}
                    onUseField={onUseField}
                />
            </div>
        </details>
    );
}

function StudyDraftCard({
    draft,
    title,
    kicker,
    note,
    audit,
    sourceFindings = [],
    sourceLoading = false,
    interpretation = {},
    showHeading = true,
    onUseField,
}) {
    if (!draft) return null;

    const usableFields = getDraftUsableFields(draft);
    const mainThought = getDraftMainThought(draft);
    const visibleSourceUses = getVisibleSourceUses(sourceFindings);
    const sourceCheckText = getSourceCheckText({ sourceFindings, sourceLoading, audit });
    const workingMeaning = interpretation.summary ?? '';

    return (
        <div className="study-thinking-card">
            {showHeading && (
                <div className="study-assistant-draft-heading">
                    <span>{kicker}</span>
                    <strong>{title}</strong>
                    {note && <p>{note}</p>}
                </div>
            )}

            <div className="study-thinking-flow">
                {mainThought && (
                    <div className="study-main-thought">
                        <span>Start from the passage</span>
                        <p>{mainThought}</p>
                    </div>
                )}

                <label className="study-working-meaning">
                    <span>Working meaning</span>
                    <textarea
                        value={workingMeaning}
                        placeholder="So I think this means..."
                        onChange={(event) => onUseField('summary', event.target.value)}
                    />
                </label>
            </div>

            <p className={`study-source-check status-${audit?.status ?? 'checked'}`.trim()}>
                {sourceCheckText}
            </p>

            {visibleSourceUses.length > 0 && (
                <details className="study-assistant-details study-source-glance">
                    <summary>How the sources helped</summary>
                    <div className="study-source-use-list" aria-label="How sources are being used">
                        {sourceLoading && (
                            <div className="study-source-use">
                                <span>Chapter sources</span>
                                <p>Loading passage-specific evidence.</p>
                            </div>
                        )}
                        {visibleSourceUses.map(finding => (
                            <div className="study-source-use" key={finding.id}>
                                <span>{getSourceRole(finding)}</span>
                                <p>{getSourceUseText(finding)}</p>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            <details className="study-assistant-details study-assistant-why">
                <summary>Study notes</summary>
                <StudyDetailsCard
                    draft={draft}
                    audit={audit}
                    sourceFindings={sourceFindings}
                    interpretation={interpretation}
                />
                {usableFields.length > 1 && (
                    <div className="study-background-actions" aria-label={`Use ${title}`}>
                        {usableFields
                            .filter(([key]) => key !== 'summary')
                            .map(([key, value]) => (
                                <button
                                    type="button"
                                    key={key}
                                    className="study-selection-action"
                                    onClick={() => onUseField(key, value)}
                                >
                                    Save {key}
                                </button>
                            ))}
                    </div>
                )}
            </details>
        </div>
    );
}

function ObservationList({
    observations,
    onRemoveObservation,
    selectedId,
    onSelectObservation,
    workStage = 'interpret',
}) {
    if (!observations.length) {
        return (
            <p className="study-mode-empty">
                Your saved observations will collect here as you notice, wonder, and mark what matters.
            </p>
        );
    }

    return (
        <div className="study-observation-list">
            {observations.map(observation => {
                const selectable = !!onSelectObservation;
                const body = (
                    <>
                        <div className="study-observation-meta">
                            <span>{getObservationTypeLabel(observation.type)}</span>
                            <span>{getObservationDisplayReference(observation)}</span>
                        </div>
                        <p className="study-observation-quote">&ldquo;{observation.quote}&rdquo;</p>
                        {observation.note && (
                            <p className="study-observation-note">{observation.note}</p>
                        )}
                        {observation.type === 'repeated-word' && observation.relatedSelections?.length > 1 && (
                            <p className="study-observation-detail">
                                {observation.relatedSelections.length} linked uses in this chapter.
                            </p>
                        )}
                        {observation.contrast?.sideA?.length && observation.contrast?.sideB?.length ? (
                            <p className="study-observation-detail">
                                {getSelectionQuote(observation.contrast.sideA)} contrasts with {getSelectionQuote(observation.contrast.sideB)}
                            </p>
                        ) : null}
                        {selectable && (
                            <p className="study-observation-detail">
                                {workStage === 'apply' ? 'Apply' : 'Interpret'} {getObservationWorkStatus(observation, workStage)}
                            </p>
                        )}
                    </>
                );

                return (
                <article
                    key={observation.id}
                    className={`study-observation type-${observation.type} ${selectedId === observation.id ? 'selected' : ''}`.trim()}
                >
                    {selectable ? (
                        <button
                            type="button"
                            className="study-observation-body"
                            onClick={() => onSelectObservation(observation.id)}
                            aria-pressed={selectedId === observation.id}
                        >
                            {body}
                        </button>
                    ) : (
                        <div className="study-observation-body">
                            {body}
                        </div>
                    )}
                    {onRemoveObservation && (
                        <button
                            className="study-observation-remove"
                            onClick={() => onRemoveObservation(observation.id)}
                            aria-label={`Remove ${getObservationTypeLabel(observation.type)} observation`}
                        >
                            &times;
                        </button>
                    )}
                </article>
                );
            })}
        </div>
    );
}

function ObservationWorkbenchHeader({ observation, stage }) {
    const meaning = observation?.interpretation?.summary || observation?.interpretation?.meaning;

    return (
        <section className="study-workbench-anchor">
            <span className="study-context-card-label">
                {stage === 'apply' ? 'Applying' : 'Interpreting'}
            </span>
            <p className="study-workbench-reference">
                {getObservationTypeLabel(observation.type)} &middot; {getObservationDisplayReference(observation)}
            </p>
            <blockquote>&ldquo;{observation.quote}&rdquo;</blockquote>
            {observation.note && (
                <p className="study-workbench-note">{observation.note}</p>
            )}
            {stage === 'apply' && (
                <div className="study-workbench-meaning">
                    <span>Meaning so far</span>
                    <p>{meaning || 'Write a one-sentence interpretation first, then respond from that meaning.'}</p>
                </div>
            )}
        </section>
    );
}

function BackgroundGuideCard({ observation, interpretation, bibles, book, chapter, onHelperChange }) {
    const guide = getBackgroundGuideForObservation(observation);
    const localDraftRequestRef = useRef(0);
    const [localDraftState, setLocalDraftState] = useState({
        status: 'idle',
        progress: '',
        draft: null,
        error: '',
    });
    const [staticGroundingState, setStaticGroundingState] = useState({
        key: '',
        status: 'idle',
        grounding: null,
    });
    const [selectedLocalModelId, setSelectedLocalModelId] = useState(LOCAL_STUDY_SLM_MODEL_ID);
    const chapterNumber = chapter?.chapter;
    const routeId = guide?.routeId ?? '';
    const routeLabel = guide?.routeLabel ?? '';
    const staticGroundingKey = guide
        ? [
            observation?.id,
            observation?.quote,
            observation?.note,
            observation?.reference,
            routeId,
            book?.name,
            chapterNumber,
        ].join('|')
        : '';

    useEffect(() => {
        localDraftRequestRef.current += 1;
        setLocalDraftState({
            status: 'idle',
            progress: '',
            draft: null,
            error: '',
        });
    }, [observation?.id, selectedLocalModelId]);

    useEffect(() => {
        if (!guide || !routeId || !book?.name || !chapterNumber) {
            setStaticGroundingState({
                key: '',
                status: 'idle',
                grounding: null,
            });
            return undefined;
        }

        let cancelled = false;
        setStaticGroundingState({
            key: staticGroundingKey,
            status: 'loading',
            grounding: null,
        });

        getLocalStudyGroundingWithStaticPacks({
            observation,
            route: {
                id: routeId,
                label: routeLabel,
            },
            scope: {
                bookName: book.name,
                chapterNumber,
            },
        }).then((grounding) => {
            if (cancelled) return;
            setStaticGroundingState({
                key: staticGroundingKey,
                status: 'ready',
                grounding,
            });
        }).catch(() => {
            if (cancelled) return;
            setStaticGroundingState({
                key: staticGroundingKey,
                status: 'error',
                grounding: null,
            });
        });

        return () => {
            cancelled = true;
        };
    }, [
        book?.name,
        chapterNumber,
        observation?.id,
        observation?.note,
        observation?.quote,
        observation?.reference,
        observation?.type,
        routeId,
        routeLabel,
        staticGroundingKey,
    ]);

    if (!guide) return null;

    const staticGrounding = staticGroundingState.key === staticGroundingKey
        ? staticGroundingState.grounding
        : null;
    const activeGuide = staticGrounding
        ? {
            ...guide,
            grounding: staticGrounding,
            sourceFindings: staticGrounding.sourceFindings,
            exploreFindings: staticGrounding.exploreFindings,
            citations: staticGrounding.citations,
        }
        : guide;
    const capabilities = getLocalStudyCapabilities();
    const sourceFindings = activeGuide.sourceFindings ?? [];
    const exploreFindings = activeGuide.exploreFindings ?? sourceFindings;
    const sourceCount = sourceFindings.length;
    const isLoadingStaticGrounding = staticGroundingState.key === staticGroundingKey
        && staticGroundingState.status === 'loading';
    const canDraftLocally = capabilities.localSlmAvailable && sourceCount > 0;
    const isDraftingLocally = localDraftState.status === 'loading';
    const selectedLocalModel = LOCAL_STUDY_SLM_MODELS.find(model => (
        model.id === selectedLocalModelId
    )) ?? LOCAL_STUDY_SLM_MODELS[0];
    const groundedDraft = buildGroundedStudyDraft(activeGuide.grounding.synthesisRequest);
    const localDraft = localDraftState.draft;
    const localDraftHasFields = !!(
        localDraft?.context ||
        localDraft?.meaning ||
        localDraft?.guardrail ||
        localDraft?.nextQuestion
    );
    const localDraftIsRawOnly = !!(localDraft?.unstructured && !localDraftHasFields);
    const hasUsableLocalDraft = !!(localDraft && localDraftHasFields && !localDraftIsRawOnly);
    const localDraftAudit = localDraft
        ? auditLocalStudyDraft(localDraft, activeGuide.grounding.synthesisRequest, { bibles })
        : null;
    const groundedDraftAudit = groundedDraft
        ? auditLocalStudyDraft(groundedDraft, activeGuide.grounding.synthesisRequest, { bibles })
        : null;
    const primaryDraft = hasUsableLocalDraft ? localDraft : groundedDraft;
    const primaryDraftAudit = hasUsableLocalDraft ? localDraftAudit : groundedDraftAudit;
    const activePathKey = interpretation?.pathKey || getDefaultInterpretPathKey(routeId);
    const activePath = INTERPRET_PATHS.find(path => path.key === activePathKey) ?? INTERPRET_PATHS[1];
    const localModelMessage = capabilities.localSlmRecommended
        ? `Use ${selectedLocalModel.label} for a second pass on this device.`
        : capabilities.localSlmRisk === 'ios-webgpu-memory-risk'
            ? `${selectedLocalModel.label} can run here, but phone browsers may reload during model loading.`
            : 'This browser needs WebGPU before local model drafting can run.';

    const handleSetField = (key, value) => {
        onHelperChange(key, value);
    };

    const handleDraftLocally = async () => {
        if (!canDraftLocally || isDraftingLocally) return;

        const requestId = localDraftRequestRef.current + 1;
        localDraftRequestRef.current = requestId;

        setLocalDraftState({
            status: 'loading',
            progress: 'Preparing local model...',
            draft: null,
            error: '',
        });

        try {
            const draft = await draftLocalStudySynthesis({
                synthesisRequest: activeGuide.grounding.synthesisRequest,
                modelId: selectedLocalModelId,
                onProgress: (progress) => {
                    if (localDraftRequestRef.current !== requestId) return;

                    setLocalDraftState(current => ({
                        ...current,
                        progress: progress.percent
                            ? `${progress.text} ${progress.percent}%`
                            : progress.text,
                    }));
                },
            });

            if (localDraftRequestRef.current !== requestId) return;

            setLocalDraftState({
                status: 'ready',
                progress: '',
                draft,
                error: '',
            });
        } catch (error) {
            if (localDraftRequestRef.current !== requestId) return;

            setLocalDraftState({
                status: 'error',
                progress: '',
                draft: null,
                error: error instanceof Error
                    ? error.message
                    : 'Local synthesis was not available on this device.',
            });
        }
    };

    return (
        <section className="study-assistant-card">
            <div className="study-interpret-top">
                <span className="study-context-card-label">Interpret this mark</span>
                <strong>What are you asking?</strong>
                <p>{activePath.question}</p>
            </div>

            <details className="study-path-picker">
                <summary>
                    <span>Question type</span>
                    <em>{activePath.label}</em>
                </summary>
                <div className="study-interpret-paths" role="list" aria-label="Interpret question type">
                    {INTERPRET_PATHS.map(path => (
                        <button
                            type="button"
                            key={path.key}
                            className={`study-interpret-path ${activePath.key === path.key ? 'active' : ''}`.trim()}
                            onClick={() => handleSetField('pathKey', path.key)}
                            aria-pressed={activePath.key === path.key}
                        >
                            <span>{path.label}</span>
                            <em>{path.question}</em>
                        </button>
                    ))}
                </div>
            </details>

            {primaryDraft ? (
                <StudyDraftCard
                    draft={primaryDraft}
                    title={hasUsableLocalDraft ? 'Local model pass' : 'Think it through'}
                    kicker={hasUsableLocalDraft ? selectedLocalModel.label : activePath.label}
                    note={hasUsableLocalDraft
                        ? 'Generated on this device, then checked against the local Bible and retrieved evidence.'
                        : 'Start local. Use outside sources only as they clarify this question.'}
                    audit={primaryDraftAudit}
                    sourceFindings={sourceFindings}
                    sourceLoading={isLoadingStaticGrounding}
                    interpretation={interpretation}
                    showHeading={false}
                    onUseField={handleSetField}
                />
            ) : (
                <p className="study-background-note">
                    This helper has a route for the question, but no source-backed draft yet.
                </p>
            )}

            <SourceExplorer
                observation={observation}
                activePath={activePath}
                guide={activeGuide}
                groundedDraft={groundedDraft}
                localDraft={localDraft}
                localDraftState={localDraftState}
                sourceFindings={sourceFindings}
                exploreFindings={exploreFindings}
                sourceLoading={isLoadingStaticGrounding}
                interpretation={interpretation}
                onUseField={handleSetField}
            />

            <details className="study-assistant-details">
                <summary>Optional local model</summary>
                <div className="study-assistant-local">
                    <div>
                        <span>Local model pass</span>
                        <p>{localModelMessage}</p>
                        {localDraftState.progress && (
                            <p>{localDraftState.progress}</p>
                        )}
                        {localDraftState.error && (
                            <p>{localDraftState.error}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="study-selection-action"
                        onClick={handleDraftLocally}
                        disabled={!canDraftLocally || isDraftingLocally}
                    >
                        {isDraftingLocally
                            ? 'Drafting...'
                            : hasUsableLocalDraft
                                ? 'Refresh draft'
                                : 'Draft locally'}
                    </button>
                </div>

                {capabilities.webGpu && (
                    <div className="study-assistant-settings">
                        <label className="study-local-model-control">
                            <span>Local model</span>
                            <select
                                value={selectedLocalModelId}
                                onChange={(event) => setSelectedLocalModelId(event.target.value)}
                                disabled={isDraftingLocally || !capabilities.localSlmAvailable}
                            >
                                {LOCAL_STUDY_SLM_MODELS.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.label} · {model.description}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}
            </details>

            {localDraftIsRawOnly && (
                <details className="study-assistant-diagnostic" open>
                    <summary>Local response kept out of the draft</summary>
                    <p>The model returned text that was not safe to promote into the interpretation fields.</p>
                    <pre className="study-local-raw-response">{localDraft.rawText}</pre>
                </details>
            )}

            {hasUsableLocalDraft && groundedDraft && (
                <details className="study-assistant-details">
                    <summary>Curated fallback draft</summary>
                    <StudyDraftCard
                        draft={groundedDraft}
                        title="Suggested draft"
                        kicker="Passage-first"
                        note="This deterministic draft remains available if the local model wanders."
                        audit={groundedDraftAudit}
                        sourceFindings={sourceFindings}
                        interpretation={interpretation}
                        onUseField={handleSetField}
                    />
                </details>
            )}

            <details className="study-assistant-details">
                <summary>Evidence receipts</summary>
                <div className="study-background-section">
                    <span>Route</span>
                    <p>
                        <strong>{activeGuide.routeLabel}:</strong> {activeGuide.subtitle}
                    </p>
                    <p>
                        <strong>Why:</strong> {activeGuide.reason}
                    </p>
                </div>

                {!activeGuide.exact && (
                    <p className="study-background-note">
                        We do not have a curated source card for this exact item yet, so this helper gives a careful research path instead of a finished answer.
                    </p>
                )}

                <div className="study-background-section">
                    <span>Local context</span>
                    {activeGuide.contextNotes.map(note => (
                        <p key={note}>{note}</p>
                    ))}
                </div>

                <div className="study-background-section">
                    <span>Trusted source notes</span>
                    {activeGuide.sourceNotes.map(note => (
                        <p key={`${note.label}-${note.text}`}>
                            <strong>{note.label}:</strong> {note.text}
                            {note.href && (
                                <>
                                    {' '}
                                    <a href={note.href} target="_blank" rel="noreferrer">
                                        {note.sourceLabel}
                                    </a>
                                </>
                            )}
                            {note.sourceLabel && !note.href && (
                                <em> {note.sourceLabel}</em>
                            )}
                        </p>
                    ))}
                </div>

                <div className="study-background-section">
                    <span>Careful synthesis</span>
                    {activeGuide.synthesis.map(note => (
                        <p key={note}>{note}</p>
                    ))}
                </div>

                <div className="study-background-section">
                    <span>Grounding</span>
                    <p>
                        <strong>Loaded pack:</strong> {activeGuide.grounding.version}
                    </p>
                </div>
            </details>
        </section>
    );
}

function InterpretWorkbench({
    book,
    bibles,
    chapter,
    observations,
    activeObservation,
    activeObservationId,
    onSelectObservation,
    onUpdateObservation,
    interpretValue,
    onInterpretChange,
}) {
    if (!observations.length) {
        return (
            <p className="study-mode-empty">
                Save at least one observation first. Interpretation starts with something you noticed in the passage.
            </p>
        );
    }

    const interpretation = activeObservation?.interpretation ?? {};
    const handleHelperChange = (key, value) => {
        onUpdateObservation?.(activeObservation.id, {
            interpretation: { [key]: value },
        });
    };

    return (
        <>
            <div className="study-workbench">
                <ObservationWorkbenchHeader observation={activeObservation} stage="interpret" />
                <BackgroundGuideCard
                    observation={activeObservation}
                    interpretation={interpretation}
                    bibles={bibles}
                    book={book}
                    chapter={chapter}
                    onHelperChange={handleHelperChange}
                />
            </div>
            <details className="study-mark-switcher">
                <summary>
                    <span>Choose another mark</span>
                    <em>{observations.length} marks</em>
                </summary>
                <ObservationList
                    observations={observations}
                    selectedId={activeObservationId}
                    onSelectObservation={onSelectObservation}
                    workStage="interpret"
                />
            </details>
            <StudyTextArea
                label="Chapter interpretation notes"
                value={interpretValue}
                placeholder="Pull the strongest meanings together for the passage."
                onChange={onInterpretChange}
            />
        </>
    );
}

function ApplicationWorkbench({
    observations,
    activeObservation,
    activeObservationId,
    onSelectObservation,
    onUpdateObservation,
    applyValue,
    onApplyChange,
}) {
    if (!observations.length) {
        return (
            <p className="study-mode-empty">
                Save at least one observation first. Application responds to interpreted meaning, not first impressions.
            </p>
        );
    }

    const application = activeObservation?.application ?? {};
    const handleHelperChange = (key, value) => {
        onUpdateObservation?.(activeObservation.id, {
            application: { [key]: value },
        });
    };

    return (
        <>
            <ObservationList
                observations={observations}
                selectedId={activeObservationId}
                onSelectObservation={onSelectObservation}
                workStage="apply"
            />
            <div className="study-workbench">
                <ObservationWorkbenchHeader observation={activeObservation} stage="apply" />
                <div className="study-helper-stack">
                    {APPLICATION_HELPERS.map(helper => (
                        <HelperField
                            key={helper.key}
                            helper={helper}
                            value={application[helper.key]}
                            onChange={(value) => handleHelperChange(helper.key, value)}
                        />
                    ))}
                </div>
            </div>
            <StudyTextArea
                label="Chapter application notes"
                value={applyValue}
                placeholder="What response does this passage call for?"
                onChange={onApplyChange}
            />
        </>
    );
}

export default function StudyMode({
    book,
    bibles = [],
    chapter,
    reference,
    study,
    stage,
    selection = [],
    workflow,
    onStageChange,
    onAddObservation,
    onClearSelection,
    onStartContrast,
    onCancelWorkflow,
    onRemoveObservation,
    onUpdateObservation,
    onSaveFields,
    onDeleteStudy,
    onClose,
}) {
    const observations = study?.observations ?? [];
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [trayOpen, setTrayOpen] = useState(() => !prefersCompactStudyTray());
    const [activeObservationId, setActiveObservationId] = useState(null);

    useEffect(() => {
        setDraft({
            observe: study?.observe ?? '',
            interpret: study?.interpret ?? '',
            apply: study?.apply ?? '',
        });
    }, [reference, study?.observe, study?.interpret, study?.apply]);

    useEffect(() => {
        setTrayOpen(!prefersCompactStudyTray());
    }, [reference]);

    useEffect(() => {
        if (!observations.length) {
            setActiveObservationId(null);
            return;
        }

        if (!observations.some(observation => observation.id === activeObservationId)) {
            setActiveObservationId(observations[0].id);
        }
    }, [activeObservationId, observations]);

    useEffect(() => {
        if (stage === 'observe' && observations[0]?.id) {
            setActiveObservationId(observations[0].id);
        }
    }, [observations, stage]);

    const currentStage = STUDY_STAGES.find(item => item.id === stage) ?? STUDY_STAGES[0];
    const activeObservation = observations.find(item => item.id === activeObservationId) ?? observations[0] ?? null;
    const hasStudyContent = !!(
        observations.length
        || draft.observe.trim()
        || draft.interpret.trim()
        || draft.apply.trim()
    );

    const handleFieldChange = (field, value) => {
        setDraft(prev => ({ ...prev, [field]: value }));
        onSaveFields?.({ [field]: value });
    };

    const handleStageSelect = (nextStage) => {
        onStageChange?.(nextStage);
        setTrayOpen(nextStage !== 'observe' || !prefersCompactStudyTray());
    };

    return (
        <>
            <header className="study-toolbar">
                <button className="study-toolbar-close" onClick={onClose} aria-label="Close study mode">
                    &times;
                </button>
                <div className="study-toolbar-title">
                    <span>Guided study</span>
                    <strong>{reference}</strong>
                </div>
                <div className="study-stage-tabs" role="tablist" aria-label="Study stage">
                    {STUDY_STAGES.map(item => (
                        <button
                            key={item.id}
                            className={`study-stage-tab ${stage === item.id ? 'active' : ''}`}
                            onClick={() => handleStageSelect(item.id)}
                            aria-selected={stage === item.id}
                            role="tab"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </header>

            <aside className={`study-tray ${trayOpen ? 'expanded' : 'collapsed'} stage-${stage}`}>
                <button
                    className="study-tray-handle"
                    onClick={() => setTrayOpen(open => !open)}
                    aria-expanded={trayOpen}
                >
                    <span>{currentStage.label}</span>
                    <span>{observations.length} marks</span>
                </button>

                <div className="study-tray-content">
                    <p className="study-stage-prompt">{currentStage.prompt}</p>

                    {stage === 'observe' && (
                        <div className="study-stage-panel">
                            <div className="study-tray-selection-panel">
                                <StudySelectionPanel
                                    selection={selection}
                                    workflow={workflow}
                                    showEmpty
                                    onAddObservation={onAddObservation}
                                    onClearSelection={onClearSelection}
                                    onStartContrast={onStartContrast}
                                    onCancelWorkflow={onCancelWorkflow}
                                />
                            </div>
                            <StudyTextArea
                                className="study-observe-notes-field"
                                label="Observation notes"
                                value={draft.observe}
                                placeholder="Patterns, structure, tensions, details."
                                onChange={(value) => handleFieldChange('observe', value)}
                            />
                            <ObservationList
                                observations={observations}
                                onRemoveObservation={onRemoveObservation}
                            />
                        </div>
                    )}

                    {stage === 'interpret' && (
                        <div className="study-stage-panel">
                            <InterpretWorkbench
                                book={book}
                                bibles={bibles}
                                chapter={chapter}
                                observations={observations}
                                activeObservation={activeObservation}
                                activeObservationId={activeObservation?.id}
                                onSelectObservation={setActiveObservationId}
                                onUpdateObservation={onUpdateObservation}
                                interpretValue={draft.interpret}
                                onInterpretChange={(value) => handleFieldChange('interpret', value)}
                            />
                        </div>
                    )}

                    {stage === 'apply' && (
                        <div className="study-stage-panel">
                            <ApplicationWorkbench
                                observations={observations}
                                activeObservation={activeObservation}
                                activeObservationId={activeObservation?.id}
                                onSelectObservation={setActiveObservationId}
                                onUpdateObservation={onUpdateObservation}
                                applyValue={draft.apply}
                                onApplyChange={(value) => handleFieldChange('apply', value)}
                            />
                        </div>
                    )}

                    {hasStudyContent && (
                        <footer className="study-mode-footer">
                            <button className="study-clear" onClick={onDeleteStudy}>
                                Clear study
                            </button>
                        </footer>
                    )}
                </div>
            </aside>
        </>
    );
}
