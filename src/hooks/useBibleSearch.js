import { useEffect, useMemo, useState } from 'react';
import { getEsvProxyUrl } from '../lib/translations';

const MAX_RESULTS = 60;
const ESV_SEARCH_DELAY = 250;
const SNIPPET_BEFORE = 58;
const SNIPPET_AFTER = 108;

function normalize(value) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeForSearch(value) {
    return normalize(value).replace(/[^a-z0-9\s]+/g, ' ');
}

function getQueryParts(query) {
    const phrase = normalizeForSearch(query).replace(/\s+/g, ' ').trim();
    const terms = [...new Set(phrase.split(' ').filter(term => term.length >= 2))];

    return { phrase, terms };
}

function countOccurrences(text, term) {
    if (!term) return 0;

    let count = 0;
    let index = text.indexOf(term);
    while (index !== -1) {
        count += 1;
        index = text.indexOf(term, index + term.length);
    }

    return count;
}

function scoreResult(result, queryParts, context) {
    const phraseIndex = result.searchableText.indexOf(queryParts.phrase);
    const termHits = queryParts.terms.reduce(
        (total, term) => total + countOccurrences(result.searchableText, term),
        0
    );
    const allTermsMatch = queryParts.terms.every(term => result.searchableText.includes(term));
    let score = 0;

    if (phraseIndex !== -1) score += 140;
    if (allTermsMatch) score += 50;
    score += termHits * 12;

    if (context?.bookId && result.bookId === context.bookId) score += 24;
    if (
        context?.bookId &&
        context?.chapterNum &&
        result.bookId === context.bookId &&
        result.chapter === context.chapterNum
    ) {
        score += 36;
    }

    return score;
}

function createSnippet(text, queryParts) {
    const normalizedText = normalizeForSearch(text);
    const phraseIndex = queryParts.phrase ? normalizedText.indexOf(queryParts.phrase) : -1;
    const termIndexes = queryParts.terms
        .map(term => normalizedText.indexOf(term))
        .filter(index => index !== -1);
    const index = phraseIndex !== -1
        ? phraseIndex
        : Math.min(...termIndexes);

    if (index === -1) return text.length > 150 ? `${text.slice(0, 150)}...` : text;

    const start = Math.max(0, index - SNIPPET_BEFORE);
    const end = Math.min(text.length, index + queryParts.phrase.length + SNIPPET_AFTER);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';

    return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function useBibleSearch(bibles, query, context = {}) {
    const searchIndex = useMemo(() => {
        if (!bibles) return [];

        return bibles.flatMap((book, bookIndex) =>
            book.chapters.flatMap(chapter =>
                chapter.verses.map(verse => ({
                    bookId: book.id,
                    bookName: book.name,
                    bookIndex,
                    chapter: chapter.chapter,
                    verse: verse.verse,
                    text: verse.text,
                    searchableText: normalizeForSearch(verse.text),
                }))
            )
        );
    }, [bibles]);

    return useMemo(() => {
        const queryParts = getQueryParts(query);
        if (queryParts.phrase.length < 2) {
            return {
                results: [],
                totalResults: 0,
                isLimited: false,
                normalizedQuery: queryParts.phrase,
                highlightTerms: [],
            };
        }

        const matches = searchIndex
            .map(result => ({
                ...result,
                score: scoreResult(result, queryParts, context),
            }))
            .filter(result => result.score > 0)
            .sort((a, b) => (
                b.score - a.score ||
                a.bookIndex - b.bookIndex ||
                a.chapter - b.chapter ||
                a.verse - b.verse
            ));

        return {
            results: matches
            .slice(0, MAX_RESULTS)
            .map(result => ({
                ...result,
                snippet: createSnippet(result.text, queryParts),
            })),
            totalResults: matches.length,
            isLimited: matches.length > MAX_RESULTS,
            normalizedQuery: queryParts.phrase,
            highlightTerms: queryParts.terms,
        };
    }, [context, query, searchIndex]);
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

export function useEsvSearch(bibles, query, context = {}) {
    const [state, setState] = useState({
        results: [],
        totalResults: 0,
        isLimited: false,
        normalizedQuery: '',
        isLoading: false,
        error: '',
        highlightTerms: [],
    });

    const bookLookup = useMemo(() => createBookLookup(bibles), [bibles]);

    useEffect(() => {
        const queryParts = getQueryParts(query);
        const proxyUrl = getEsvProxyUrl().replace(/\/$/, '');

        if (queryParts.phrase.length < 2) {
            setState({
                results: [],
                totalResults: 0,
                isLimited: false,
                normalizedQuery: queryParts.phrase,
                isLoading: false,
                error: '',
                highlightTerms: [],
            });
            return undefined;
        }

        if (!proxyUrl) {
            setState({
                results: [],
                totalResults: 0,
                isLimited: false,
                normalizedQuery: queryParts.phrase,
                isLoading: false,
                error: 'ESV search needs the private proxy configuration.',
                highlightTerms: queryParts.terms,
            });
            return undefined;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            setState(prev => ({
                ...prev,
                normalizedQuery: queryParts.phrase,
                isLoading: true,
                error: '',
                highlightTerms: queryParts.terms,
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
                                bookIndex: bibles.findIndex(item => item.id === book.id),
                                chapter: result.chapter,
                                verse: result.verse,
                                text: result.text,
                                searchableText: normalizeForSearch(result.text),
                                translation: 'esv',
                            };
                        })
                        .filter(Boolean)
                        .map(result => ({
                            ...result,
                            score: scoreResult(result, queryParts, context),
                        }))
                        .sort((a, b) => (
                            b.score - a.score ||
                            a.bookIndex - b.bookIndex ||
                            a.chapter - b.chapter ||
                            a.verse - b.verse
                        ))
                        .map(result => ({
                            ...result,
                            snippet: createSnippet(result.text, queryParts),
                        }));

                    setState({
                        results,
                        totalResults: payload.totalResults ?? results.length,
                        isLimited: (payload.totalResults ?? results.length) > results.length,
                        normalizedQuery: queryParts.phrase,
                        isLoading: false,
                        error: '',
                        highlightTerms: queryParts.terms,
                    });
                })
                .catch(error => {
                    if (controller.signal.aborted) return;

                    setState({
                        results: [],
                        totalResults: 0,
                        isLimited: false,
                        normalizedQuery: queryParts.phrase,
                        isLoading: false,
                        error: error.message || 'ESV search could not be loaded right now.',
                        highlightTerms: queryParts.terms,
                    });
                });
        }, ESV_SEARCH_DELAY);

        return () => {
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [bibles, bookLookup, context, query]);

    return state;
}
