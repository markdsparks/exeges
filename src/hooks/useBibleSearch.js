import { useEffect, useMemo, useState } from 'react';
import { getEsvProxyUrl } from '../lib/translations';

const MAX_RESULTS = 60;
const ESV_SEARCH_DELAY = 250;

function normalize(value) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function createSnippet(text, query) {
    const normalizedText = normalize(text);
    const index = normalizedText.indexOf(query);

    if (index === -1) return text.length > 150 ? `${text.slice(0, 150)}...` : text;

    const start = Math.max(0, index - 54);
    const end = Math.min(text.length, index + query.length + 92);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';

    return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function useBibleSearch(bibles, query) {
    const searchIndex = useMemo(() => {
        if (!bibles) return [];

        return bibles.flatMap(book =>
            book.chapters.flatMap(chapter =>
                chapter.verses.map(verse => ({
                    bookId: book.id,
                    bookName: book.name,
                    chapter: chapter.chapter,
                    verse: verse.verse,
                    text: verse.text,
                    searchableText: normalize(verse.text),
                }))
            )
        );
    }, [bibles]);

    return useMemo(() => {
        const normalizedQuery = normalize(query);
        if (normalizedQuery.length < 2) {
            return {
                results: [],
                totalResults: 0,
                isLimited: false,
                normalizedQuery,
            };
        }

        const matches = searchIndex
            .filter(result => result.searchableText.includes(normalizedQuery));

        return {
            results: matches
            .slice(0, MAX_RESULTS)
            .map(result => ({
                ...result,
                snippet: createSnippet(result.text, normalizedQuery),
            })),
            totalResults: matches.length,
            isLimited: matches.length > MAX_RESULTS,
            normalizedQuery,
        };
    }, [query, searchIndex]);
}

function normalizeBookName(value) {
    return value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function createBookLookup(bibles) {
    const lookup = new Map();
    for (const book of bibles ?? []) {
        lookup.set(normalizeBookName(book.name), book);
    }

    lookup.set('song of solomon', bibles?.find(book => book.name === "Solomon's Song"));
    lookup.set('song of songs', bibles?.find(book => book.name === "Solomon's Song"));
    lookup.set('psalm', bibles?.find(book => book.name === 'Psalms'));

    return lookup;
}

export function useEsvSearch(bibles, query) {
    const [state, setState] = useState({
        results: [],
        totalResults: 0,
        isLimited: false,
        normalizedQuery: '',
        isLoading: false,
        error: '',
    });

    const bookLookup = useMemo(() => createBookLookup(bibles), [bibles]);

    useEffect(() => {
        const normalizedQuery = normalize(query);
        const proxyUrl = getEsvProxyUrl().replace(/\/$/, '');

        if (normalizedQuery.length < 2) {
            setState({
                results: [],
                totalResults: 0,
                isLimited: false,
                normalizedQuery,
                isLoading: false,
                error: '',
            });
            return undefined;
        }

        if (!proxyUrl) {
            setState({
                results: [],
                totalResults: 0,
                isLimited: false,
                normalizedQuery,
                isLoading: false,
                error: 'ESV search needs the private proxy configuration.',
            });
            return undefined;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            setState(prev => ({
                ...prev,
                normalizedQuery,
                isLoading: true,
                error: '',
            }));

            fetch(`${proxyUrl}?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`ESV search failed with ${response.status}`);
                    }
                    return response.json();
                })
                .then(payload => {
                    if (controller.signal.aborted) return;

                    const results = (payload.results ?? [])
                        .map(result => {
                            const book = bookLookup.get(normalizeBookName(result.bookName));
                            if (!book || !result.chapter || !result.verse) return null;

                            return {
                                bookId: book.id,
                                bookName: book.name,
                                chapter: result.chapter,
                                verse: result.verse,
                                text: result.text,
                                snippet: result.snippet || result.text,
                                translation: 'esv',
                            };
                        })
                        .filter(Boolean);

                    setState({
                        results,
                        totalResults: payload.totalResults ?? results.length,
                        isLimited: (payload.totalResults ?? results.length) > results.length,
                        normalizedQuery,
                        isLoading: false,
                        error: '',
                    });
                })
                .catch(error => {
                    if (controller.signal.aborted) return;

                    setState({
                        results: [],
                        totalResults: 0,
                        isLimited: false,
                        normalizedQuery,
                        isLoading: false,
                        error: error.message || 'ESV search could not be loaded right now.',
                    });
                });
        }, ESV_SEARCH_DELAY);

        return () => {
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [bibles, bookLookup, query]);

    return state;
}
