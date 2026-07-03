import { useState, useCallback } from 'react';

const STORAGE_KEY = 'exeges-bookmarks';

function parseBookmarkKey(key) {
    const parts = key.split('-');
    if (parts.length < 3) return null;

    const verse = parseInt(parts.pop(), 10);
    const chapter = parseInt(parts.pop(), 10);
    const bookId = parts.join('-');

    if (!bookId || Number.isNaN(chapter) || Number.isNaN(verse)) return null;
    return { bookId, chapter, verse };
}

/**
 * Hook: useBookmarks
 *
 * Manages bookmarks across books/chapters/verses.
 * Persists to localStorage for family-use persistence.
 */
export function useBookmarks() {
    const [bookmarks, setBookmarks] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
          } catch {
            return {};
           }
         });

     // Bookmarked keys format: "bookId-chapter-verse" → true or timestamp
    const isBookmarked = useCallback(
        (bookId, chapter, verse) => {
            const key = `${bookId}-${chapter}-${verse}`;
            return !!bookmarks[key];
          },
        [bookmarks]
     );

    const toggleBookmark = useCallback((bookId, chapter, verse) => {
        const key = `${bookId}-${chapter}-${verse}`;

        setBookmarks(prev => {
            const next = { ...prev };
            if (next[key]) {
                delete next[key];
              } else {
                next[key] = Date.now(); // timestamp the bookmark
             }

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              } catch {}

            return next;
          }
     );
    }, []);

    const getBookmarksForChapter = useCallback(
        (bookId, chapter) => {
            const prefix = `${bookId}-${chapter}-`;
            return Object.entries(bookmarks)
                .filter(([key]) => key.startsWith(prefix))
                .map(([key]) => {
                    const parsed = parseBookmarkKey(key);
                    return parsed ? { bookId, chapter, verse: parsed.verse } : null;
                  })
                .filter(Boolean)
                .sort((a, b) => a.verse - b.verse);
          },
        [bookmarks]
     );

    const getAllBookmarks = useCallback(() => {
        return Object.entries(bookmarks)
            .map(([key, timestamp]) => {
                const parsed = parseBookmarkKey(key);
                return parsed ? { ...parsed, timestamp } : null;
            })
            .filter(Boolean)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [bookmarks]);

    return { bookmarks, isBookmarked, toggleBookmark, getBookmarksForChapter, getAllBookmarks };
}
