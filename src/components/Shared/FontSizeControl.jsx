import '../../styles/navigation.css';

/**
 * FontSizeControl — +/- buttons for reading font size.
 * Stores preference in localStorage.
 */
const SIZES = [14, 15, 16, 17, 18, 19, 20, 22, 24];

export default function FontSizeControl({ fontSize, onCycle }) {
    const idx = SIZES.indexOf(fontSize);
    const current = SIZES[idx] ?? fontSize;

    return (
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <button
                 className="control-button"
                  onClick={() => onCycle?.('down')}
                   title="Smaller text"
                   aria-label="Decrease font size"
                >A-</button>

                  <span className="font-size-display">{current}px</span>

                 <button
                     className="control-button"
                      onClick={() => onCycle?.('up')}
                       title="Larger text"
                        aria-label="Increase font size"
                     >A+</button>
                 </div>
             );
         }
