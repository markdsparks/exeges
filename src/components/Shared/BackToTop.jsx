import { useState, useEffect, useRef } from 'react';
import '../../styles/reader.css';

/**
 * BackToTop — Floating "back to chapter top" button that appears after scrolling ~40%
 */
export default function BackToTop({ readerRef }) {
    const [visible, setVisible] = useState(false);
    const isMounted = useRef(false);

    // Track scroll progress and decide when to show/hide the button
    const handleScroll = () => {
        if (!readerRef.current) return;
        const el = readerRef.current;
        const scrollTop = el.scrollTop;
        const totalHeight = el.scrollHeight - el.clientHeight;
        if (totalHeight <= 0) return;

        const progress = scrollTop / totalHeight;
        setVisible(progress >= 0.4);
    };

    // Attach the scroll listener to the reader container
    useEffect(() => {
        if (!readerRef.current) return;
        isMounted.current = true;

        readerRef.current.addEventListener('scroll', handleScroll, { passive: true });

        // Initialise visibility based on current scroll position
        handleScroll();

        return () => {
            readerRef.current?.removeEventListener('scroll', handleScroll);
        };
    }, [readerRef]);

    if (!visible) return null;

    const handleClick = () => {
        readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
