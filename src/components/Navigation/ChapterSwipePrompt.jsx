import '../../styles/reader.css';

export default function ChapterSwipePrompt({ direction, chapter, onConfirm, onDismiss }) {
    if (!chapter) return null;

    const label = direction === 'next' ? 'Next chapter' : 'Previous chapter';
    const reference = `${chapter.bookName} ${chapter.chapterNum}`;

    return (
        <aside className="chapter-swipe-prompt" aria-live="polite">
            <span className="chapter-swipe-label">{label}</span>
            <button type="button" className="chapter-swipe-confirm" onClick={onConfirm}>
                <span>{reference}</span>
                <span aria-hidden="true">{direction === 'next' ? '\u2192' : '\u2190'}</span>
            </button>
            <button type="button" className="chapter-swipe-dismiss" onClick={onDismiss} aria-label="Dismiss chapter suggestion">
                &times;
            </button>
        </aside>
    );
}
