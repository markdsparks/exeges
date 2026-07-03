import { useEffect, useRef } from 'react';
import '../../styles/search.css';

function snippetParts(snippet, query) {
    if (!query) return [{ text: snippet, match: false }];

    const lowerSnippet = snippet.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const parts = [];
    let cursor = 0;
    let index = lowerSnippet.indexOf(lowerQuery);

    while (index !== -1) {
        if (index > cursor) {
            parts.push({ text: snippet.slice(cursor, index), match: false });
        }

        parts.push({ text: snippet.slice(index, index + query.length), match: true });
        cursor = index + query.length;
        index = lowerSnippet.indexOf(lowerQuery, cursor);
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
    normalizedQuery,
    translationName = 'KJV',
    onQueryChange,
    onClose,
    onSelectResult
}) {
    const inputRef = useRef(null);
    const hasQuery = query.trim().length > 0;
    const canSearch = query.trim().length >= 2;

    useEffect(() => {
        if (!open) return;
        inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

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

                <input
                    ref={inputRef}
                    id="scripture-search"
                    className="search-input"
                    type="search"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Find a word or phrase"
                    autoComplete="off"
                />
                {hasQuery && (
                    <button className="search-clear" onClick={() => onQueryChange('')} aria-label="Clear search">
                        Clear
                    </button>
                )}

                <div className="search-results" aria-live="polite">
                    {!hasQuery ? (
                        <p className="search-empty">Search the {translationName} text stored on this device.</p>
                    ) : !canSearch ? (
                        <p className="search-empty">Enter at least two characters.</p>
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
                                        {snippetParts(result.snippet, normalizedQuery).map((part, index) => (
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
