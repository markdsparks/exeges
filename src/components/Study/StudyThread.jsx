import { useEffect, useMemo, useState } from 'react';
import { buildGroundedStudyDraft } from '../../lib/groundedStudyDraft';
import {
    getLocalStudyGroundingWithStaticPacks,
} from '../../lib/localStudyGrounding';
import { resolveBibleReference } from '../../lib/localStudyDraftAudit';
import { classifyBackgroundQuestion } from '../../lib/backgroundGuides';
import { loadTranslationChapter } from '../../lib/chapterTranslation';
import { loadPublicCommentary, PUBLIC_COMMENTARY_SOURCES } from '../../lib/publicCommentary';

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
                <span>Commentary</span>
                <em>Public-domain sources</em>
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
    onOpenPassage,
    onClose,
}) {
    const [view, setView] = useState('reflect');
    const [thought, setThought] = useState(observation?.note ?? '');
    const [saved, setSaved] = useState(false);
    const [researchInput, setResearchInput] = useState('');
    const [groundingState, setGroundingState] = useState({ status: 'idle', grounding: null });

    useEffect(() => {
        setView('reflect');
        setThought(observation?.note ?? '');
        setSaved(false);
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
        onSaveThought?.(thought);
        setSaved(true);
    };

    const handleExplore = () => {
        setSaved(false);
        setResearchInput(thought);
        setView('explore');
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

                    {view === 'reflect' ? (
                        <>
                            <section className="study-thread-reflection">
                                <span>Your thought</span>
                                <p>What do you notice, wonder, or want to understand here?</p>
                                <textarea
                                    value={thought}
                                    onChange={(event) => {
                                        setThought(event.target.value);
                                        setSaved(false);
                                    }}
                                    placeholder="Write what you are seeing..."
                                    rows={5}
                                />
                            </section>
                            <div className="study-thread-actions">
                                <button type="button" className="study-thread-secondary" onClick={handleExplore}>
                                    Explore this
                                </button>
                                <button type="button" className="study-thread-primary" onClick={handleSave} disabled={!thought.trim()}>
                                    {saved ? 'Saved' : 'Save thought'}
                                </button>
                            </div>
                        </>
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
                            <div className="study-thread-actions study-thread-research-actions">
                                <button type="button" className="study-thread-secondary" onClick={() => setView('reflect')}>
                                    Back to thought
                                </button>
                                <button type="button" className="study-thread-primary" onClick={handleSave} disabled={!thought.trim()}>
                                    {saved ? 'Saved' : 'Save thought'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
