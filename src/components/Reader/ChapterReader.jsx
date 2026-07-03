import { useRef, useEffect, useState } from 'react';
import '../../styles/reader.css';
import BookmarkButton from '../Shared/BookmarkButton';

/**
 * ChapterReader — The heart of the app.
 * Renders a single chapter verse-by-verse with beautiful typography.
 */
export default function ChapterReader({ book, chapterNum, readerRef, targetVerse, isBookmarked, onToggleBookmark }) {
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
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Loading...</p>
              </div>
             );
          }

    const handleVerseToggle = (verse) => {
        onToggleBookmark?.(book.id, chapterNum, verse);
    };

    return (
           <div className="reader-container" ref={ref}>
               {/* Chapter header */}
                <header className="chapter-header">
                   <h2 className="chapter-number">Chapter {chapterNum}</h2>
                    <div className="chapter-divider" />
                 </header>

               {/* Verses — beautifully spaced */}
                {chapter.verses.map((v) => {
                    const bookmarked = isBookmarked?.(book.id, chapterNum, v.verse) ?? false;

                    return (
                       <div
                          key={v.verse}
                         className={`verse-group ${bookmarked ? 'bookmarked' : ''} ${highlightedVerse === v.verse ? 'linked' : ''}`}
                          data-verse={v.verse}
                          id={`verse-${v.verse}`}
                          onClick={() => handleVerseToggle(v.verse)}
                       >
                           <span className="verse-number">{v.verse}</span>{' '}
                            <span className="verse-text">{v.text}</span>
                            <BookmarkButton
                                bookId={book.id}
                                chapter={chapterNum}
                                verse={v.verse}
                                isBookmarked={bookmarked}
                                onToggle={onToggleBookmark}
                            />
                        </div>
                    );
                })}
                  </div>
                 );
             }
