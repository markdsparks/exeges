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
                disabled={!prevChapter}
                onClick={onPrev}
            >
                &larr; Prev
            </button>

            <span style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--color-text-muted)' }}>
                Chapter {prevChapter?.chapter || '—'} &harr; {nextChapter?.chapter || '—'}
            </span>

            <button
                className={`chapter-nav-button ${nextChapter ? '' : 'disabled'}`}
                disabled={!nextChapter}
                onClick={onNext}
            >
                Next &rarr;
            </button>
        </nav>
    );
}
