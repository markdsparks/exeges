import { useState, useEffect, useRef } from 'react';
import '../../styles/navigation.css';
import TranslationPicker from './TranslationPicker';

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
export default function Sidebar({
    booksByTestament,
    activeBookId,
    activeBookName,
    activeChapterNum,
    activeTranslationId,
    translationStatus,
    themePreference,
    bookmarks = [],
    notes = [],
    onSelectTheme,
    onSelectTranslation,
    onNavigate,
    onNavigateToVerse,
    onClose
}) {
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
                <section className="reader-state-section">
                    <button
                        className="continue-reading"
                        onClick={() => onNavigate?.(activeBookId, activeChapterNum)}
                    >
                        <span className="continue-label">Continue</span>
                        <span className="continue-reference">{activeBookName} {activeChapterNum}</span>
                    </button>
                </section>

                <TranslationPicker
                    activeId={activeTranslationId}
                    status={translationStatus}
                    onToggle={onSelectTranslation}
                />

                <section className="preferences-section">
                    <h3 className="preference-label">Theme</h3>
                    <div className="theme-options" role="group" aria-label="Theme">
                        {['auto', 'light', 'dark'].map(theme => (
                            <button
                                key={theme}
                                className={`theme-option ${themePreference === theme ? 'active' : ''}`}
                                onClick={() => onSelectTheme?.(theme)}
                                aria-pressed={themePreference === theme}
                            >
                                {theme}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="bookmarks-section">
                    <h3 className="testament-label">Bookmarks</h3>
                    {bookmarks.length > 0 ? (
                        <div className="bookmark-list">
                            {bookmarks.slice(0, 12).map(bookmark => (
                                <button
                                    key={`${bookmark.bookId}-${bookmark.chapter}-${bookmark.verse}`}
                                    className="bookmark-row"
                                    onClick={() => onNavigateToVerse?.(bookmark.bookId, bookmark.chapter, bookmark.verse)}
                                >
                                    <span className="bookmark-reference">
                                        {bookmark.bookName} {bookmark.chapter}:{bookmark.verse}
                                    </span>
                                    <span className="bookmark-snippet">{bookmark.text}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="bookmark-empty">Saved verses will appear here.</p>
                    )}
                </section>

                <section className="notes-section">
                    <h3 className="testament-label">Notes</h3>
                    {notes.length > 0 ? (
                        <div className="note-list">
                            {notes.slice(0, 12).map(note => (
                                <button
                                    key={`${note.bookId}-${note.chapter}-${note.verse}`}
                                    className="note-row"
                                    onClick={() => onNavigateToVerse?.(note.bookId, note.chapter, note.verse)}
                                >
                                    <span className="note-row-reference">
                                        {note.bookName} {note.chapter}:{note.verse}
                                    </span>
                                    <span className="note-row-snippet">{note.text}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="note-empty">Notes you write will appear here.</p>
                    )}
                </section>

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
