import { useState, useCallback } from 'react';
import bibleText from '../data/bible.json';

/**
 * Hook: useBibleData
 * Manages Bible data and navigation state.
 */
export function useBibleData() {
    const [bibles] = useState(() => bibleText);
    const [selectedBookId, setSelectedBookId] = useState('genesis');
    const [selectedChapterNum, setSelectedChapterNum] = useState(1);

       // Get all books grouped by testament
    const getBooksByTestament = useCallback(() => {
        const ot = [];
        const nt = [];
        for (const book of bibles) {
            if (book.testament === 'NT') nt.push(book);
            else ot.push(book);
          }
        return { OT: ot, NT: nt };
       }, [bibles]);

       // Navigate to a specific book and chapter
    const navigateTo = useCallback((bookId, chapterNum) => {
        setSelectedBookId(bookId);
        setSelectedChapterNum(chapterNum);
        }, []);

       // Get full book object by ID
    const getBookById = useCallback((id) => {
        return bibles.find(b => b.id === id);
       }, [bibles]);

    const book = getBookById(selectedBookId);

    return {
        bibles,
        book,
        selectedBookId,
        selectedChapterNum,
        navigateTo,
        getBooksByTestament,
      };
}
