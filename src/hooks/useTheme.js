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
   const [themePreference, setThemePreference] = useState(() => {
      try {
         const stored = localStorage.getItem(STORAGE_KEY);
         if (stored === 'dark') return 'dark';
         if (stored === 'light') return 'light';
         if (stored === 'auto') return 'auto';
       } catch {}

      return 'auto';
     });
   const [systemMode, setSystemMode] = useState(() => (
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
   ));
   const mode = themePreference === 'auto' ? systemMode : themePreference;

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
      const handler = (e) => setSystemMode(e.matches ? 'dark' : 'light');

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
     }, []);

   const toggleMode = useCallback(() => {
      const nextPreference = themePreference === 'auto'
         ? 'light'
         : themePreference === 'light'
            ? 'dark'
            : 'auto';
      setThemePreference(nextPreference);
         try {
            localStorage.setItem(STORAGE_KEY, nextPreference);
         } catch {}
       },
       [themePreference]
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
      themePreference,
      toggleMode,
      fontSize,
      cycleFontSize,
       setMode: setThemePreference,
     };
}
