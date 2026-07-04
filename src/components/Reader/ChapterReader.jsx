import { useRef, useEffect, useState } from 'react';
import '../../styles/reader.css';
import BookmarkButton from '../Shared/BookmarkButton';
import { OBSERVATION_TYPES } from '../../lib/studyMethod';

function getTextTokens(text) {
    return text.match(/\s+|[^\s]+/g) ?? [];
}

function cleanToken(token) {
    return token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').trim();
}

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
    studySelection,
    studyObservations = [],
    onStudySelection,
    onAddStudyObservation,
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

    const selectStudyText = (verse, quote, scope) => {
        const cleanQuote = quote.replace(/\s+/g, ' ').trim();
        if (!cleanQuote) return;

        onStudySelection?.({
            bookId: book.id,
            bookName: book.name,
            chapter: chapterNum,
            verse,
            quote: cleanQuote,
            scope,
        });
    };

    const handleStudyPhraseSelection = (event, verse) => {
        if (!studyMode) return;

        const selectedText = getSelectedText(event.currentTarget);
        if (selectedText) {
            selectStudyText(verse, selectedText, 'phrase');
        }
    };

    const handleStudyWordClick = (event, verse, token) => {
        event.stopPropagation();

        const selectedText = getSelectedText(event.currentTarget.closest('.verse-group'));
        if (selectedText && selectedText !== token) return;

        selectStudyText(verse, cleanToken(token) || token, 'word');
    };

    const handleAddObservation = (type) => {
        if (!studySelection) return;
        onAddStudyObservation?.({ ...studySelection, type });
    };

    const renderStudyText = (v, verseObservations) => {
        const observedQuotes = verseObservations.map(item => item.quote.toLowerCase());

        return (
            <span
                className="verse-text study-verse-text"
                onMouseUp={(event) => handleStudyPhraseSelection(event, v.verse)}
                onTouchEnd={(event) => handleStudyPhraseSelection(event, v.verse)}
            >
                {getTextTokens(v.text).map((token, index) => {
                    if (/^\s+$/.test(token)) return token;

                    const clean = cleanToken(token);
                    const observed = clean && observedQuotes.includes(clean.toLowerCase());

                    return (
                        <span
                            key={`${v.verse}-${index}-${token}`}
                            className={`study-word ${observed ? 'observed' : ''}`}
                            onClick={(event) => handleStudyWordClick(event, v.verse, token)}
                        >
                            {token}
                        </span>
                    );
                })}
            </span>
        );
    };

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
                    const selectedForStudy = studySelection?.verse === v.verse;

                    return (
                       <div
                          key={v.verse}
                         className={`verse-group ${bookmarked && !studyMode ? 'bookmarked' : ''} ${noted && !studyMode ? 'noted' : ''} ${highlightedVerse === v.verse ? 'linked' : ''} ${studyMode ? 'study-enabled' : ''} ${verseObservations.length ? 'studied' : ''} ${selectedForStudy ? 'study-selected' : ''}`}
                          data-verse={v.verse}
                          id={`verse-${v.verse}`}
                          onClick={() => studyMode ? selectStudyText(v.verse, v.text, 'verse') : handleVerseToggle(v.verse)}
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
                                            {OBSERVATION_TYPES.find(type => type.id === item.type)?.label ?? 'Observation'}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {studyMode && selectedForStudy && (
                                <div className="study-context-popover" onClick={(event) => event.stopPropagation()}>
                                    <p className="study-context-selection">
                                        &ldquo;{studySelection.quote}&rdquo;
                                    </p>
                                    <div className="study-context-actions" aria-label="Observation types">
                                        {OBSERVATION_TYPES.map(type => (
                                            <button
                                                key={type.id}
                                                className="study-context-action"
                                                onClick={() => handleAddObservation(type.id)}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
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
