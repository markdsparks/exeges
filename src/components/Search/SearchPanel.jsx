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
    const hasQuery = query.trim().length > 0;
    const canSearch = query.trim().length >= 2;
    const searchLocation = searchSource === 'remote'
        ? 'through the ESV proxy'
        : 'stored on this device';

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
