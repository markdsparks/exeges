import { useState } from 'react';
import '../../styles/reader.css';

/**
 * BookmarkButton — Toggle bookmark per verse.
 * Shows a heart icon that fills when the verse is bookmarked.
 */
export default function BookmarkButton({ bookId, chapter, verse, isBookmarked, onToggle }) {
   const [hovering, setHovering] = useState(false);

   const handleClick = (event) => {
      event.stopPropagation();
      onToggle?.(bookId, chapter, verse);
   };

   return (
      <button
         className={`bookmark-indicator ${isBookmarked ? 'active' : ''}`}
          onClick={handleClick}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
         title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
         aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
         style={{ opacity: hovering || isBookmarked ? 1 : 0.3 }}
         >
         {isBookmarked ? '♥' : '♡'}
     </button>
   );
}
