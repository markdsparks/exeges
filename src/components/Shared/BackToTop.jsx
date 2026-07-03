import { useState, useEffect } from 'react';
import '../../styles/reader.css';

/**
 * BackToTop — Floating "back to chapter top" button that appears after scrolling ~40%
 */
export default function BackToTop() {
    const [visible, setVisible] = useState(false);

    // Track scroll progress and decide when to show/hide the button
    const handleScroll = () => {
        const scrollTop = window.scrollY;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight <= 0) return;

        const progress = scrollTop / totalHeight;
        setVisible(progress >= 0.4);
    };

    // Attach to the document scroll, which is the app's active scroll surface.
    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Initialise visibility based on current scroll position
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    if (!visible) return null;

    const handleClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            className="back-to-top"
            onClick={handleClick}
            title="Back to top"
            aria-label="Back to chapter header"
        >
            &uarr;
        </button>
    );
}
