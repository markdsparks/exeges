import { useEffect, useRef } from 'react';
import '../../styles/search.css';

function snippetParts(snippet, terms) {
    const highlightTerms = (terms ?? [])
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

    if (!highlightTerms.length) return [{ text: snippet, match: false }];

    const escapedTerms = highlightTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const matcher = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
    const lowerSnippet = snippet.toLowerCase();
    const parts = [];
    let cursor = 0;
    let match = matcher.exec(lowerSnippet);

    while (match) {
        const index = match.index;
        const matchText = snippet.slice(index, index + match[0].length);

        if (index > cursor) {
            parts.push({ text: snippet.slice(cursor, index), match: false });
        }

        parts.push({ text: matchText, match: true });
        cursor = index + match[0].length;
        match = matcher.exec(lowerSnippet);
    }

    if (cursor < snippet.length) {
        parts.push({ text: snippet.slice(cursor), match: false });
    }

    return parts;
}

export default function SearchPanel({
    open,
    query,
    results,
    totalResults,
    isLimited,
    highlightTerms = [],
    translationName = 'KJV',
    searchSource = 'local',
    isLoading = false,
    error = '',
    onQueryChange,
    onClose,
    onSelectResult
}) {
    const inputRef = useRef(null);
    const scrollLockYRef = useRef(0);
    const hasQuery = query.trim().length > 0;
    const canSearch = query.trim().length >= 2;
    const searchLocation = searchSource === 'remote'
        ? 'through the ESV proxy'
        : 'stored on this device';

    useEffect(() => {
        if (!open) return;

        const focusInput = window.requestAnimationFrame(() => {
            inputRef.current?.focus({ preventScroll: true });
        });

        return () => window.cancelAnimationFrame(focusInput);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

    useEffect(() => {
        if (!open) return;

        const updateViewportHeight = () => {
            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            const viewportTop = window.visualViewport?.offsetTop ?? 0;
            document.documentElement.style.setProperty('--search-viewport-height', `${viewportHeight}px`);
            document.documentElement.style.setProperty('--search-viewport-top', `${viewportTop}px`);
        };

        const handleTouchMove = (event) => {
            if (event.target instanceof Element && event.target.closest('.search-results')) return;
            event.preventDefault();
        };

        scrollLockYRef.current = window.scrollY;
        document.documentElement.classList.add('search-open');
        document.body.classList.add('search-open');
        document.body.style.top = `-${scrollLockYRef.current}px`;
        updateViewportHeight();

        window.visualViewport?.addEventListener('resize', updateViewportHeight);
        window.visualViewport?.addEventListener('scroll', updateViewportHeight);
        window.addEventListener('resize', updateViewportHeight);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            const lockedScrollY = scrollLockYRef.current;
            document.documentElement.classList.remove('search-open');
            document.body.classList.remove('search-open');
            document.body.style.top = '';
            document.documentElement.style.removeProperty('--search-viewport-height');
            document.documentElement.style.removeProperty('--search-viewport-top');
            window.visualViewport?.removeEventListener('resize', updateViewportHeight);
            window.visualViewport?.removeEventListener('scroll', updateViewportHeight);
            window.removeEventListener('resize', updateViewportHeight);
            document.removeEventListener('touchmove', handleTouchMove);
            window.scrollTo(0, lockedScrollY);
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search scripture">
            <div className="search-panel">
                <div className="search-header">
                    <label className="search-label" htmlFor="scripture-search">Search</label>
                    <button className="search-close" onClick={onClose} aria-label="Close search">
                        &times;
                    </button>
                </div>

                <div className="search-controls">
                    <div className="search-field-row">
                        <input
                            ref={inputRef}
                            id="scripture-search"
                            className="search-input"
                            type="search"
                            value={query}
                            onChange={(event) => onQueryChange(event.target.value)}
                            placeholder="Find a word or phrase"
                            autoComplete="off"
                            enterKeyHint="search"
                        />
                        {hasQuery && (
                            <button className="search-clear" onClick={() => onQueryChange('')} aria-label="Clear search">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="search-results" aria-live="polite">
                    {!hasQuery ? (
                        <p className="search-empty">Search the {translationName} text {searchLocation}.</p>
                    ) : !canSearch ? (
                        <p className="search-empty">Enter at least two characters.</p>
                    ) : isLoading ? (
                        <p className="search-empty">Searching {translationName}...</p>
                    ) : error ? (
                        <p className="search-empty">{error}</p>
                    ) : results.length > 0 ? (
                        <>
                            <p className="search-count">
                                {isLimited ? `Showing first ${results.length} of ${totalResults}` : `${totalResults}`} result{totalResults === 1 ? '' : 's'}
                            </p>
                            {results.map(result => (
                                <button
                                    key={`${result.bookId}-${result.chapter}-${result.verse}`}
                                    className="search-result"
                                    onClick={() => onSelectResult(result)}
                                >
                                    <span className="search-reference">
                                        {result.bookName} {result.chapter}:{result.verse}
                                    </span>
                                    <span className="search-snippet">
                                        {snippetParts(result.snippet, highlightTerms).map((part, index) => (
                                            part.match ? (
                                                <mark key={index} className="search-highlight">{part.text}</mark>
                                            ) : (
                                                <span key={index}>{part.text}</span>
                                            )
                                        ))}
                                    </span>
                                </button>
                            ))}
                        </>
                    ) : (
                        <p className="search-empty">No matches found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
