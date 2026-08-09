import '../../styles/reader.css';

export default function ChapterSwipePrompt({ direction, chapter, onConfirm }) {
    if (!chapter) return null;

    const label = direction === 'next' ? 'Next chapter' : 'Previous chapter';
    const reference = `${chapter.bookName} ${chapter.chapterNum}`;
    const arrow = direction === 'next' ? <span className="chapter-swipe-arrow" aria-hidden="true">&rarr;</span> : <span className="chapter-swipe-arrow" aria-hidden="true">&larr;</span>;

    return (
        <aside className={`chapter-swipe-prompt ${direction}`} aria-live="polite">
            <button
                type="button"
                className="chapter-swipe-confirm"
                onClick={onConfirm}
                aria-label={`Open ${label.toLowerCase()}, ${reference}`}
            >
                {direction === 'previous' && arrow}
                <span className="chapter-swipe-copy">
                    <span className="chapter-swipe-label">{label}</span>
                    <span className="chapter-swipe-reference">{reference}</span>
                </span>
                {direction === 'next' && arrow}
            </button>
        </aside>
    );
}
