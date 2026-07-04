import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './styles/shared.css';
import './styles/tokens.css';
import './styles/reader.css';
import './styles/navigation.css';
import './styles/search.css';
import './styles/notes.css';
import './styles/study.css';

import ChapterReader from './components/Reader/ChapterReader';
import ChapterNav from './components/Navigation/ChapterNav';
import BackToTop from './components/Shared/BackToTop';
import Sidebar from './components/Navigation/Sidebar';
import ReadingProgress from './components/Navigation/ReadingProgress';
import FontSizeControl from './components/Shared/FontSizeControl';
import SearchPanel from './components/Search/SearchPanel';
import NoteEditor from './components/Notes/NoteEditor';
import StudyMode from './components/Study/StudyMode';

import { useBibleData } from './hooks/useBibleData';
import { useBookmarks } from './hooks/useBookmarks';
import { useNotes } from './hooks/useNotes';
import { useStudies } from './hooks/useStudies';
import { useTheme } from './hooks/useTheme';
import { useBibleSearch, useEsvSearch } from './hooks/useBibleSearch';
import { useTranslation } from './hooks/useTranslation';

export default function App() {
    const { book, bibles, selectedBookId, selectedChapterNum, navigateTo } = useBibleData();
    const { isBookmarked, toggleBookmark, getAllBookmarks } = useBookmarks();
    const { getNote, hasNote, saveNote, deleteNote, getAllNotes } = useNotes();
    const {
        getStudy,
        saveStudy,
        addObservation,
        removeObservation,
        deleteStudy,
        getAllStudies,
    } = useStudies();
    const { mode, themePreference, toggleMode, fontSize, cycleFontSize } = useTheme();
    const {
        selectedTranslation,
        selectedTranslationId,
        selectTranslation,
        displayBook,
        localBook,
        translationState,
    } = useTranslation(book, selectedChapterNum);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hideControls, setHideControls] = useState(false);
    const [targetVerse, setTargetVerse] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [noteTarget, setNoteTarget] = useState(null);
    const [studyTarget, setStudyTarget] = useState(null);
    const [studyStage, setStudyStage] = useState('observe');
    const [studySelection, setStudySelection] = useState(null);

    // Shared ref for the reader container — used by ChapterReader and BackToTop
    const readerRef = useRef(null);
    const lastScrollYRef = useRef(0);
    const tickingRef = useRef(false);

    // Sync dark-mode class on documentElement with theme state
    useEffect(() => {
        document.documentElement.classList.toggle('dark-mode', mode === 'dark');
        document.getElementById('theme-color')?.setAttribute(
            'content',
            mode === 'dark' ? '#1A1510' : '#FAF6EF'
        );
    }, [mode]);

    // Apply the persisted reader font size to the document root.
    useEffect(() => {
        document.documentElement.style.setProperty('--reader-font-size', `${fontSize}px`);
    }, [fontSize]);

    useEffect(() => {
        const handleScroll = () => {
            if (tickingRef.current) return;

            tickingRef.current = true;
            window.requestAnimationFrame(() => {
                const currentY = window.scrollY;
                const previousY = lastScrollYRef.current;
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                const delta = currentY - previousY;
                const nearTop = currentY < 96;
                const nearBottom = maxScroll - currentY < 160;
                const scrollingDown = delta > 8;
                const scrollingUp = delta < -8;

                if (nearTop || nearBottom || scrollingUp) {
                    setHideControls(false);
                } else if (scrollingDown && currentY > 160) {
                    setHideControls(true);
                }

                lastScrollYRef.current = currentY;
                tickingRef.current = false;
            });
        };

        lastScrollYRef.current = window.scrollY;
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Group all books by testament for sidebar
    const bookGroups = bibles ? (() => {
        const ot = [];
        const nt = [];
        for (const b of bibles) {
            (b.testament === 'NT' ? nt : ot).push(b);
        }
        return { OT: ot, NT: nt };
    })() : null;

    const bookmarkedVerses = useMemo(() => {
        if (!bibles) return [];

        return getAllBookmarks().map(bookmark => {
            const bookmarkBook = bibles.find(b => b.id === bookmark.bookId);
            const bookmarkChapter = bookmarkBook?.chapters?.find(c => c.chapter === bookmark.chapter);
            const bookmarkVerse = bookmarkChapter?.verses?.find(v => v.verse === bookmark.verse);

            if (!bookmarkBook || !bookmarkVerse) return null;

            return {
                ...bookmark,
                bookName: bookmarkBook.name,
                text: bookmarkVerse.text,
            };
        }).filter(Boolean);
    }, [bibles, getAllBookmarks]);

    const notedVerses = useMemo(() => {
        if (!bibles) return [];

        return getAllNotes().map(note => {
            const noteBook = bibles.find(b => b.id === note.bookId);
            const noteChapter = noteBook?.chapters?.find(c => c.chapter === note.chapter);
            const noteVerse = noteChapter?.verses?.find(v => v.verse === note.verse);

            if (!noteBook || !noteVerse) return null;

            return {
                ...note,
                bookName: noteBook.name,
                verseText: noteVerse.text,
            };
        }).filter(Boolean);
    }, [bibles, getAllNotes]);

    const savedStudies = useMemo(() => {
        if (!bibles) return [];

        return getAllStudies().map(study => {
            const studyBook = bibles.find(b => b.id === study.bookId);
            if (!studyBook) return null;

            const observationCount = study.observations?.length ?? 0;
            const firstObservation = study.observations?.[0]?.quote;
            const summary = observationCount > 0
                ? `${observationCount} observation${observationCount === 1 ? '' : 's'}${firstObservation ? `: ${firstObservation}` : ''}`
                : study.observe || study.interpret || study.apply;

            return {
                ...study,
                bookName: studyBook.name,
                summary,
            };
        }).filter(Boolean);
    }, [bibles, getAllStudies]);

    const searchContext = useMemo(() => ({
        bookId: selectedBookId,
        chapterNum: selectedChapterNum,
    }), [selectedBookId, selectedChapterNum]);
    const kjvSearch = useBibleSearch(bibles, searchQuery, searchContext);
    const esvSearch = useEsvSearch(bibles, searchQuery, searchContext);
    const search = selectedTranslation.id === 'esv' ? esvSearch : kjvSearch;
    const translationStatus = translationState.status === 'setup-needed' || translationState.status === 'error'
        ? translationState.message
        : translationState.status === 'loading'
            ? 'Loading ESV...'
            : '';
    const readerBook = selectedTranslation.source === 'remote' ? displayBook : localBook;

    // Load last reading position from localStorage on mount
    useEffect(() => {
        if (window.location.hash) return;

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
            const match = window.location.hash.match(/^#\/?([\w-]+)\/(\d+)(?:\/v(\d+))?$/);
            if (match) {
                navigateTo(match[1], parseInt(match[2], 10));
                setTargetVerse(match[3] ? parseInt(match[3], 10) : null);
            }
        };

        onHashChange();
        window.addEventListener('hashchange', onHashChange);
        window.addEventListener('popstate', onHashChange);
        return () => {
            window.removeEventListener('hashchange', onHashChange);
            window.removeEventListener('popstate', onHashChange);
        };
    }, [navigateTo]);

    const handleNavigate = useCallback((bookId, chapterNum) => {
        setTargetVerse(null);
        navigateTo(bookId, chapterNum);
        setSidebarOpen(false);
        setStudyTarget(null);
        setStudySelection(null);
        window.history.pushState(null, '', `#${bookId}/${chapterNum}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [navigateTo]);

    const handleNavigateToVerse = useCallback((bookId, chapterNum, verseNum) => {
        setTargetVerse(verseNum);
        navigateTo(bookId, chapterNum);
        setSidebarOpen(false);
        setSearchOpen(false);
        setStudyTarget(null);
        setStudySelection(null);
        window.history.pushState(null, '', `#${bookId}/${chapterNum}/v${verseNum}`);
    }, [navigateTo]);

    const handleSearchResult = useCallback((result) => {
        handleNavigateToVerse(result.bookId, result.chapter, result.verse);
    }, [handleNavigateToVerse]);

    const handleOpenNote = useCallback((bookId, chapterNum, verseNum) => {
        const noteBook = displayBook?.id === bookId
            ? displayBook
            : bibles?.find(b => b.id === bookId);
        const noteChapter = noteBook?.chapters?.find(c => c.chapter === chapterNum);
        const noteVerse = noteChapter?.verses?.find(v => v.verse === verseNum);

        if (!noteBook || !noteVerse) return;

        setHideControls(false);
        setNoteTarget({
            bookId,
            bookName: noteBook.name,
            chapter: chapterNum,
            verse: verseNum,
            text: noteVerse.text,
        });
    }, [bibles, displayBook]);

    const activeNote = noteTarget
        ? getNote(noteTarget.bookId, noteTarget.chapter, noteTarget.verse)
        : null;

    const activeStudy = studyTarget
        ? getStudy(studyTarget.bookId, studyTarget.chapter)
        : null;

    const handleOpenSearch = useCallback(() => {
        setHideControls(false);
        setSearchOpen(true);
    }, []);

    const handleOpenStudy = useCallback((bookId = selectedBookId, chapterNum = selectedChapterNum) => {
        const studyBook = bibles?.find(b => b.id === bookId);
        if (!studyBook || !chapterNum) return;

        if (bookId !== selectedBookId || chapterNum !== selectedChapterNum) {
            setTargetVerse(null);
            navigateTo(bookId, chapterNum);
            window.history.pushState(null, '', `#${bookId}/${chapterNum}`);
            window.scrollTo({ top: 0, behavior: 'auto' });
        }

        setHideControls(false);
        setSidebarOpen(false);
        setStudyStage('observe');
        setStudySelection(null);
        setStudyTarget({
            bookId,
            bookName: studyBook.name,
            chapter: chapterNum,
        });
    }, [bibles, navigateTo, selectedBookId, selectedChapterNum]);

    const handleAddStudyObservation = useCallback((observation) => {
        if (!studyTarget) return;

        addObservation(studyTarget.bookId, studyTarget.chapter, observation);
        setStudySelection(null);
    }, [addObservation, studyTarget]);

    const handleRemoveStudyObservation = useCallback((observationId) => {
        if (!studyTarget) return;
        removeObservation(studyTarget.bookId, studyTarget.chapter, observationId);
    }, [removeObservation, studyTarget]);

    const handleSaveStudyFields = useCallback((fields) => {
        if (!studyTarget) return;
        saveStudy(studyTarget.bookId, studyTarget.chapter, fields);
    }, [saveStudy, studyTarget]);

    const handleDeleteActiveStudy = useCallback(() => {
        if (!studyTarget) return;

        deleteStudy(studyTarget.bookId, studyTarget.chapter);
        setStudySelection(null);
    }, [deleteStudy, studyTarget]);

    const handleCloseStudy = useCallback(() => {
        setStudyTarget(null);
        setStudySelection(null);
        setHideControls(false);
    }, []);

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

    const activeChapter = readerBook?.chapters?.find(c => c.chapter === selectedChapterNum);
    const readerContent = book ? (
        <>
            <ChapterReader
                book={readerBook}
                chapterNum={selectedChapterNum}
                readerRef={readerRef}
                targetVerse={targetVerse}
                isBookmarked={isBookmarked}
                onToggleBookmark={toggleBookmark}
                hasNote={hasNote}
                onOpenNote={handleOpenNote}
                translation={selectedTranslation}
                translationState={translationState}
                studyMode={!!studyTarget}
                studySelection={studySelection}
                studyObservations={activeStudy?.observations ?? []}
                onStudySelection={setStudySelection}
                onAddStudyObservation={handleAddStudyObservation}
            />
            {(chapterNav?.prevChapter || chapterNav?.nextChapter) && (
                <ChapterNav
                    prevChapter={chapterNav.prevChapter}
                    nextChapter={chapterNav.nextChapter}
                    currentReference={`${book.name} ${selectedChapterNum}`}
                    onPrev={() => chapterNav.prevChapter && handleNavigate(chapterNav.prevChapter.bookId, chapterNav.prevChapter.chapterNum)}
                    onNext={() => chapterNav.nextChapter && handleNavigate(chapterNav.nextChapter.bookId, chapterNav.nextChapter.chapterNum)}
                />
            )}
            <BackToTop />
        </>
    ) : null;

    return (
        <div className={`app ${hideControls ? 'reading-mode' : ''} ${studyTarget ? 'study-mode' : ''}`}>
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
                    activeBookName={book?.name}
                    activeChapterNum={selectedChapterNum}
                    activeTranslationId={selectedTranslationId}
                    translationStatus={translationStatus}
                    themePreference={themePreference}
                    onSelectTheme={toggleMode}
                    bookmarks={bookmarkedVerses}
                    notes={notedVerses}
                    studies={savedStudies}
                    onSelectTranslation={selectTranslation}
                    onNavigate={handleNavigate}
                    onNavigateToVerse={handleNavigateToVerse}
                    onOpenStudy={handleOpenStudy}
                    onClose={() => setSidebarOpen(false)}
                />
            </div>

            <SearchPanel
                open={searchOpen}
                query={searchQuery}
                results={search.results}
                totalResults={search.totalResults}
                isLimited={search.isLimited}
                highlightTerms={search.highlightTerms}
                translationName={selectedTranslation.name}
                searchSource={selectedTranslation.source}
                isLoading={search.isLoading}
                error={search.error}
                onQueryChange={setSearchQuery}
                onClose={() => setSearchOpen(false)}
                onSelectResult={handleSearchResult}
            />

            <NoteEditor
                open={!!noteTarget}
                noteTarget={noteTarget}
                note={activeNote}
                onSave={(text) => noteTarget && saveNote(noteTarget.bookId, noteTarget.chapter, noteTarget.verse, text)}
                onDelete={() => noteTarget && deleteNote(noteTarget.bookId, noteTarget.chapter, noteTarget.verse)}
                onClose={() => setNoteTarget(null)}
            />

            {/* Header */}
            <header className={`app-header ${hideControls ? 'hidden' : ''}`}>
                <button onClick={() => setSidebarOpen(true)} aria-label="Menu">☰</button>
                <span>
                    {book?.name} &middot; Chapter {selectedChapterNum}
                </span>
            </header>

            {/* Reader */}
            <main className="app-main">
                {bookGroups ? (
                    book ? (
                        studyTarget ? (
                            <div className="study-layout">
                                <div className="study-reader-pane">
                                    {readerContent}
                                </div>
                                <StudyMode
                                    book={readerBook}
                                    chapter={activeChapter}
                                    reference={`${studyTarget.bookName} ${studyTarget.chapter}`}
                                    study={activeStudy}
                                    stage={studyStage}
                                    selection={studySelection}
                                    onStageChange={setStudyStage}
                                    onAddObservation={handleAddStudyObservation}
                                    onRemoveObservation={handleRemoveStudyObservation}
                                    onSaveFields={handleSaveStudyFields}
                                    onDeleteStudy={handleDeleteActiveStudy}
                                    onClose={handleCloseStudy}
                                />
                            </div>
                        ) : readerContent
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

            {/* Bottom Controls */}
            <div className={`controls-bar ${hideControls ? 'hidden' : ''}`}>
                <button
                    className="control-button search-control-button"
                    onClick={handleOpenSearch}
                    title="Search"
                    aria-label="Search scripture"
                >⌕</button>
                <button
                    className="control-button study-control-button"
                    onClick={() => handleOpenStudy()}
                    title="Study"
                    aria-label={`Study ${book?.name ?? 'current book'} ${selectedChapterNum ?? ''}`}
                >Study</button>
                <FontSizeControl fontSize={fontSize} onCycle={cycleFontSize} />
            </div>
        </div>
    );
}
