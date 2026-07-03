import '../../styles/navigation.css';
import { TRANSLATIONS } from '../../lib/translations';

/**
 * TranslationPicker — Dropdown to select Bible translation.
 * For now shows KJV only (the one we have), but structured
 * for easy expansion to ESV, NASB when data is added.
 */
export default function TranslationPicker({ activeId, onToggle, status }) {
   return (
      <div className="translation-picker">
         <div className="translation-label">Translation</div>
         <div className="translation-options">
            {TRANSLATIONS.map(t => (
               <button
                  key={t.id}
                  className={`translation-option ${activeId === t.id ? 'active' : ''}`}
                  onClick={() => onToggle?.(t.id)}
                  title={t.label}
                 >
                  {t.name}
                </button>
              ))}
         </div>
         {status && (
            <p className="translation-status">{status}</p>
         )}
       </div>
    );
  }
