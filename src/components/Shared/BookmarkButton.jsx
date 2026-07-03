import { useState, useCallback } from 'react';
import '../../styles/reader.css';

/**
 * BookmarkButton — Toggle bookmark per verse.
 * Shows a heart icon that fills when the verse is bookmarked.
 */
export default function BookmarkButton({ bookId, chapter, verse, isBookmarked, onToggle }) {
   const [hovering, setHovering] = useState(false);

   return (
      <button
         className={`bookmark-indicator ${isBookmarked ? 'active' : ''}`}
          onClick={() => onToggle?.(bookId, chapter, verse)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
         style={{ opacity: hovering || isBookmarked ? 1 : 0.3 }}
         >
         {isBookmarked ? '♥' : '♡'}
     </button>
   );
}
