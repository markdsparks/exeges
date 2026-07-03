import '../../styles/reader.css';

/**
 * ChapterNav — Prev/Next chapter navigation buttons.
 * Shows the previous and next chapter links, respecting book boundaries.
 */
export default function ChapterNav({ prevChapter, nextChapter, onPrev, onNext }) {
   return (
       <nav className="chapter-nav">
           <button
              className={`chapter-nav-button ${prevChapter ? '' : 'disabled'}`}
               onClick={() => prevChapter && onPrev?.()}
            >
              ← Prev
             </button>

           <span style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--color-text-muted)' }}>
               Chapter {prevChapter?.chapter || '—'} ↔ {nextChapter?.chapter || '—'}
           </span>

           <button
             className={`chapter-nav-button ${nextChapter ? '' : 'disabled'}`}
              onClick={() => nextChapter && onNext?.()}
            >
              Next →
          </button>
       </nav>
    );
}
