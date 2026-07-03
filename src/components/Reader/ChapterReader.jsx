import { useRef, useEffect } from 'react';
import '../../styles/reader.css';

/**
 * ChapterReader — The heart of the app.
 * Renders a single chapter verse-by-verse with beautiful typography.
 */
export default function ChapterReader({ book, chapterNum }) {
    const ref = useRef(null);
    const chapter = book?.chapters?.find(c => c.chapter === chapterNum);

       // Scroll to top when chapter changes
    useEffect(() => {
        if (ref.current) ref.current.scrollTop = 0;
         }, [chapterNum, book?.id]);

       // Scroll to a verse anchor from URL hash
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && ref.current) {
            const verseMatch = hash.match(/#?([\w-]+)\/(\d+)\/v(\d+)/);
            if (verseMatch) {
                const [, , , vNum] = verseMatch;
                const el = ref.current.querySelector(`[data-verse="${vNum}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }
              }
           }, [chapterNum, book?.id]);

       // Loading state
    if (!book || !chapter) {
        return (
            <div style={{ textAlign: 'center', marginTop: '15vh' }}>
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Loading...</p>
              </div>
             );
          }

    return (
           <div className="reader-container" ref={ref}>
               {/* Chapter header */}
                <header className="chapter-header">
                   <h2 className="chapter-number">Chapter {chapterNum}</h2>
                    <div className="chapter-divider" />
                 </header>

               {/* Verses — beautifully spaced */}
                {chapter.verses.map((v) => (
                       <p
                          key={v.verse}
                         className="verse-group"
                        data-verse={v.verse}
                          id={`verse-${v.verse}`}
                       >
                           <span className="verse-number">{v.verse}</span>
                            <span className="verse-text">{v.text}</span>
                        </p>
                      ))}
                  </div>
                 );
             }
