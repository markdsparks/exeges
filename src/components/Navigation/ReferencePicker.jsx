import { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/navigation.css';

function firstChapterNumber(book) {
    return book?.chapters?.[0]?.chapter ?? 1;
}

export default function ReferencePicker({
    open,
    bibles,
    currentBookId,
    currentChapterNum,
    currentVerse,
    onNavigate,
    onClose,
}) {
    const [bookId, setBookId] = useState(currentBookId);
    const [chapterNum, setChapterNum] = useState(currentChapterNum);
    const [verseNum, setVerseNum] = useState(currentVerse ?? '');
    const dialogRef = useRef(null);
    const returnFocusRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        setBookId(currentBookId);
        setChapterNum(currentChapterNum);
        setVerseNum(currentVerse ?? '');
    }, [currentBookId, currentChapterNum, currentVerse, open]);

    useEffect(() => {
        if (!open) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose?.();
                return;
            }

            if (event.key !== 'Tab') return;

            const focusable = [...dialogRef.current?.querySelectorAll(
                'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]'
            ) ?? []];
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        const app = document.querySelector('.app');
        const background = [...app?.children ?? []].filter(element => (
            !element.classList.contains('reference-picker-overlay')
        ));
        const hiddenStates = background.map(element => ({
            element,
            ariaHidden: element.getAttribute('aria-hidden'),
            inert: element.hasAttribute('inert'),
        }));

        returnFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        background.forEach(element => {
            element.setAttribute('inert', '');
            element.setAttribute('aria-hidden', 'true');
        });
        window.addEventListener('keydown', handleKeyDown);
        const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));

        return () => {
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener('keydown', handleKeyDown);
            hiddenStates.forEach(({ element, ariaHidden, inert }) => {
                if (inert) element.setAttribute('inert', '');
                else element.removeAttribute('inert');
                if (ariaHidden === null) element.removeAttribute('aria-hidden');
                else element.setAttribute('aria-hidden', ariaHidden);
            });
            returnFocusRef.current?.focus({ preventScroll: true });
        };
    }, [onClose, open]);

    const selectedBook = useMemo(
        () => bibles?.find(book => book.id === bookId) ?? bibles?.[0],
        [bibles, bookId],
    );
    const selectedChapter = useMemo(
        () => selectedBook?.chapters?.find(chapter => chapter.chapter === chapterNum) ?? selectedBook?.chapters?.[0],
        [chapterNum, selectedBook],
    );
    const selectedReference = `${selectedBook?.name ?? ''} ${selectedChapter?.chapter ?? ''}${verseNum ? `:${verseNum}` : ''}`.trim();

    if (!open || !bibles?.length || !selectedBook || !selectedChapter) return null;

    const handleBookChange = (event) => {
        const nextBook = bibles.find(book => book.id === event.target.value);
        setBookId(event.target.value);
        setChapterNum(firstChapterNumber(nextBook));
        setVerseNum('');
    };

    const handleChapterChange = (event) => {
        setChapterNum(Number(event.target.value));
        setVerseNum('');
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onNavigate?.({
            bookId: selectedBook.id,
            chapterNum: selectedChapter.chapter,
            verseNum: verseNum ? Number(verseNum) : null,
        });
    };

    return (
        <div className="reference-picker-overlay" onClick={onClose}>
            <section
                className="reference-picker"
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="reference-picker-title"
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="reference-picker-header">
                    <div>
                        <p className="reference-picker-kicker">Scripture</p>
                        <h2 id="reference-picker-title">Open passage</h2>
                    </div>
                    <button className="reference-picker-close" onClick={onClose} aria-label="Close passage picker">
                        &times;
                    </button>
                </header>

                <form className="reference-picker-form" onSubmit={handleSubmit}>
                    <label className="reference-picker-field" htmlFor="reference-picker-book">
                        <span>Book</span>
                        <select id="reference-picker-book" value={selectedBook.id} onChange={handleBookChange}>
                            {bibles.map(book => (
                                <option key={book.id} value={book.id}>{book.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="reference-picker-field" htmlFor="reference-picker-chapter">
                        <span>Chapter</span>
                        <select id="reference-picker-chapter" value={selectedChapter.chapter} onChange={handleChapterChange}>
                            {selectedBook.chapters.map(chapter => (
                                <option key={chapter.chapter} value={chapter.chapter}>{chapter.chapter}</option>
                            ))}
                        </select>
                    </label>

                    <label className="reference-picker-field" htmlFor="reference-picker-verse">
                        <span>Verse</span>
                        <select id="reference-picker-verse" value={verseNum} onChange={(event) => setVerseNum(event.target.value)}>
                            <option value="">Beginning</option>
                            {selectedChapter.verses.map(verse => (
                                <option key={verse.verse} value={verse.verse}>{verse.verse}</option>
                            ))}
                        </select>
                    </label>

                    <footer className="reference-picker-actions">
                        <button type="button" className="reference-picker-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="reference-picker-open">Open {selectedReference}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
