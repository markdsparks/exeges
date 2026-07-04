import { useRef, useEffect, useState } from 'react';
import '../../styles/reader.css';
import BookmarkButton from '../Shared/BookmarkButton';
import StudySelectionPanel from '../Study/StudySelectionPanel';
import {
    getObservationTypeLabel,
    getSelectionQuote,
    makePhraseSelection,
    makeWordSelection,
    tokenizeStudyText,
} from '../../lib/studyMethod';

function getSelectedText(container) {
    const selection = window.getSelection?.();
    if (!selection || selection.isCollapsed) return '';

    const selectedText = selection.toString().replace(/\s+/g, ' ').trim();
    if (!selectedText) return '';

    if (
        !selection.anchorNode
        || !selection.focusNode
        || !container?.contains(selection.anchorNode)
        || !container.contains(selection.focusNode)
    ) {
        return '';
    }

    return selectedText;
}

/**
 * ChapterReader — The heart of the app.
 * Renders a single chapter verse-by-verse with beautiful typography.
 */
export default function ChapterReader({
    book,
    chapterNum,
    readerRef,
    targetVerse,
    isBookmarked,
    onToggleBookmark,
    hasNote,
    onOpenNote,
    translation,
    translationState,
    studyMode = false,
    studyCanSelect = false,
    studySelection = [],
    studyWorkflow,
    studyObservationCounts = {},
    studyObservations = [],
    onToggleStudySelection,
    onAddStudySelections,
    onAddStudyObservation,
    onClearStudySelection,
    onSelectSameStudyWord,
    onStartStudyContrast,
    onCancelStudyWorkflow,
}) {
    const fallbackRef = useRef(null);
    const ref = readerRef ?? fallbackRef;
    const chapter = book?.chapters?.find(c => c.chapter === chapterNum);
    const [highlightedVerse, setHighlightedVerse] = useState(null);

       // Scroll to top when chapter changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
         }, [chapterNum, book?.id]);

       // Scroll to a verse anchor from URL hash or bookmark navigation
    useEffect(() => {
        if (!ref.current) return;

        const hashVerse = window.location.hash.match(/#?\/?[\w-]+\/\d+\/v(\d+)/)?.[1];
        const verseNum = targetVerse ?? (hashVerse ? parseInt(hashVerse, 10) : null);

        if (verseNum) {
                const el = ref.current.querySelector(`[data-verse="${verseNum}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setHighlightedVerse(verseNum);

                    const timeout = window.setTimeout(() => setHighlightedVerse(null), 1600);
                    return () => window.clearTimeout(timeout);
                }
              }
           }, [chapterNum, book?.id, targetVerse]);

       // Loading state
    if (!book || !chapter) {
        return (
            <div style={{ textAlign: 'center', marginTop: '15vh' }}>
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {translationState?.status === 'setup-needed'
                        ? translationState.message
                        : translationState?.status === 'error'
                            ? translationState.message
                            : 'Loading...'}
                </p>
              </div>
             );
          }

    const handleVerseToggle = (verse) => {
        onToggleBookmark?.(book.id, chapterNum, verse);
    };

    const addStudyPhrase = (verse, quote) => {
        const selection = makePhraseSelection({
            bookId: book.id,
            bookName: book.name,
            chapter: chapterNum,
            verse,
            quote,
        });

        if (selection) onAddStudySelections?.([selection]);
    };

    const handleStudyPhraseSelection = (event, verse) => {
        if (!studyCanSelect) return;

        const selectedText = getSelectedText(event.currentTarget);
        if (selectedText) {
            addStudyPhrase(verse, selectedText);
        }
    };

    const handleStudyWordClick = (event, selection) => {
        event.stopPropagation();
        if (!studyCanSelect) return;

        const selectedText = getSelectedText(event.currentTarget.closest('.verse-group'));
        if (selectedText && selectedText !== selection.text) return;

        onToggleStudySelection?.(selection);
    };

    const getVerseSelection = (v) => {
        return {
            id: `${book.id}-${chapterNum}-${v.verse}-verse`,
            bookId: book.id,
            bookName: book.name,
            chapter: chapterNum,
            verse: v.verse,
            tokenIndex: Number.MAX_SAFE_INTEGER,
            scope: 'verse',
            text: v.text,
            normalized: '',
        };
    };

    const renderStudyText = (v, verseObservations) => {
        const selectedIds = new Set(studySelection.map(item => item.id));
        const observedIds = new Set(
            verseObservations.flatMap(item => [
                ...(item.selections ?? []),
                ...(item.relatedSelections ?? []),
                ...(item.contrast?.sideA ?? []),
                ...(item.contrast?.sideB ?? []),
            ]).map(item => item.id)
        );

        return (
            <span
                className="verse-text study-verse-text"
                onMouseUp={(event) => handleStudyPhraseSelection(event, v.verse)}
                onTouchEnd={(event) => handleStudyPhraseSelection(event, v.verse)}
            >
                {tokenizeStudyText(v.text).map((token, index) => {
                    if (token.whitespace) return token.text;

                    const selection = makeWordSelection({
                        bookId: book.id,
                        bookName: book.name,
                        chapter: chapterNum,
                        verse: v.verse,
                        token,
                    });
                    const observed = observedIds.has(selection.id);
                    const selected = selectedIds.has(selection.id);

                    return (
                        <span
                            key={`${v.verse}-${index}-${token.text}`}
                            className={`study-word ${observed ? 'observed' : ''} ${selected ? 'selected' : ''}`}
                            onClick={(event) => handleStudyWordClick(event, selection)}
                        >
                            {token.text}
                        </span>
                    );
                })}
            </span>
        );
    };

    const lastSelectionVerse = studySelection[studySelection.length - 1]?.verse;
    const workflowSideA = studyWorkflow?.sideA ?? [];
    const lastWorkflowVerse = workflowSideA[workflowSideA.length - 1]?.verse;
    const inlinePanelVerse = studyMode && studyCanSelect ? (lastSelectionVerse ?? lastWorkflowVerse ?? null) : null;

    return (
           <div className="reader-container" ref={ref}>
               {/* Chapter header */}
                <header className="chapter-header">
                   <h2 className="chapter-number">Chapter {chapterNum}</h2>
                    <p className="chapter-translation">{translation?.name}</p>
                    <div className="chapter-divider" />
                 </header>

               {/* Verses — beautifully spaced */}
                {chapter.verses.map((v) => {
                    const bookmarked = isBookmarked?.(book.id, chapterNum, v.verse) ?? false;
                    const noted = hasNote?.(book.id, chapterNum, v.verse) ?? false;
                    const verseObservations = studyObservations.filter(item => item.verse === v.verse);
                    const verseSelectedItems = studySelection.filter(item => item.verse === v.verse);
                    const selectedForStudy = verseSelectedItems.length > 0;

                    return (
                       <div
                          key={v.verse}
                         className={`verse-group ${bookmarked && !studyMode ? 'bookmarked' : ''} ${noted && !studyMode ? 'noted' : ''} ${highlightedVerse === v.verse ? 'linked' : ''} ${studyMode ? 'study-enabled' : ''} ${studyMode && !studyCanSelect ? 'study-readonly' : ''} ${verseObservations.length ? 'studied' : ''} ${selectedForStudy ? 'study-selected' : ''}`}
                          data-verse={v.verse}
                          id={`verse-${v.verse}`}
                          onClick={() => {
                              if (!studyMode) {
                                  handleVerseToggle(v.verse);
                                  return;
                              }

                              if (studyCanSelect) {
                                  onToggleStudySelection?.(getVerseSelection(v));
                              }
                          }}
                       >
                           <span className="verse-number">{v.verse}</span>{' '}
                            {studyMode ? renderStudyText(v, verseObservations) : (
                                <span className="verse-text">{v.text}</span>
                            )}
                            {!studyMode && (
                                <>
                                    <BookmarkButton
                                        bookId={book.id}
                                        chapter={chapterNum}
                                        verse={v.verse}
                                        isBookmarked={bookmarked}
                                        onToggle={onToggleBookmark}
                                    />
                                    <button
                                        className={`note-indicator ${noted ? 'active' : ''}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onOpenNote?.(book.id, chapterNum, v.verse);
                                        }}
                                        aria-label={`${noted ? 'Edit' : 'Add'} note for ${book.name} ${chapterNum}:${v.verse}`}
                                        title={`${noted ? 'Edit' : 'Add'} note`}
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                            {studyMode && verseObservations.length > 0 && (
                                <div className="study-verse-markers" aria-label={`${verseObservations.length} study observations`}>
                                    {verseObservations.slice(0, 4).map(item => (
                                        <span key={item.id} className={`study-verse-marker type-${item.type}`}>
                                            {getObservationTypeLabel(item.type)}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {studyMode && selectedForStudy && (
                                <p className="study-verse-selection">
                                    Selected: {getSelectionQuote(verseSelectedItems)}
                                </p>
                            )}
                            {studyMode && inlinePanelVerse === v.verse && (
                                <StudySelectionPanel
                                    className="study-inline-selection-panel"
                                    selection={studySelection}
                                    workflow={studyWorkflow}
                                    observationCounts={studyObservationCounts}
                                    onAddObservation={onAddStudyObservation}
                                    onClearSelection={onClearStudySelection}
                                    onSelectSameWord={onSelectSameStudyWord}
                                    onStartContrast={onStartStudyContrast}
                                    onCancelWorkflow={onCancelStudyWorkflow}
                                />
                            )}
                        </div>
                    );
                })}
                {book.copyright && (
                    <p className="translation-copyright">{book.copyright}</p>
                )}
                  </div>
                 );
             }
