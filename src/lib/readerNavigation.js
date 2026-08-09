const MIN_HORIZONTAL_SWIPE_DISTANCE = 88;
const MAX_VERTICAL_SWIPE_DRIFT = 52;
const MIN_HORIZONTAL_SWIPE_RATIO = 1.65;
const MAX_SWIPE_DURATION_MS = 900;

export function getAdjacentChapters(bibles, bookId, chapterNum) {
    if (!Array.isArray(bibles)) return { previous: null, next: null };

    const bookIndex = bibles.findIndex(book => book.id === bookId);
    if (bookIndex < 0) return { previous: null, next: null };

    const book = bibles[bookIndex];
    const chapterIndex = book.chapters?.findIndex(chapter => chapter.chapter === chapterNum) ?? -1;
    if (chapterIndex < 0) return { previous: null, next: null };

    const makeReference = (targetBook, targetChapter) => ({
        bookId: targetBook.id,
        bookName: targetBook.name,
        chapterNum: targetChapter.chapter,
    });

    const previous = chapterIndex > 0
        ? makeReference(book, book.chapters[chapterIndex - 1])
        : bookIndex > 0 && bibles[bookIndex - 1].chapters?.length
            ? makeReference(
                bibles[bookIndex - 1],
                bibles[bookIndex - 1].chapters[bibles[bookIndex - 1].chapters.length - 1],
            )
            : null;

    const next = chapterIndex < book.chapters.length - 1
        ? makeReference(book, book.chapters[chapterIndex + 1])
        : bookIndex < bibles.length - 1 && bibles[bookIndex + 1].chapters?.[0]
            ? makeReference(bibles[bookIndex + 1], bibles[bookIndex + 1].chapters[0])
            : null;

    return { previous, next };
}

export function getChapterSwipeIntent({ startX, startY, startTime, endX, endY, endTime }) {
    const horizontalDistance = endX - startX;
    const verticalDistance = endY - startY;
    const duration = endTime - startTime;

    if (
        duration < 0
        || duration > MAX_SWIPE_DURATION_MS
        || Math.abs(horizontalDistance) < MIN_HORIZONTAL_SWIPE_DISTANCE
        || Math.abs(verticalDistance) > MAX_VERTICAL_SWIPE_DRIFT
        || Math.abs(horizontalDistance) < Math.abs(verticalDistance) * MIN_HORIZONTAL_SWIPE_RATIO
    ) {
        return null;
    }

    return horizontalDistance > 0 ? 'previous' : 'next';
}

export function shouldConfirmChapterSwipe(pendingDirection, direction) {
    return pendingDirection === direction;
}
