import { useState, useCallback } from 'react';

const STORAGE_KEY = 'exeges-bookmarks';

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
                    // Extract verse number from the tail of the key
                    const parts = key.split('-');
                    const verse = parseInt(parts[parts.length - 1], 10);
                    return { bookId, chapter, verse };
                  })
                .sort((a, b) => a.verse - b.verse);
          },
        [bookmarks]
     );

    return { bookmarks, isBookmarked, toggleBookmark, getBookmarksForChapter };
}
