import { useEffect, useMemo, useRef, useState } from 'react';
import { buildGroundedStudyDraft } from '../../lib/groundedStudyDraft';
import {
    getLocalStudyGroundingWithStaticPacks,
} from '../../lib/localStudyGrounding';
import { resolveBibleReference } from '../../lib/localStudyDraftAudit';
import { classifyBackgroundQuestion } from '../../lib/backgroundGuides';
import { loadTranslationChapter } from '../../lib/chapterTranslation';
import { loadPublicCommentary, PUBLIC_COMMENTARY_SOURCES } from '../../lib/publicCommentary';
import { buildPassageQuestionGrounding } from '../../lib/passageQuestion';
import { getLocalStudyCapabilities } from '../../lib/localStudyGrounding';
import { draftLocalCommentaryComparison, draftLocalStudySynthesis } from '../../lib/localStudySynthesis';
import {
    buildCommentaryComparisonRequest,
    buildCommentaryOverview,
    loadPassageCommentaryReport,
} from '../../lib/commentaryComparison';

function unique(values = []) {
    return [...new Set(values.filter(Boolean))];
}

function getCrossReferenceTargets(finding, target) {
    const anchor = target.reference.toLowerCase().replace(/[\u2013-]/g, '-');
    const references = finding.crossReferences?.length
        ? finding.crossReferences.map(item => item.reference)
        : (finding.references ?? []).slice(1);

    return unique(references).filter(reference => (
        reference.toLowerCase().replace(/[\u2013-]/g, '-') !== anchor
    ));
}

function getVersesFromChapter(reference, book) {
    const chapter = book?.chapters?.[0];
    const verses = chapter?.verses?.filter(verse => (
        verse.verse >= reference.startVerse && verse.verse <= reference.endVerse
    )) ?? [];

    return verses.length === reference.endVerse - reference.startVerse + 1 ? verses : [];
}

