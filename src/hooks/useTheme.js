import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'exes-theme';
const FONT_SIZE_KEY = 'exes-font-size';

/**
 * Hook: useTheme
 *
 * Manages light/dark mode and font size.
 * Respects system preference by default, allows override.
 */
export function useTheme() {
   const [mode, setMode] = useState(() => {
      try {
         const stored = localStorage.getItem(STORAGE_KEY);
         if (stored === 'dark') return 'dark';
         if (stored === 'light') return 'light';
       } catch {}

        // Detect system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
     });

   const [fontSize, setFontSize] = useState(() => {
         try {
            const stored = localStorage.getItem(FONT_SIZE_KEY);
            return stored ? parseInt(stored, 10) : 18;
         } catch {
            return 18;
          }
       });

    // Listen for system preference changes
   useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => {
         // Only auto-switch if user hasn't explicitly set a mode
         if (!localStorage.getItem(STORAGE_KEY)) {
            setMode(e.matches ? 'dark' : 'light');
          }
        };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
     }, []);

   const toggleMode = useCallback(() => {
      const newMode = mode === 'dark' ? 'light' : 'dark';
      setMode(newMode);
         try {
            localStorage.setItem(STORAGE_KEY, newMode);
         } catch {}
       },
       [mode]
     );

   const cycleFontSize = useCallback((direction) => {
         // Valid sizes: 14, 15, 16, 17, 18 (default), 19, 20, 22, 24
         const sizes = [14, 15, 16, 17, 18, 19, 20, 22, 24];
         const idx = sizes.indexOf(fontSize);
         if (idx === -1) return;

         const newIdx = direction === 'down'
            ? Math.max(0, idx - 1)
            : Math.min(sizes.length - 1, idx + 1);

         const newSize = sizes[newIdx];
         setFontSize(newSize);
         try {
            localStorage.setItem(FONT_SIZE_KEY, String(newSize));
         } catch {}
       },
       [fontSize]
     );

   return {
      mode,
      fontSize,
      cycleFontSize,
       setMode,
    };
}
