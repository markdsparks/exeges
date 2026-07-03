import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './styles/shared.css';
import './styles/tokens.css';
import './styles/reader.css';
import './styles/navigation.css';

import ChapterReader from './components/Reader/ChapterReader';
import ChapterNav from './components/Navigation/ChapterNav';
import BackToTop from './components/Shared/BackToTop';
import Sidebar from './components/Navigation/Sidebar';
import ReadingProgress from './components/Navigation/ReadingProgress';
import FontSizeControl from './components/Shared/FontSizeControl';

import { useBibleData } from './hooks/useBibleData';
import { useBookmarks } from './hooks/useBookmarks';
import { useTheme } from './hooks/useTheme';

export default function App() {
    const { book, bibles, selectedBookId, selectedChapterNum, navigateTo } = useBibleData();
    const { isBookmarked, toggleBookmark } = useBookmarks();
    const { mode, toggleMode, fontSize, cycleFontSize, setMode } = useTheme();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hideControls, setHideControls] = useState(false);

    // Shared ref for the reader container — used by ChapterReader and BackToTop
    const readerRef = useRef(null);

    // Sync dark-mode class on documentElement with theme state
    useEffect(() => {
        document.documentElement.classList.toggle('dark-mode', mode === 'dark');
    }, [mode]);

    // Group all books by testament for sidebar
    const bookGroups = bibles ? (() => {
        const ot = [];
        const nt = [];
        for (const b of bibles) {
            (b.testament === 'NT' ? nt : ot).push(b);
        }
        return { OT: ot, NT: nt };
    })() : null;

    // Load last reading position from localStorage on mount
    useEffect(() => {
        if (!selectedBookId || selectedBookId === 'genesis') {
            try {
                const pos = JSON.parse(localStorage.getItem('exes-position'));
                if (pos?.bookId && pos?.chapterNum) {
                    navigateTo(pos.bookId, pos.chapterNum);
                }
            } catch {}
        }
    }, []);

    // Persist reading position
    useEffect(() => {
        if (selectedBookId && selectedChapterNum) {
            try {
                localStorage.setItem(
                    'exes-position',
                    JSON.stringify({ bookId: selectedBookId, chapterNum: selectedChapterNum })
                );
            } catch {}
        }
    }, [selectedBookId, selectedChapterNum]);

    // Handle URL hash for shareable links
    useEffect(() => {
        const onHashChange = () => {
            const match = window.location.hash.match(/#([\w-]+)\/(\d+)/);
            if (match) navigateTo(match[1], parseInt(match[2], 10));
        };

        window.addEventListener('popstate', onHashChange);
        return () => window.removeEventListener('popstate', onHashChange);
    }, [navigateTo]);

    const handleNavigate = useCallback((bookId, chapterNum) => {
        navigateTo(bookId, chapterNum);
        setSidebarOpen(false);
        window.history.pushState(null, '', `#${bookId}/${chapterNum}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [navigateTo]);

    // Chapter navigation — prev/next with book-boundary logic
    const chapterNav = useMemo(() => {
        if (!book || !bibles) return null;
        const idx = bibles.findIndex(b => b.id === selectedBookId);
        if (idx === -1) return null;

        const currentChapterIndex = book.chapters?.findIndex(c => c.chapter === selectedChapterNum) ?? -1;

        // Next: same book +1, or first chapter of next book
        let nextInfo = null;
        if (currentChapterIndex >= 0 && currentChapterIndex < book.chapters.length - 1) {
            nextInfo = { bookId: book.id, bookName: book.name, chapterNum: book.chapters[currentChapterIndex + 1].chapter };
        } else if (idx < bibles.length - 1) {
            const nextBook = bibles[idx + 1];
            if (nextBook?.chapters?.[0]) {
                nextInfo = { bookId: nextBook.id, bookName: nextBook.name, chapterNum: nextBook.chapters[0].chapter };
            }
        }

        // Prev: same book -1, or last chapter of previous book
        let prevInfo = null;
        if (currentChapterIndex > 0) {
            prevInfo = { bookId: book.id, bookName: book.name, chapterNum: book.chapters[currentChapterIndex - 1].chapter };
        } else if (idx > 0) {
            const prevBook = bibles[idx - 1];
            if (prevBook?.chapters?.length) {
                const lastChap = prevBook.chapters[prevBook.chapters.length - 1].chapter;
                prevInfo = { bookId: prevBook.id, bookName: prevBook.name, chapterNum: lastChap };
            }
        }

        return { prevChapter: prevInfo, nextChapter: nextInfo };
    }, [bibles, book, selectedBookId, selectedChapterNum]);

    return (
        <div className={`app ${hideControls ? 'reading-mode' : ''}`}>
            {/* Progress Bar */}
            <ReadingProgress />

            {/* Sidebar */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay open"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}
            <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <Sidebar
                    booksByTestament={bookGroups}
                    activeBookId={selectedBookId}
                    onNavigate={handleNavigate}
                    onClose={() => setSidebarOpen(false)}
                />
            </div>

            {/* Header */}
            <header className={`app-header ${hideControls ? 'hidden' : ''}`}>
                <button onClick={() => setSidebarOpen(true)} aria-label="Menu">☰</button>
                <span>
                    {book?.name} &middot; Chapter {selectedChapterNum}
                </span>
                <button onClick={toggleMode} aria-label="Theme">
                    {mode === 'dark' ? '☀' : '☾'}
                </button>
            </header>

            {/* Reader */}
            <main className="app-main" onClick={() => setHideControls(!hideControls)}>
                {bookGroups ? (
                    book ? (
                        <>
                            <ChapterReader book={book} chapterNum={selectedChapterNum} readerRef={readerRef} />
                            <BackToTop readerRef={readerRef} />
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', marginTop: '15vh' }}>
                            <h2 style={{ fontSize: '1.4em', color: 'var(--color-text-secondary)', fontWeight: 400, marginBottom: '1rem' }}>
                                Open the menu to begin reading
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                Select a book and chapter from the sidebar
                            </p>
                        </div>
                    )
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '15vh' }}>
                        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
                    </div>
                )}
            </main>

            {/* Chapter Navigation */}
            {(book && bookGroups) && (chapterNav?.prevChapter || chapterNav?.nextChapter) && (
                <ChapterNav
                    prevChapter={chapterNav.prevChapter}
                    nextChapter={chapterNav.nextChapter}
                    onPrev={() => chapterNav.prevChapter && handleNavigate(chapterNav.prevChapter.bookId, chapterNav.prevChapter.chapterNum)}
                    onNext={() => chapterNav.nextChapter && handleNavigate(chapterNav.nextChapter.bookId, chapterNav.nextChapter.chapterNum)}
                />
            )}

            {/* Bottom Controls */}
            <div className={`controls-bar ${hideControls ? 'hidden' : ''}`}>
                <FontSizeControl fontSize={fontSize} onCycle={cycleFontSize} />
                <button
                    className="control-button"
                    onClick={() => setHideControls(!hideControls)}
                    title="Toggle reading mode"
                >📖</button>
            </div>
        </div>
    );
}