function useTranslatedReferences(references, bibles, translation) {
    const localTargets = useMemo(() => (
        references
            .map(reference => resolveBibleReference(reference, bibles))
            .filter(result => result.status === 'valid')
    ), [bibles, references]);
    const [translatedTargets, setTranslatedTargets] = useState([]);

    useEffect(() => {
        if (translation?.source !== 'remote') {
            setTranslatedTargets(localTargets);
            return undefined;
        }

        let cancelled = false;
        const controller = new AbortController();

        Promise.all(localTargets.map(async target => {
            const book = bibles.find(item => item.name === target.bookName);

            try {
                const result = await loadTranslationChapter({
                    translation,
                    book,
                    chapterNum: target.chapter,
                    signal: controller.signal,
                });
                const verses = getVersesFromChapter(target, result.chapter);

                if (result.status !== 'ready' || !verses.length) {
                    return {
                        ...target,
                        status: 'unavailable',
                        verses: [],
                        reason: result.message || `${translation.name} is not available for this passage.`,
                    };
                }

                return { ...target, verses };
            } catch (error) {
                if (controller.signal.aborted) return null;

                return {
                    ...target,
                    status: 'unavailable',
                    verses: [],
                    reason: error.message || `${translation.name} could not be loaded for this passage.`,
                };
            }
        })).then(targets => {
            if (!cancelled) setTranslatedTargets(targets.filter(Boolean));
        });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [bibles, localTargets, translation]);

    if (translation?.source !== 'remote') return localTargets;

    return translatedTargets.length
        ? translatedTargets
        : localTargets.map(target => ({
            ...target,
            status: 'loading',
            verses: [],
            reason: `Loading ${translation?.name || 'selected translation'}...`,
        }));
}

function ResolvedPassage({ reference, translationName, onOpenPassage }) {
    return (
        <article className="study-thread-passage">
            <div>
                <strong>{reference.reference}</strong>
                {onOpenPassage && (
                    <button type="button" onClick={() => onOpenPassage(reference)}>
                        Read in {translationName}
                    </button>
                )}
            </div>
            {reference.status === 'valid' ? reference.verses.map(verse => (
                <p key={`${reference.reference}-${verse.verse}`}>
                    <sup>{verse.verse}</sup>{verse.text}
                </p>
            )) : (
                <p className="study-thread-passage-unavailable">{reference.reason}</p>
            )}
        </article>
    );
}

function CommentaryPanel({ bookName, chapterNumber, targetVerse }) {
    const [sourceId, setSourceId] = useState(PUBLIC_COMMENTARY_SOURCES[0].id);
    const [open, setOpen] = useState(false);
    const [state, setState] = useState({ status: 'idle', source: null, entries: [], message: '' });

    useEffect(() => {
        if (!open) {
            setState({ status: 'idle', source: null, entries: [], message: '' });
            return undefined;
        }

        const controller = new AbortController();
        setState({ status: 'loading', source: null, entries: [], message: '' });

        loadPublicCommentary({ sourceId, bookName, chapterNumber, signal: controller.signal })
            .then(result => {
                if (!controller.signal.aborted) setState(result);
            })
            .catch(error => {
                if (!controller.signal.aborted) {
                    setState({
                        status: 'error',
                        source: PUBLIC_COMMENTARY_SOURCES.find(item => item.id === sourceId) ?? null,
                        entries: [],
                        message: error.message || 'This commentary could not be loaded right now.',
                    });
                }
            });
        return () => controller.abort();
    }, [bookName, chapterNumber, open, sourceId]);

    return (
        <details
            className="study-thread-commentary"
            onToggle={(event) => {
                if (event.target === event.currentTarget) setOpen(event.currentTarget.open);
            }}
        >
            <summary>
                <span>Read a full commentary</span>
                <em>One source at a time</em>
            </summary>
            <div>
                <label>
                    <span>Source</span>
                    <select value={sourceId} onChange={event => setSourceId(event.target.value)}>
                        {PUBLIC_COMMENTARY_SOURCES.map(source => (
                            <option key={source.id} value={source.id}>
                                {source.label} - {source.coverage}
                            </option>
                        ))}
                    </select>
                </label>
                {state.source && (
                    <p className="study-thread-commentary-credit">
                        {state.source.title}. {state.source.license} text, shown as source material rather than a conclusion.
                    </p>
                )}
                {state.status === 'loading' && <p className="study-thread-loading">Loading commentary...</p>}
                {state.status === 'error' && <p className="study-thread-loading">{state.message}</p>}
                {state.status === 'unavailable' && <p className="study-thread-loading">{state.message}</p>}
                {state.status === 'ready' && (
                    <div className="study-thread-commentary-entries">
                        {state.entries.map((entry, index) => (
                            <details key={`${entry.verse ?? 'chapter'}-${index}`} open={entry.verse === targetVerse || (!targetVerse && index === 0)}>
                                <summary>{entry.verse ? `On verse ${entry.verse}` : 'Chapter note'}</summary>
                                <p>{entry.text}</p>
                            </details>
                        ))}
                    </div>
                )}
                {state.source?.href && (
                    <a href={state.source.href} target="_blank" rel="noreferrer">Open source</a>
                )}
            </div>
        </details>
    );
}

function CommentaryEvidence({ evidence }) {
    return (
        <blockquote className="study-thread-commentary-evidence">
            <div>
                <strong>{evidence.sourceLabel}</strong>
                <span>{evidence.reference}</span>
            </div>
            <p>&ldquo;{evidence.quote}&rdquo;</p>
            {evidence.sourceUrl && (
                <a href={evidence.sourceUrl} target="_blank" rel="noreferrer">Open source</a>
            )}
        </blockquote>
    );
}

function CommentaryComparison({ target, passageFindings }) {
    const [state, setState] = useState({
        status: 'loading',
        findings: [],
        overview: null,
        request: null,
        error: '',
    });
    const [comparisonState, setComparisonState] = useState({
        status: 'idle',
        comparison: null,
        progress: '',
        error: '',
    });
    const [reloadKey, setReloadKey] = useState(0);
    const comparisonRequestId = useRef(0);
    const capabilities = getLocalStudyCapabilities();

    useEffect(() => {
        const controller = new AbortController();
        comparisonRequestId.current += 1;
        setState({ status: 'loading', findings: [], overview: null, request: null, error: '' });
        setComparisonState({ status: 'idle', comparison: null, progress: '', error: '' });

        loadPassageCommentaryReport({ target, signal: controller.signal })
            .then(report => {
                if (controller.signal.aborted) return;
                const findings = report.findings;
                const totalFailure = report.failedSourceCount === report.sourceCount;
                const partialFailure = report.failedSourceCount > 0 && !totalFailure;

                setState({
                    status: totalFailure ? 'error' : findings.length ? 'ready' : 'empty',
                    findings,
                    overview: buildCommentaryOverview({ target, commentaryFindings: findings }),
                    request: findings.length > 1
                        ? buildCommentaryComparisonRequest({
                            target,
                            passageFindings,
                            commentaryFindings: findings,
                        })
                        : null,
                    error: totalFailure
                        ? 'The commentary sources could not be reached right now.'
                        : partialFailure
                            ? `${report.failedSourceCount} commentary source${report.failedSourceCount === 1 ? '' : 's'} could not be reached. The available excerpts are shown below.`
                            : '',
                });
            })
            .catch(error => {
                if (controller.signal.aborted) return;

                setState({
                    status: 'error',
                    findings: [],
                    overview: null,
                    request: null,
                    error: error.message || 'Commentary could not be gathered right now.',
                });
            });

        return () => {
            controller.abort();
            comparisonRequestId.current += 1;
        };
    }, [passageFindings, reloadKey, target]);

    const handleCompare = async () => {
        if (!state.request || comparisonState.status === 'loading') return;

        const requestId = comparisonRequestId.current + 1;
        comparisonRequestId.current = requestId;
        setComparisonState({ status: 'loading', comparison: null, progress: 'Preparing excerpts...', error: '' });

        try {
            const comparison = await draftLocalCommentaryComparison({
                synthesisRequest: state.request,
                onProgress: progress => {
                    if (comparisonRequestId.current !== requestId) return;
                    setComparisonState(current => ({
                        ...current,
                        progress: progress.text || 'Comparing excerpts...',
                    }));
                },
            });
            if (comparisonRequestId.current !== requestId) return;
            setComparisonState({ status: 'ready', comparison, progress: '', error: '' });
        } catch (error) {
            if (comparisonRequestId.current !== requestId) return;
            setComparisonState({
                status: 'error',
                comparison: null,
                progress: '',
                error: error.message || 'A grounded comparison could not be prepared.',
            });
        }
    };

    const comparison = comparisonState.comparison;
    const sourceCount = state.findings.length;
    const sourceTotal = PUBLIC_COMMENTARY_SOURCES.length;
    const hasOneCommentary = sourceCount === 1;
    const hasNoCommentary = sourceCount === 0;
    const commentaryHeading = hasNoCommentary
        ? 'Commentary'
        : hasOneCommentary
            ? 'A commentary perspective'
            : 'Across the commentaries';
    const availabilityLabel = state.status === 'loading'
        ? 'Gathering sources'
        : hasNoCommentary
            ? 'No excerpts available'
            : hasOneCommentary
            ? '1 source available'
            : `${sourceCount} of ${sourceTotal} available`;

    return (
        <section className="study-thread-commentary-synthesis">
            <div className="study-thread-section-heading">
                <span>{commentaryHeading}</span>
                <em>{availabilityLabel}</em>
            </div>
            <p className="study-thread-commentary-intro">
                {hasOneCommentary
                    ? 'Read this historical perspective, then inspect its words for yourself.'
                    : hasNoCommentary
                        ? 'Relevant commentary excerpts appear here when available.'
                    : 'Compare what the available historical commentators emphasize, then inspect their words for yourself.'}
            </p>

            {state.status === 'loading' && <p className="study-thread-loading">Reading the available commentary excerpts...</p>}
            {state.error && <p className="study-thread-question-error">{state.error}</p>}
            {state.status === 'error' && (
                <button type="button" className="study-thread-secondary" onClick={() => setReloadKey(key => key + 1)}>
                    Try commentary again
                </button>
            )}
            {state.status === 'empty' && (
                <p className="study-thread-loading">No commentary excerpt could be matched confidently to this passage.</p>
            )}

            {state.status === 'ready' && state.overview && (
                <>
                    <div className="study-thread-commentary-overview">
                        {state.overview.mode === 'single' ? (
                            <div>
                                <span>One perspective</span>
                                <p>{state.overview.summary}</p>
                                <div className="study-thread-commentary-perspectives">
                                    {state.overview.perspectives.map(perspective => (
                                        <article key={perspective.id}>
                                            <strong>{perspective.source.label}</strong>
                                            <p>{perspective.text}</p>
                                        </article>
                                    ))}
                                </div>
                                <em>{state.overview.caution}</em>
                            </div>
                        ) : (
                            <div>
                                <span>Shared attention</span>
                                <p>{state.overview.shared}</p>
                            </div>
                        )}
                        {!comparison && state.overview.mode === 'multiple' && (
                            <div>
                                <span>Different emphases</span>
                                <p>{state.overview.differences}</p>
                                <div className="study-thread-commentary-perspectives">
                                    {state.overview.perspectives.map(perspective => (
                                        <article key={perspective.id}>
                                            <strong>{perspective.source.label}</strong>
                                            <p>{perspective.text}</p>
                                        </article>
                                    ))}
                                </div>
                                <em>{state.overview.why}</em>
                            </div>
                        )}
                    </div>

                    {comparison && (
                        <div className="study-thread-commentary-comparison">
                            <div className="study-thread-commentary-comparison-heading">
                                <span>Grounded comparison</span>
                                <em>{comparison.comparedSourceIds.length} sources represented</em>
                            </div>

                            {comparison.agreements.length > 0 && (
                                <section>
                                    <h3>Agreement in these excerpts</h3>
                                    {comparison.agreements.map((group, index) => (
                                        <div className="study-thread-commentary-group" key={`agreement-${index}`}>
                                            {group.evidence.map(evidence => (
                                                <CommentaryEvidence
                                                    key={`${evidence.cardId}-${evidence.quote}`}
                                                    evidence={evidence}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </section>
                            )}

                            {comparison.differences.length > 0 && (
                                <section>
                                    <h3>Where the excerpts differ</h3>
                                    {comparison.differences.map((group, index) => (
                                        <div className="study-thread-commentary-group" key={`difference-${index}`}>
                                            <strong>Different emphasis</strong>
                                            {group.evidence.map(evidence => (
                                                <CommentaryEvidence
                                                    key={`${evidence.cardId}-${evidence.quote}`}
                                                    evidence={evidence}
                                                />
                                            ))}
                                            <div className="study-thread-commentary-reason">
                                                <span>Why they may differ</span>
                                                <p>{group.reason}</p>
                                                {group.reasonEvidence.map(evidence => (
                                                    <CommentaryEvidence
                                                        key={`reason-${evidence.cardId}-${evidence.quote}`}
                                                        evidence={evidence}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}
                        </div>
                    )}

                    {capabilities.localSlmAvailable && state.request && comparisonState.status !== 'ready' && (
                        <div className="study-thread-commentary-compare-action">
                            <button
                                type="button"
                                className="study-thread-primary"
                                onClick={handleCompare}
                                disabled={comparisonState.status === 'loading'}
                            >
                                {comparisonState.status === 'loading'
                                    ? 'Comparing excerpts...'
                                    : 'Compare agreement and differences'}
                            </button>
                            {comparisonState.status === 'loading' && <em>{comparisonState.progress}</em>}
                            {comparisonState.status !== 'loading' && (
                                <em>
                                    Quotations are checked against these excerpts
                                    {capabilities.localSlmRisk ? '; experimental on this device' : ''}
                                </em>
                            )}
                        </div>
                    )}
                    {comparisonState.status === 'error' && (
                        <p className="study-thread-question-error">{comparisonState.error}</p>
                    )}

                    <details className="study-thread-commentary-excerpts">
                        <summary>
                            <span>Read the selected excerpts</span>
                            <em>{hasOneCommentary ? '1 source' : `${sourceCount} sources`}</em>
                        </summary>
                        <div>
                            {state.findings.map(finding => (
                                <SourceNote key={finding.id} finding={finding} />
                            ))}
                        </div>
                    </details>
                </>
            )}
        </section>
    );
}

function PassageQuestion({ target, grounding, relatedPassages, translation }) {
    const [question, setQuestion] = useState('');
    const [state, setState] = useState({
        status: 'idle',
        draft: null,
        packet: null,
        error: '',
    });
    const requestIdRef = useRef(0);
    const capabilities = getLocalStudyCapabilities();

    useEffect(() => {
        requestIdRef.current += 1;
        setQuestion('');
        setState({ status: 'idle', draft: null, packet: null, error: '' });
    }, [target.id]);

    const handleAsk = async () => {
        const cleanQuestion = question.trim();
        if (!cleanQuestion || state.status === 'loading' || state.status === 'drafting') return;

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        const controller = new AbortController();

        setState({ status: 'loading', draft: null, packet: null, error: '' });

        try {
            const packet = await buildPassageQuestionGrounding({
                target,
                question: cleanQuestion,
                route: grounding.synthesisRequest.route,
                sourceFindings: grounding.sourceFindings,
                relatedPassages,
                translationName: translation?.name,
                signal: controller.signal,
            });
            if (requestIdRef.current !== requestId) return;

            if (!capabilities.localSlmAvailable) {
                setState({
                    status: 'ready',
                    draft: buildGroundedStudyDraft(packet.synthesisRequest),
                    packet,
                    error: '',
                });
                return;
            }

            setState({ status: 'drafting', draft: null, packet, error: '' });
            const draft = await draftLocalStudySynthesis({
                synthesisRequest: packet.synthesisRequest,
                onProgress: () => {},
            });
            if (requestIdRef.current !== requestId) return;

            setState({ status: 'ready', draft, packet, error: '' });
        } catch (error) {
            if (requestIdRef.current !== requestId) return;

            setState(current => ({
                ...current,
                status: 'error',
                error: error instanceof Error
                    ? error.message
                    : 'The local answer could not be prepared right now.',
            }));
        }
    };

    const answer = state.draft?.meaning || state.draft?.context || '';
    const isBusy = state.status === 'loading' || state.status === 'drafting';

    return (
        <section className="study-thread-question-helper">
            <div className="study-thread-section-heading">
                <span>Ask about this passage</span>
                <em>Passage and sources</em>
            </div>
            <p>Ask one focused question. The answer stays anchored to the passage, related Scripture, and named commentary.</p>
            <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What would you like to understand?"
                rows={3}
            />
            <div className="study-thread-question-actions">
                <button
                    type="button"
                    className="study-thread-primary"
                    onClick={handleAsk}
                    disabled={!question.trim() || isBusy}
                >
                    {state.status === 'loading'
                        ? 'Gathering sources...'
                        : state.status === 'drafting'
                            ? 'Drafting locally...'
                            : 'Ask'}
                </button>
            </div>
            {state.status === 'error' && <p className="study-thread-question-error">{state.error}</p>}
            {state.status === 'ready' && state.draft && (
                <div className="study-thread-answer">
                    <span>{state.draft.modelId === 'curated-grounding' ? 'Source-led starting point' : 'Grounded answer'}</span>
                    {answer ? (
                        <p>{answer}</p>
                    ) : (
                        <p>The local response needs review before it can be presented as an answer.</p>
                    )}
                    {state.draft.guardrail && <em>{state.draft.guardrail}</em>}
                    {state.draft.unstructured && state.draft.rawText && (
                        <details>
                            <summary>Raw local response</summary>
                            <p>{state.draft.rawText}</p>
                        </details>
                    )}
                    <details className="study-thread-answer-sources">
                        <summary>
                            <span>Sources used</span>
                            <em>{state.packet.sourceFindings.length} excerpts</em>
                        </summary>
                        <div>
                            {state.packet.sourceFindings.map(finding => (
                                <SourceNote key={finding.id} finding={finding} />
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </section>
    );
}

function SourceNote({ finding }) {
    const source = finding.source;

    return (
        <article className="study-thread-source">
            <div>
                <span>{source?.label || 'Study source'}</span>
                {finding.references?.length > 0 && <em>{finding.references.join(', ')}</em>}
            </div>
            <h3>{finding.title}</h3>
            <p>{finding.text}</p>
            {source?.href && (
                <a href={source.href} target="_blank" rel="noreferrer">Open source</a>
            )}
        </article>
    );
}

function ResearchView({ target, grounding, loading, bibles, translation, onOpenPassage }) {
    const findings = grounding?.exploreFindings ?? [];
    const draft = grounding ? buildGroundedStudyDraft(grounding.synthesisRequest) : null;
    const crossReferenceFindings = findings.filter(finding => (
        finding.source?.id === 'openbible-cross-references'
    ));
    const crossReferenceTargets = useMemo(() => (
        unique(crossReferenceFindings.flatMap(finding => (
            getCrossReferenceTargets(finding, target)
        ))).slice(0, 6)
    ), [grounding, target]);
    const referenceTargets = useTranslatedReferences(crossReferenceTargets, bibles, translation);
    const backgroundFindings = findings.filter(finding => (
        finding.source?.id !== 'passage-context'
        && finding.source?.id !== 'openbible-cross-references'
        && finding.source?.id !== 'exeges-method'
    ));

    if (loading) {
        return <p className="study-thread-loading">Gathering the passages and source notes for this thread...</p>;
    }

    if (!grounding) {
        return <p className="study-thread-loading">Research is not available for this thread yet.</p>;
    }

    return (
        <div className="study-thread-research">
            <section className="study-thread-reading">
                <span>In this passage</span>
                <p>{draft?.context || 'Start by asking what these words are doing in the sentence and chapter.'}</p>
                {draft?.nextQuestion && (
                    <p className="study-thread-question">{draft.nextQuestion}</p>
                )}
            </section>

            <CommentaryComparison
                target={target}
                passageFindings={grounding.sourceFindings ?? []}
            />

            <section className="study-thread-related">
                <div className="study-thread-section-heading">
                    <span>Related Scripture</span>
                    <em>{referenceTargets.length ? `${referenceTargets.length} passages` : 'No local matches'}</em>
                </div>
                {referenceTargets.length ? (
                    <div className="study-thread-passage-list">
                            {referenceTargets.map(reference => (
                            <ResolvedPassage
                                key={reference.reference}
                                reference={reference}
                                translationName={translation?.name || 'Bible'}
                                onOpenPassage={onOpenPassage}
                            />
                            ))}
                    </div>
                ) : (
                    <p>There are no locally resolved cross references for this selection yet.</p>
                )}
            </section>

            <PassageQuestion
                target={target}
                grounding={grounding}
                relatedPassages={referenceTargets}
                translation={translation}
            />

            {backgroundFindings.length > 0 && (
                <details className="study-thread-background">
                    <summary>
                        <span>Background notes</span>
                        <em>{backgroundFindings.length} notes</em>
                    </summary>
                    <div>
                        {backgroundFindings.map(finding => (
                            <SourceNote key={finding.id} finding={finding} />
                        ))}
                    </div>
                </details>
            )}

            <CommentaryPanel
                bookName={target.bookName}
                chapterNumber={target.chapter}
                targetVerse={target.verse}
            />

            <details className="study-thread-caution">
                <summary>Keep the claim close to the text</summary>
                <p>{draft?.guardrail || 'Let outside material clarify the passage instead of becoming the main evidence.'}</p>
            </details>
        </div>
    );
}

export default function StudyThread({
    target,
    observation,
    book,
    chapter,
    bibles = [],
    translation,
    onSaveThought,
    onDeleteThought,
    onOpenPassage,
    onClose,
}) {
    const [view, setView] = useState('reflect');
    const [thought, setThought] = useState(observation?.note ?? '');
    const [editingThought, setEditingThought] = useState(!observation?.note?.trim());
    const [saved, setSaved] = useState(false);
    const [persistenceError, setPersistenceError] = useState('');
    const [researchInput, setResearchInput] = useState('');
    const [groundingState, setGroundingState] = useState({ status: 'idle', grounding: null });

    useEffect(() => {
        setView('reflect');
        setThought(observation?.note ?? '');
        setEditingThought(!observation?.note?.trim());
        setSaved(false);
        setPersistenceError('');
        setResearchInput('');
        setGroundingState({ status: 'idle', grounding: null });
    }, [target.id]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const researchObservation = useMemo(() => ({
        id: target.id,
        type: 'note',
        verse: target.verse,
        quote: target.quote,
        reference: target.reference,
        selections: target.selections ?? [],
        note: researchInput,
    }), [researchInput, target]);
    const route = useMemo(
        () => classifyBackgroundQuestion(researchObservation),
        [researchObservation],
    );

    useEffect(() => {
        if (view !== 'explore' || !book?.name || !chapter?.chapter) return undefined;

        let cancelled = false;
        setGroundingState({ status: 'loading', grounding: null });

        getLocalStudyGroundingWithStaticPacks({
            observation: researchObservation,
            route: { id: route.id, label: route.label },
            scope: { bookName: book.name, chapterNumber: chapter.chapter },
        }).then(grounding => {
            if (!cancelled) setGroundingState({ status: 'ready', grounding });
        }).catch(() => {
            if (!cancelled) setGroundingState({ status: 'error', grounding: null });
        });

        return () => {
            cancelled = true;
        };
    }, [book?.name, chapter?.chapter, researchObservation, route.id, route.label, view]);

    if (!target) return null;

    const handleSave = () => {
        if (!onSaveThought?.(thought)) {
            setPersistenceError('Your takeaway could not be saved on this device. Keep it here while you try again.');
            return;
        }

        setPersistenceError('');
        setSaved(true);
        setEditingThought(false);
    };

    const handleExplore = () => {
        setSaved(false);
        setResearchInput(thought);
        setView('explore');
    };

    const handleDelete = () => {
        if (!onDeleteThought?.()) {
            setPersistenceError('Your takeaway could not be removed on this device.');
            return;
        }

        setPersistenceError('');
        setThought('');
        setSaved(false);
        setEditingThought(true);
    };

    return (
        <div className="study-thread-overlay" onClick={onClose}>
            <section
                className="study-thread"
                role="dialog"
                aria-modal="true"
                aria-labelledby="study-thread-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="study-thread-header">
                    <div>
                        <span>Study thread</span>
                        <h2 id="study-thread-title">{target.reference}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close study thread">&times;</button>
                </header>

                <div className="study-thread-body">
                    <blockquote>&ldquo;{target.quote}&rdquo;</blockquote>

                    <div className="study-thread-tabs" role="tablist" aria-label="Study thread view">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === 'reflect'}
                            className={view === 'reflect' ? 'active' : ''}
                            onClick={() => setView('reflect')}
                        >
                            My takeaway
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === 'explore'}
                            className={view === 'explore' ? 'active' : ''}
                            onClick={handleExplore}
                        >
                            Explore
                        </button>
                    </div>

                    {view === 'reflect' ? (
                        editingThought ? (
                            <section className="study-thread-reflection">
                                <span>Your takeaway</span>
                                <p>In your own words, what do you think this passage is saying?</p>
                                <textarea
                                    value={thought}
                                    onChange={(event) => {
                                        setThought(event.target.value);
                                        setSaved(false);
                                        setPersistenceError('');
                                    }}
                                    placeholder="Write what you are taking from this passage..."
                                    rows={5}
                                />
                                <div className="study-thread-actions">
                                    {observation?.note?.trim() && (
                                        <button type="button" className="study-thread-secondary" onClick={() => {
                                            setThought(observation.note);
                                            setEditingThought(false);
                                        }}>
                                            Cancel
                                        </button>
                                    )}
                                    <button type="button" className="study-thread-secondary" onClick={handleExplore}>
                                        Explore this passage
                                    </button>
                                    <button type="button" className="study-thread-primary study-thread-explore-action" onClick={handleSave} disabled={!thought.trim()}>
                                        {saved ? 'Saved' : 'Save takeaway'}
                                    </button>
                                </div>
                                {persistenceError && <p className="study-thread-persistence-error">{persistenceError}</p>}
                            </section>
                        ) : (
                            <section className="study-thread-takeaway">
                                <span>Your takeaway</span>
                                <p>{thought}</p>
                                <em>Anchored in {target.reference}</em>
                                <div className="study-thread-actions">
                                    <button type="button" className="study-thread-delete" onClick={handleDelete}>
                                        Remove takeaway
                                    </button>
                                    <button type="button" className="study-thread-secondary" onClick={() => setEditingThought(true)}>
                                        Refine takeaway
                                    </button>
                                    <button type="button" className="study-thread-primary study-thread-explore-action" onClick={handleExplore}>
                                        Explore this passage
                                    </button>
                                </div>
                                {persistenceError && <p className="study-thread-persistence-error">{persistenceError}</p>}
                            </section>
                        )
                    ) : (
                        <>
                            <ResearchView
                                target={target}
                                grounding={groundingState.grounding}
                                loading={groundingState.status === 'loading'}
                                bibles={bibles}
                                translation={translation}
                                onOpenPassage={onOpenPassage}
                            />
                            <section className="study-thread-return">
                                <span>{thought.trim() ? 'Your takeaway' : 'Before you return'}</span>
                                <p>{thought.trim()
                                    ? 'Keep refining your own understanding as you weigh the passage and the sources.'
                                    : 'Put what you are taking from this passage into your own words.'}</p>
                                <div className="study-thread-actions study-thread-research-actions">
                                    <button type="button" className="study-thread-primary" onClick={() => {
                                        setView('reflect');
                                        setEditingThought(true);
                                    }}>
                                        {thought.trim() ? 'Review my takeaway' : 'Write my takeaway'}
                                    </button>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
