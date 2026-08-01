import { useEffect, useMemo, useState } from 'react';
import { buildGroundedStudyDraft } from '../../lib/groundedStudyDraft';
import {
    getLocalStudyGroundingWithStaticPacks,
} from '../../lib/localStudyGrounding';
import { resolveBibleReference } from '../../lib/localStudyDraftAudit';
import { classifyBackgroundQuestion } from '../../lib/backgroundGuides';

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

function ResolvedPassage({ reference }) {
    return (
        <article className="study-thread-passage">
            <strong>{reference.reference}</strong>
            {reference.verses.map(verse => (
                <p key={`${reference.reference}-${verse.verse}`}>
                    <sup>{verse.verse}</sup>{verse.text}
                </p>
            ))}
        </article>
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

function ResearchView({ target, grounding, loading, bibles }) {
    const findings = grounding?.exploreFindings ?? [];
    const draft = grounding ? buildGroundedStudyDraft(grounding.synthesisRequest) : null;
    const crossReferenceFindings = findings.filter(finding => (
        finding.source?.id === 'openbible-cross-references'
    ));
    const referenceTargets = unique(crossReferenceFindings.flatMap(finding => (
        getCrossReferenceTargets(finding, target)
    )))
        .slice(0, 6)
        .map(reference => resolveBibleReference(reference, bibles))
        .filter(result => result.status === 'valid');
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
                            <ResolvedPassage key={reference.reference} reference={reference} />
                        ))}
                    </div>
                ) : (
                    <p>There are no locally resolved cross references for this selection yet.</p>
                )}
            </section>

            {backgroundFindings.length > 0 && (
                <details className="study-thread-background">
                    <summary>
                        <span>Background and commentary</span>
                        <em>{backgroundFindings.length} notes</em>
                    </summary>
                    <div>
                        {backgroundFindings.map(finding => (
                            <SourceNote key={finding.id} finding={finding} />
                        ))}
                    </div>
                </details>
            )}

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
    onSaveThought,
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
