import { useMemo } from 'react';

const MAX_RESULTS = 60;

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
