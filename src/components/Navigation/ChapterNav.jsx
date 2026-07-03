import '../../styles/reader.css';

/**
 * ChapterNav — Prev/Next chapter navigation buttons.
 * Shows the previous and next chapter links, respecting book boundaries.
 */
function chapterLabel(chapter) {
    return chapter ? `${chapter.bookName} ${chapter.chapterNum}` : null;
}

export default function ChapterNav({ prevChapter, nextChapter, currentReference, onPrev, onNext }) {
    const prevLabel = chapterLabel(prevChapter);
    const nextLabel = chapterLabel(nextChapter);

    return (
        <nav className="chapter-nav" aria-label="Chapter navigation">
            <button
                className={`chapter-nav-button ${prevChapter ? '' : 'disabled'}`}
                disabled={!prevChapter}
                onClick={onPrev}
            >
                <span aria-hidden="true">&larr;</span>
                <span>
                    <span className="chapter-nav-kicker">Previous</span>
                    <span className="chapter-nav-reference">{prevLabel || 'Start'}</span>
                </span>
            </button>

            <span className="chapter-nav-current">
                {currentReference}
            </span>

            <button
                className={`chapter-nav-button ${nextChapter ? '' : 'disabled'}`}
                disabled={!nextChapter}
                onClick={onNext}
            >
                <span>
                    <span className="chapter-nav-kicker">Next</span>
                    <span className="chapter-nav-reference">{nextLabel || 'End'}</span>
                </span>
                <span aria-hidden="true">&rarr;</span>
            </button>
        </nav>
    );
}
