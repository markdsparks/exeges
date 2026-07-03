import '../../styles/navigation.css';

/**
 * TranslationPicker — Dropdown to select Bible translation.
 * For now shows KJV only (the one we have), but structured
 * for easy expansion to ESV, NASB when data is added.
 */
const TRANSLATIONS = [
   { id: 'kjv', name: 'KJV', label: 'King James Version' },
   // Soon: { id: 'esv', name: 'ESV', label: 'English Standard Version' },
   // Soon: { id: 'nasb', name: 'NASB', label: 'New American Standard Bible' },
];

export default function TranslationPicker({ activeId, onToggle }) {
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
       </div>
    );
  }
