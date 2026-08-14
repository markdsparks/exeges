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
import ChapterSwipePrompt from './components/Navigation/ChapterSwipePrompt';
import ReferencePicker from './components/Navigation/ReferencePicker';
import BackToTop from './components/Shared/BackToTop';
import Sidebar from './components/Navigation/Sidebar';
import ReadingProgress from './components/Navigation/ReadingProgress';
import FontSizeControl from './components/Shared/FontSizeControl';
import SearchPanel from './components/Search/SearchPanel';
import NoteEditor from './components/Notes/NoteEditor';
import BackupPanel from './components/Navigation/BackupPanel';
import StudyMode from './components/Study/StudyMode';
import StudyThread from './components/Study/StudyThread';

import { useBibleData } from './hooks/useBibleData';
import { useBookmarks } from './hooks/useBookmarks';
import { useNotes } from './hooks/useNotes';
import { useStudies } from './hooks/useStudies';
import { useTheme } from './hooks/useTheme';
import { useBibleSearch, useEsvSearch } from './hooks/useBibleSearch';
import { useTranslation } from './hooks/useTranslation';
import {
    getSelectionQuote,
    getSelectionReference,
    getUniqueSelectionWords,
    makeWordSelection,
    sortSelectionItems,
    tokenizeStudyText,
} from './lib/studyMethod';
import {
    findPersonalStudyThreadObservation,
    getPersonalStudyThreads,
    hasPersonalStudyThread,
} from './lib/personalStudyThreads';
import { getAdjacentChapters, shouldConfirmChapterSwipe } from './lib/readerNavigation';
import { applyUserBackupTransaction } from './lib/userBackup';
import {
    normalizeReadingPosition,
    parseReadingPosition,
    READING_POSITION_STORAGE_KEY,
    sameReadingPosition,
    serializeReadingPosition,
} from './lib/readingPosition';

function getChapterWordSelections(book, chapter) {
    if (!book || !chapter) return [];

    return chapter.verses.flatMap(verse => (
        tokenizeStudyText(verse.text)
            .filter(token => !token.whitespace && token.normalized)
            .map(token => makeWordSelection({
                bookId: book.id,
                bookName: book.name,
                chapter: chapter.chapter,
                verse: verse.verse,
                token,
            }))
    ));
}

function resolveReadingPosition(bibles, candidate) {
    const position = normalizeReadingPosition(candidate);
    if (!position) return null;

    const savedBook = bibles.find(item => item.id === position.bookId);
    const savedChapter = savedBook?.chapters?.find(item => item.chapter === position.chapterNum);
    if (!savedBook || !savedChapter) return null;

    const verseNum = savedChapter.verses.some(verse => verse.verse === position.verseNum)
        ? position.verseNum
        : null;

    return {
        ...position,
        bookName: savedBook.name,
        verseNum,
    };
}

function makePersistableStudyObservation(observation) {
    if (observation?.translationId !== 'esv') return observation;

    return {
        ...observation,
        quote: `Verse ${observation.verse}`,
        selections: [],
        relatedSelections: [],
        contrast: null,
        sourceTextExcluded: true,
    };
}

