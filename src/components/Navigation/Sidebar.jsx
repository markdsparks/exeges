import { useState, useEffect, useRef } from 'react';
import '../../styles/navigation.css';

/** Hook: fires a callback once when the element enters the viewport. */
function useInViewObserver(onInView) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el || !onInView) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onInView();
                    obs.disconnect(); // fire once
                }
            },
            { threshold: 0.1 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [onInView]);
    return ref;
}

/**
 * LazyChapterGrid — only renders chapter buttons when scrolled into view.
 *
 * Until visible, a skeleton placeholder keeps the layout stable so scrolling
 * doesn't jump. Once in-view, the actual <button> elements are rendered.
 */
function LazyChapterGrid({ chapterCount, onSelect }) {
    const [visible, setVisible] = useState(false);
    const ref = useInViewObserver(() => setVisible(true));

    return (
        <div className="chapter-grid" ref={ref} role="group" aria-label={`${chapterCount} chapters`}>
            {!visible ? (
                <div className="chapter-grid-skeleton">
                    {Array.from({ length: Math.min(chapterCount, 9) }, (_, i) => (
                        <div key={i} className="chapter-skeleton" />
                    ))}
                </div>
            ) : (
                chapterCount > 0 && (
                    <>
                        {Array.from({ length: chapterCount }, (_, i) => i + 1).map(ch => (
                            <button key={ch} className={`chapter-item`} onClick={() => onSelect?.(ch)}>
                                {ch}
                            </button>
                        ))}
                    </>
                )
            )}
        </div>
    );
}

/* ─── Sidebar Styles ─── */

/**
 * BookItem — renders the book name and lazily reveals its chapter grid.
 *
 * Performance strategy:
 * 1. The book toggle button is a plain text + count (cheap to render).
 * 2. When expanded, the chapter grid starts as skeletons (no real buttons).
 * 3. IntersectionObserver detects when the expanded row enters the viewport,
 *    then renders the actual <button> elements — no layout thrashing on open.
 * 4. Expand/collapse is instant because no heavy DOM nodes are touched during
 *    the toggle itself.
 */
function BookItem({ name, chapterCount, isActive, isOpen, onOpen, onSelect }) {
    return (
        <div className="book-item-wrapper">
            <button
                className={`book-item ${isActive ? 'active' : ''} ${isOpen ? 'expanded' : ''}`}
                onClick={onOpen}
                aria-expanded={isOpen}
                aria-controls={`chapters-${name.replace(/\s/g, '-')}`}
            >
                <span>{name}</span>
                <span className="expand-indicator" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                </span>
            </button>

            {isOpen && (
                <LazyChapterGrid chapterCount={chapterCount} onSelect={onSelect} />
            )}
        </div>
    );
}

/**
 * Sidebar — Book/chapter navigation panel.
 * Slides in from the left with a dimmed overlay.
 */
export default function Sidebar({ booksByTestament, activeBookId, onNavigate, onClose }) {
    const [openBookId, setOpenBookId] = useState(null);

    if (!booksByTestament) return null;

    return (
        <div className="sidebar-panel">
            {/* Header */}
            <div className="sidebar-header">
                <span className="sidebar-title">Exeges</span>
                <button className="sidebar-close" onClick={onClose} aria-label="Close">
                    &times;
                </button>
            </div>

            {/* Content */}
            <div className="sidebar-content">
                {/* Old Testament */}
                <section>
                    <h3 className="testament-label">Old Testament</h3>
                    {booksByTestament.OT.map(book => (
                        <BookItem
                            key={book.id}
                            name={book.name}
                            chapterCount={book.chapters?.length || 0}
                            isActive={activeBookId === book.id}
                            isOpen={openBookId === book.id}
                            onOpen={() => setOpenBookId(openBookId === book.id ? null : book.id)}
                            onSelect={(ch) => onNavigate?.(book.id, ch)}
                        />
                    ))}
                </section>

                {/* New Testament */}
                <section>
                    <h3 className="testament-label">New Testament</h3>
                    {booksByTestament.NT.map(book => (
                        <BookItem
                            key={book.id}
                            name={book.name}
                            chapterCount={book.chapters?.length || 0}
                            isActive={activeBookId === book.id}
                            isOpen={openBookId === book.id}
                            onOpen={() => setOpenBookId(openBookId === book.id ? null : book.id)}
                            onSelect={(ch) => onNavigate?.(book.id, ch)}
                        />
                    ))}
                </section>
            </div>
        </div>
    );
}
