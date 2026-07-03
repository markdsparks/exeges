import { useState, useEffect } from 'react';
import '../../styles/navigation.css';

/**
 * ReadingProgress — Thin scroll-based progress bar.
 * Shows reading progress at the top of the viewport.
 */
export default function ReadingProgress() {
   const [progress, setProgress] = useState(0);

   useEffect(() => {
      const handleScroll = () => {
         const scrollTop = window.scrollY;
         const docHeight = document.documentElement.scrollHeight - window.innerHeight;
         if (docHeight > 0) {
            setProgress((scrollTop / docHeight) * 100);
          }
        };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
     }, []);

   return (
      <div className="progress-bar-container">
           <div
            className="progress-bar-fill"
             style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
         />
        </div>
     );
}