export default function App() {
    const { book, bibles, selectedBookId, selectedChapterNum, navigateTo } = useBibleData();
    const {
        bookmarks,
        isBookmarked,
        toggleBookmark,
        getAllBookmarks,
        replaceBookmarks,
    } = useBookmarks();
    const {
        notes,
        getNote,
        hasNote,
        saveNote,
        deleteNote,
        getAllNotes,
        replaceNotes,
    } = useNotes();
    const {
        studies,
        getStudy,
        saveStudy,
        addObservation,
        removeObservation,
        updateObservation,
        deleteStudy,
        getAllStudies,
        replaceStudies,
    } = useStudies();
    const {
        mode,
        themePreference,
        toggleMode,
        fontSize,
        cycleFontSize,
        setReaderFontSize,
    } = useTheme();
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
    const [studyThreadTarget, setStudyThreadTarget] = useState(null);
    const [referenceTrail, setReferenceTrail] = useState([]);
    const [studyStage, setStudyStage] = useState('observe');
    const [studySelection, setStudySelection] = useState([]);
    const [studyWorkflow, setStudyWorkflow] = useState(null);
    const [backupOpen, setBackupOpen] = useState(false);
    const [referencePickerOpen, setReferencePickerOpen] = useState(false);
    const [chapterSwipePrompt, setChapterSwipePrompt] = useState(null);
    const [resumePosition, setResumePosition] = useState(null);
    const [resumeVerse, setResumeVerse] = useState(null);
    const [readingPositionReady, setReadingPositionReady] = useState(false);

    // Shared ref for the reader container - used by ChapterReader and BackToTop
    const readerRef = useRef(null);
    const lastScrollYRef = useRef(0);
    const tickingRef = useRef(false);
    const latestReadingPositionRef = useRef(null);

    // Sync dark-mode class on documentElement with theme state
    useEffect(() => {
        document.documentElement.classList.toggle('dark-mode', mode === 'dark');
        document.getElementById('theme-color')?.setAttribute(
            'content',
            mode === 'dark' ? '#15110D' : '#F5EEDB'
        );
    }, [mode]);

    // Apply the persisted reader font size to the document root.
    useEffect(() => {
        document.documentElement.style.setProperty('--reader-font-size', `${fontSize}px`);
    }, [fontSize]);

    useEffect(() => {
        if (studyTarget) {
            setHideControls(false);
            return;
        }

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
    }, [studyTarget]);

    useEffect(() => {
        if (!chapterSwipePrompt) return undefined;

        const timeout = window.setTimeout(() => setChapterSwipePrompt(null), 3600);
        return () => window.clearTimeout(timeout);
    }, [chapterSwipePrompt]);

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

    const savedThreads = useMemo(
        () => getPersonalStudyThreads(getAllStudies(), bibles),
        [bibles, getAllStudies],
    );

    const backupData = useMemo(() => ({
        bookmarks,
        notes,
        studies,
        position: resumePosition,
        preferences: {
            theme: themePreference,
            fontSize,
            translation: selectedTranslationId,
        },
    }), [
        bookmarks,
        fontSize,
        notes,
        resumePosition,
        selectedTranslationId,
        studies,
        themePreference,
    ]);

    const hasSavedThread = useCallback((bookId, chapterNum, verseNum) => (
        hasPersonalStudyThread(getStudy(bookId, chapterNum), verseNum)
    ), [getStudy]);

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
    const activeChapter = readerBook?.chapters?.find(c => c.chapter === selectedChapterNum);
    const chapterWordSelections = useMemo(
        () => getChapterWordSelections(readerBook, activeChapter),
        [readerBook, activeChapter]
    );

    // A deliberate URL always wins over local resume state so shared links remain reliable.
    useEffect(() => {
        const navigateFromLocation = (isInitialLoad) => {
            const match = window.location.hash.match(/^#\/?([\w-]+)\/(\d+)(?:\/v(\d+))?$/);
            setStudyThreadTarget(null);

            if (isInitialLoad) {
                let storedPosition = null;
                try {
                    storedPosition = parseReadingPosition(localStorage.getItem(READING_POSITION_STORAGE_KEY));
                } catch {}

                const savedPosition = resolveReadingPosition(bibles, storedPosition);
                latestReadingPositionRef.current = savedPosition;
                setResumePosition(savedPosition);
            }

            const linkedPosition = match
                ? resolveReadingPosition(bibles, {
                    bookId: match[1],
                    chapterNum: Number(match[2]),
                    verseNum: match[3] ? Number(match[3]) : null,
                })
                : null;

            if (linkedPosition) {
                navigateTo(linkedPosition.bookId, linkedPosition.chapterNum);
                setTargetVerse(linkedPosition.verseNum);
                setResumeVerse(null);
            } else if (isInitialLoad && latestReadingPositionRef.current) {
                const savedPosition = latestReadingPositionRef.current;
                navigateTo(savedPosition.bookId, savedPosition.chapterNum);
                setTargetVerse(null);
                setResumeVerse(savedPosition.verseNum);
            } else {
                navigateTo('genesis', 1);
                setTargetVerse(null);
                setResumeVerse(null);
            }

            setReadingPositionReady(true);
        };

        navigateFromLocation(true);
        const onLocationChange = () => navigateFromLocation(false);
        window.addEventListener('hashchange', onLocationChange);
        window.addEventListener('popstate', onLocationChange);
        return () => {
            window.removeEventListener('hashchange', onLocationChange);
            window.removeEventListener('popstate', onLocationChange);
        };
    }, [bibles, navigateTo]);

    const handleReadingPositionChange = useCallback((position) => {
        if (!readingPositionReady) return;

        const resolvedPosition = resolveReadingPosition(bibles, position);
        if (!resolvedPosition || sameReadingPosition(latestReadingPositionRef.current, resolvedPosition)) return;

        latestReadingPositionRef.current = resolvedPosition;
        setResumePosition(resolvedPosition);

        try {
            const serializedPosition = serializeReadingPosition(resolvedPosition);
            if (serializedPosition) {
                localStorage.setItem(READING_POSITION_STORAGE_KEY, serializedPosition);
            }
        } catch {}
    }, [bibles, readingPositionReady]);

    const handleNavigate = useCallback((bookId, chapterNum) => {
        setTargetVerse(null);
        setResumeVerse(null);
        navigateTo(bookId, chapterNum);
        setSidebarOpen(false);
        setStudyTarget(null);
        setStudyThreadTarget(null);
        setReferenceTrail([]);
        setStudySelection([]);
        setStudyWorkflow(null);
        setReferencePickerOpen(false);
        setChapterSwipePrompt(null);
        window.history.pushState(null, '', `#${bookId}/${chapterNum}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [navigateTo]);

    const handleNavigateToVerse = useCallback((bookId, chapterNum, verseNum, options = {}) => {
        setTargetVerse(verseNum);
        setResumeVerse(null);
        navigateTo(bookId, chapterNum);
        setSidebarOpen(false);
        setSearchOpen(false);
        setStudyTarget(null);
        setStudyThreadTarget(null);
        if (!options.preserveReferenceTrail) setReferenceTrail([]);
        setStudySelection([]);
        setStudyWorkflow(null);
        setReferencePickerOpen(false);
        setChapterSwipePrompt(null);
        window.history.pushState(null, '', `#${bookId}/${chapterNum}/v${verseNum}`);
    }, [navigateTo]);

    const handleResumeReading = useCallback(() => {
        if (!resumePosition) return;

        handleNavigate(resumePosition.bookId, resumePosition.chapterNum);
        setResumeVerse(resumePosition.verseNum);
    }, [handleNavigate, resumePosition]);

    const handleResumeComplete = useCallback(() => {
        setResumeVerse(null);
    }, []);

    const handleOpenBackup = useCallback(() => {
        setHideControls(false);
        setSidebarOpen(false);
        setBackupOpen(true);
    }, []);

    const handleRestoreBackup = useCallback((restoredData) => {
        const preferences = restoredData.preferences ?? {};
        const restoredPosition = resolveReadingPosition(bibles, restoredData.position);
        const savePosition = (position) => {
            try {
                const serializedPosition = serializeReadingPosition(position);
                if (serializedPosition) {
                    localStorage.setItem(READING_POSITION_STORAGE_KEY, serializedPosition);
                } else {
                    localStorage.removeItem(READING_POSITION_STORAGE_KEY);
                }
                return true;
            } catch {
                return false;
            }
        };
        const transaction = applyUserBackupTransaction({
            apply: [
                () => replaceBookmarks(restoredData.bookmarks),
                () => replaceNotes(restoredData.notes),
                () => replaceStudies(restoredData.studies),
                () => toggleMode(preferences.theme || themePreference),
                () => setReaderFontSize(preferences.fontSize || fontSize),
                () => selectTranslation(preferences.translation || selectedTranslationId),
                () => savePosition(restoredPosition ?? resumePosition),
            ],
            rollback: [
                () => replaceBookmarks(bookmarks),
                () => replaceNotes(notes),
                () => replaceStudies(studies),
                () => toggleMode(themePreference),
                () => setReaderFontSize(fontSize),
                () => selectTranslation(selectedTranslationId),
                () => savePosition(resumePosition),
            ],
        });
        if (!transaction.ok) {
            return {
                ok: false,
                message: transaction.rollbackComplete
                    ? 'Restoration stopped before any changes were kept on this device.'
                    : 'Restoration could not finish. Some changes may have been saved; make a backup before trying again.',
            };
        }

        if (restoredPosition) {
            latestReadingPositionRef.current = restoredPosition;
            setResumePosition(restoredPosition);
            handleNavigate(restoredPosition.bookId, restoredPosition.chapterNum);
            setResumeVerse(restoredPosition.verseNum);
        }

        return { ok: true };
    }, [
        bibles,
        bookmarks,
        fontSize,
        handleNavigate,
        notes,
        replaceBookmarks,
        replaceNotes,
        replaceStudies,
        resumePosition,
        selectTranslation,
        setReaderFontSize,
        selectedTranslationId,
        studies,
        themePreference,
        toggleMode,
    ]);

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
    const activeStudyThreadStudy = studyThreadTarget
        ? getStudy(studyThreadTarget.bookId, studyThreadTarget.chapter)
        : null;
    const activeStudyThreadObservation = findPersonalStudyThreadObservation(
        activeStudyThreadStudy,
        studyThreadTarget,
    );

    const handleOpenSearch = useCallback(() => {
        setHideControls(false);
        setSearchOpen(true);
    }, []);

    const handleCloseReferencePicker = useCallback(() => {
        setReferencePickerOpen(false);
    }, []);

    const handleOpenStudy = useCallback((thread) => {
        if (!thread?.bookId || !thread?.chapter) return;

        if (thread.kind === 'legacy') {
            navigateTo(thread.bookId, thread.chapter);
            setTargetVerse(null);
            setSidebarOpen(false);
            setReferenceTrail([]);
            setStudySelection([]);
            setStudyWorkflow(null);
            setStudyThreadTarget(null);
            setStudyTarget({
                bookId: thread.bookId,
                bookName: thread.bookName,
                chapter: thread.chapter,
            });
            window.history.pushState(null, '', `#${thread.bookId}/${thread.chapter}`);
            return;
        }

        if (!thread.verse || !thread.quote) return;

        navigateTo(thread.bookId, thread.chapter);
        setTargetVerse(thread.verse);
        setSidebarOpen(false);
        setStudyTarget(null);
        setReferenceTrail([]);
        setStudySelection([]);
        setStudyWorkflow(null);
        setStudyThreadTarget({
            id: thread.id,
            bookId: thread.bookId,
            bookName: thread.bookName,
            chapter: thread.chapter,
            verse: thread.verse,
            reference: thread.reference || `${thread.bookName} ${thread.chapter}:${thread.verse}`,
            translationId: thread.translationId ?? '',
            sourceTextExcluded: thread.sourceTextExcluded === true,
            quote: thread.quote,
            selections: thread.selections ?? [],
        });
        window.history.pushState(null, '', `#${thread.bookId}/${thread.chapter}/v${thread.verse}`);
    }, [navigateTo]);

    const handleOpenStudyThread = useCallback((target) => {
        if (!target?.bookId || !target?.chapter || !target?.verse || !target?.quote) return;

        setHideControls(false);
        setSidebarOpen(false);
        setNoteTarget(null);
        setStudyThreadTarget(target);
    }, []);

    const handleOpenReferencedPassage = useCallback((reference) => {
        const destinationBook = bibles.find(item => item.name === reference.bookName);
        if (!destinationBook) return;

        setReferenceTrail(previous => [...previous, {
            bookId: selectedBookId,
            chapterNum: selectedChapterNum,
            verseNum: targetVerse,
            label: targetVerse
                ? `${book?.name} ${selectedChapterNum}:${targetVerse}`
                : `${book?.name} ${selectedChapterNum}`,
        }]);
        handleNavigateToVerse(destinationBook.id, reference.chapter, reference.startVerse, {
            preserveReferenceTrail: true,
        });
    }, [bibles, book?.name, handleNavigateToVerse, selectedBookId, selectedChapterNum, targetVerse]);

    const handleReturnFromReference = useCallback(() => {
        if (!referenceTrail.length) return;

        setReferenceTrail(previous => previous.slice(0, -1));
        window.history.back();
    }, [referenceTrail.length]);

    useEffect(() => {
        const latest = referenceTrail[referenceTrail.length - 1];
        if (!latest) return;

        if (
            latest.bookId === selectedBookId
            && latest.chapterNum === selectedChapterNum
            && latest.verseNum === targetVerse
        ) {
            setReferenceTrail(previous => previous.slice(0, -1));
        }
    }, [referenceTrail, selectedBookId, selectedChapterNum, targetVerse]);

    const handleSaveStudyThreadThought = useCallback((thought) => {
        if (!studyThreadTarget || !thought.trim()) return;

        const existingObservation = findPersonalStudyThreadObservation(getStudy(
            studyThreadTarget.bookId,
            studyThreadTarget.chapter,
        ), studyThreadTarget);

        if (existingObservation) {
            return updateObservation(
                studyThreadTarget.bookId,
                studyThreadTarget.chapter,
                existingObservation.id,
                { note: thought },
            );
        }

        return addObservation(studyThreadTarget.bookId, studyThreadTarget.chapter, makePersistableStudyObservation({
            id: studyThreadTarget.id,
            type: 'note',
            scope: studyThreadTarget.selections?.length ? 'selection' : 'verse',
            verse: studyThreadTarget.verse,
            quote: studyThreadTarget.quote,
            reference: studyThreadTarget.reference,
            translationId: studyThreadTarget.translationId ?? '',
            sourceTextExcluded: studyThreadTarget.sourceTextExcluded === true,
            selections: studyThreadTarget.selections ?? [],
            note: thought,
        }));
    }, [addObservation, getStudy, studyThreadTarget, updateObservation]);

    const handleDeleteStudyThreadThought = useCallback(() => {
        if (!studyThreadTarget) return;

        const existingObservation = findPersonalStudyThreadObservation(getStudy(
            studyThreadTarget.bookId,
            studyThreadTarget.chapter,
        ), studyThreadTarget);

        if (existingObservation) {
            return removeObservation(
                studyThreadTarget.bookId,
                studyThreadTarget.chapter,
                existingObservation.id,
            );
        }
        return false;
    }, [getStudy, removeObservation, studyThreadTarget]);

    const handleToggleStudySelection = useCallback((item) => {
        if (!item?.id) return;

        setStudySelection(prev => {
            const alreadySelected = prev.some(selection => selection.id === item.id);
            if (alreadySelected) {
                return prev.filter(selection => selection.id !== item.id);
            }

            return sortSelectionItems([...prev, item]);
        });
    }, []);

    const handleAddStudySelections = useCallback((items) => {
        const cleanItems = (Array.isArray(items) ? items : [items]).filter(item => item?.id);
        if (!cleanItems.length) return;

        setStudySelection(prev => {
            const byId = new Map(prev.map(item => [item.id, item]));
            cleanItems.forEach(item => byId.set(item.id, item));
            return sortSelectionItems([...byId.values()]);
        });
    }, []);

    const handleClearStudySelection = useCallback(() => {
        setStudySelection([]);
    }, []);

    const handleStartContrast = useCallback((sideA) => {
        const cleanSideA = sortSelectionItems(sideA);
        if (!cleanSideA.length) return;

        setStudyWorkflow({
            type: 'contrast',
            sideA: cleanSideA,
        });
        setStudySelection([]);
    }, []);

    const handleStudyStageChange = useCallback((nextStage) => {
        setStudyStage(nextStage);

        if (nextStage !== 'observe') {
            setStudySelection([]);
            setStudyWorkflow(null);
        }
    }, []);

    const buildObservation = useCallback((observation) => {
        const selections = sortSelectionItems(observation.selections ?? studySelection);
        const quote = observation.quote ?? getSelectionQuote(selections);
        const reference = getSelectionReference(selections);
        const verse = selections[0]?.verse ?? selectedChapterNum;
        const uniqueWords = getUniqueSelectionWords(selections);

        if (!quote) return null;

        if (observation.type === 'repeated-word' && uniqueWords.length === 1) {
            const [selectedWord] = uniqueWords;
            const relatedSelections = chapterWordSelections.filter(item => item.normalized === selectedWord.normalized);

            return {
                ...observation,
                verse,
                quote: selectedWord.text,
                translationId: selectedTranslationId,
                reference,
                scope: 'word-group',
                selections,
                relatedSelections,
                note: relatedSelections.length > 1
                    ? `Found ${relatedSelections.length} uses in this chapter.`
                    : 'Only one use found in this chapter.',
            };
        }

        if (observation.type === 'contrast' && observation.contrast) {
            const sideA = sortSelectionItems(observation.contrast.sideA);
            const sideB = sortSelectionItems(observation.contrast.sideB);
            const sideAQuote = getSelectionQuote(sideA);
            const sideBQuote = getSelectionQuote(sideB);

            if (!sideAQuote || !sideBQuote) return null;

            return {
                ...observation,
                verse: sideA[0]?.verse ?? sideB[0]?.verse ?? verse,
                quote: `${sideAQuote} / ${sideBQuote}`,
                translationId: selectedTranslationId,
                reference: getSelectionReference([...sideA, ...sideB]),
                scope: 'contrast',
                selections: [...sideA, ...sideB],
                contrast: { sideA, sideB },
            };
        }

        return {
            ...observation,
            verse,
            quote,
            translationId: selectedTranslationId,
            scope: selections.length > 1 ? 'selection' : selections[0]?.scope ?? 'word',
            reference,
            selections,
        };
    }, [chapterWordSelections, selectedChapterNum, selectedTranslationId, studySelection]);

    const handleAddStudyObservation = useCallback((observation) => {
        if (!studyTarget) return;

        const cleanObservation = buildObservation(observation);
        if (!cleanObservation) return;

        addObservation(
            studyTarget.bookId,
            studyTarget.chapter,
            makePersistableStudyObservation(cleanObservation),
        );
        setStudySelection([]);
        setStudyWorkflow(null);
    }, [addObservation, buildObservation, studyTarget]);

    const handleRemoveStudyObservation = useCallback((observationId) => {
        if (!studyTarget) return;
        removeObservation(studyTarget.bookId, studyTarget.chapter, observationId);
    }, [removeObservation, studyTarget]);

    const handleUpdateStudyObservation = useCallback((observationId, fields) => {
        if (!studyTarget) return;
        updateObservation(studyTarget.bookId, studyTarget.chapter, observationId, fields);
    }, [studyTarget, updateObservation]);

    const handleSaveStudyFields = useCallback((fields) => {
        if (!studyTarget) return;
        saveStudy(studyTarget.bookId, studyTarget.chapter, fields);
    }, [saveStudy, studyTarget]);

    const handleDeleteActiveStudy = useCallback(() => {
        if (!studyTarget) return;

        deleteStudy(studyTarget.bookId, studyTarget.chapter);
        setStudySelection([]);
        setStudyWorkflow(null);
    }, [deleteStudy, studyTarget]);

    const handleCloseStudy = useCallback(() => {
        setStudyTarget(null);
        setStudySelection([]);
        setStudyWorkflow(null);
        setHideControls(false);
    }, []);

    const chapterNav = useMemo(() => {
        const adjacent = getAdjacentChapters(bibles, selectedBookId, selectedChapterNum);
        return {
            prevChapter: adjacent.previous,
            nextChapter: adjacent.next,
        };
    }, [bibles, selectedBookId, selectedChapterNum]);

    const handleChapterSwipeIntent = useCallback((direction) => {
        const chapter = direction === 'next' ? chapterNav.nextChapter : chapterNav.prevChapter;
        if (!chapter) return;

        setHideControls(false);
        if (shouldConfirmChapterSwipe(chapterSwipePrompt?.direction, direction)) {
            handleNavigate(chapter.bookId, chapter.chapterNum);
            return;
        }

        setChapterSwipePrompt({ direction, chapter });
    }, [chapterNav, chapterSwipePrompt?.direction, handleNavigate]);

    const handleReferencePickerNavigate = useCallback(({ bookId, chapterNum, verseNum }) => {
        if (verseNum) handleNavigateToVerse(bookId, chapterNum, verseNum);
        else handleNavigate(bookId, chapterNum);
    }, [handleNavigate, handleNavigateToVerse]);

    const readerContent = book ? (
        <>
            <ChapterReader
                book={readerBook}
                chapterNum={selectedChapterNum}
                readerRef={readerRef}
                targetVerse={targetVerse}
                resumeVerse={resumeVerse}
                isBookmarked={isBookmarked}
                onToggleBookmark={toggleBookmark}
                hasNote={hasNote}
                onOpenNote={handleOpenNote}
                onOpenStudyThread={handleOpenStudyThread}
                hasSavedThread={hasSavedThread}
                translation={selectedTranslation}
                translationState={translationState}
                studyMode={!!studyTarget}
                studyCanSelect={!!studyTarget && studyStage === 'observe'}
                studySelection={studySelection}
                studyWorkflow={studyWorkflow}
                studyObservations={activeStudy?.observations ?? []}
                onToggleStudySelection={handleToggleStudySelection}
                onAddStudySelections={handleAddStudySelections}
                onAddStudyObservation={handleAddStudyObservation}
                onClearStudySelection={handleClearStudySelection}
                onStartStudyContrast={handleStartContrast}
                onCancelStudyWorkflow={() => setStudyWorkflow(null)}
                onChapterSwipeIntent={handleChapterSwipeIntent}
                onResumeComplete={handleResumeComplete}
                onReadingPositionChange={handleReadingPositionChange}
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
                    resumeReading={resumePosition}
                    activeTranslationId={selectedTranslationId}
                    translationStatus={translationStatus}
                    themePreference={themePreference}
                    onSelectTheme={toggleMode}
                    bookmarks={bookmarkedVerses}
                    notes={notedVerses}
                    studies={savedThreads}
                    onSelectTranslation={selectTranslation}
                    onNavigate={handleNavigate}
                    onNavigateToVerse={handleNavigateToVerse}
                    onOpenStudy={handleOpenStudy}
                    onResumeReading={handleResumeReading}
                    onOpenBackup={handleOpenBackup}
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

            <ReferencePicker
                open={referencePickerOpen}
                bibles={bibles}
                currentBookId={selectedBookId}
                currentChapterNum={selectedChapterNum}
                currentVerse={targetVerse}
                onNavigate={handleReferencePickerNavigate}
                onClose={handleCloseReferencePicker}
            />

            <NoteEditor
                open={!!noteTarget}
                noteTarget={noteTarget}
                note={activeNote}
                onSave={(text) => noteTarget && saveNote(noteTarget.bookId, noteTarget.chapter, noteTarget.verse, text)}
                onDelete={() => noteTarget && deleteNote(noteTarget.bookId, noteTarget.chapter, noteTarget.verse)}
                onClose={() => setNoteTarget(null)}
            />

            <BackupPanel
                open={backupOpen}
                data={backupData}
                onRestore={handleRestoreBackup}
                onClose={() => setBackupOpen(false)}
            />

            {studyThreadTarget && (
                <StudyThread
                    target={studyThreadTarget}
                    observation={activeStudyThreadObservation}
                    book={readerBook}
                    chapter={activeChapter}
                    bibles={bibles}
                    translation={selectedTranslation}
                    onSaveThought={handleSaveStudyThreadThought}
                    onDeleteThought={handleDeleteStudyThreadThought}
                    onOpenPassage={handleOpenReferencedPassage}
                    onClose={() => setStudyThreadTarget(null)}
                />
            )}

            {/* Header */}
            <header className={`app-header ${hideControls ? 'hidden' : ''}`}>
                <button onClick={() => setSidebarOpen(true)} aria-label="Menu">☰</button>
                {referenceTrail.length > 0 && (
                    <button
                        type="button"
                        className="app-reference-back"
                        onClick={handleReturnFromReference}
                    >
                        Return to {referenceTrail[referenceTrail.length - 1].label}
                    </button>
                )}
                {referenceTrail.length === 0 && (
                    <button
                        type="button"
                        className="app-reference-picker-trigger"
                        onClick={() => {
                            setHideControls(false);
                            setChapterSwipePrompt(null);
                            setReferencePickerOpen(true);
                        }}
                        aria-label={`Open passage picker, currently ${book?.name} chapter ${selectedChapterNum}${targetVerse ? ` verse ${targetVerse}` : ''}`}
                    >
                        {book?.name} &middot; Chapter {selectedChapterNum}{targetVerse ? `:${targetVerse}` : ''}
                    </button>
                )}
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
                                    bibles={bibles}
                                    chapter={activeChapter}
                                    reference={`${studyTarget.bookName} ${studyTarget.chapter}`}
                                    study={activeStudy}
                                    stage={studyStage}
                                    selection={studySelection}
                                    workflow={studyWorkflow}
                                    onStageChange={handleStudyStageChange}
                                    onAddObservation={handleAddStudyObservation}
                                    onClearSelection={handleClearStudySelection}
                                    onStartContrast={handleStartContrast}
                                    onCancelWorkflow={() => setStudyWorkflow(null)}
                                    onRemoveObservation={handleRemoveStudyObservation}
                                    onUpdateObservation={handleUpdateStudyObservation}
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

            {chapterSwipePrompt && !studyTarget && (
                <ChapterSwipePrompt
                    direction={chapterSwipePrompt.direction}
                    chapter={chapterSwipePrompt.chapter}
                    onConfirm={() => handleNavigate(
                        chapterSwipePrompt.chapter.bookId,
                        chapterSwipePrompt.chapter.chapterNum,
                    )}
                />
            )}

            {/* Bottom Controls */}
            <div className={`controls-bar ${hideControls ? 'hidden' : ''}`}>
                <button
                    className="control-button search-control-button"
                    onClick={handleOpenSearch}
                    title="Search"
                    aria-label="Search scripture"
                >⌕</button>
                <FontSizeControl fontSize={fontSize} onCycle={cycleFontSize} />
            </div>
        </div>
    );
}
