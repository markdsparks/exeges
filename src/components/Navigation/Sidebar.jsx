import { useState } from 'react';
import '../../styles/navigation.css';

/**
 * Sidebar — Book/chapter navigation panel.
 * Slides in from the left with a dimmed overlay.
 */
export default function Sidebar({ booksByTestament, activeBookId, onNavigate, onClose }) {
    const [openBookId, setOpenBookId] = useState(null);

     if (!booksByTestament) return null;

    return (
            <div className="sidebar-panel">
                 {/* Header */}
                 <div className="sidebar-header">
                      <span className="sidebar-title">Exeges</span>
                      <button className="sidebar-close" onClick={onClose} aria-label="Close">
                           &times;
                        </button>
                      </div>

                   {/* Content */}
                     <div className="sidebar-content">
                         {/* Old Testament */}
                          <section>
                              <h3 className="testament-label">Old Testament</h3>
                               {booksByTestament.OT.map(book => (
                                   <BookItem
                                       key={book.id}
                                        name={book.name}
                                       chapterCount={book.chapters?.length || 0}
                                       isActive={activeBookId === book.id}
                                      isOpen={openBookId === book.id}
                                        onOpen={() => setOpenBookId(openBookId === book.id ? null : book.id)}
                                         onSelect={(ch) => onNavigate?.(book.id, ch)}
                                     />
                                ))}
                          </section>

                           {/* New Testament */}
                             <section>
                                 <h3 className="testament-label">New Testament</h3>
                                  {booksByTestament.NT.map(book => (
                                       <BookItem
                                          key={book.id}
                                           name={book.name}
                                           chapterCount={book.chapters?.length || 0}
                                          isActive={activeBookId === book.id}
                                         isOpen={openBookId === book.id}
                                          onOpen={() => setOpenBookId(openBookId === book.id ? null : book.id)}
                                            onSelect={(ch) => onNavigate?.(book.id, ch)}
                                       />
                                   ))}
                              </section>
                           </div>
                         </div>
                     );
                 }

                 /* Book item with expandable chapter grid */
function BookItem({ name, chapterCount, isActive, isOpen, onOpen, onSelect }) {
    return (
             <div className="book-item-wrapper">
                  <button
                      className={`book-item ${isActive ? 'active' : ''}`}
                   onClick={onOpen}
                     >
                         <span>{name}</span>
                          <span style={{ fontSize: '0.7em', opacity: 0.5 }}>{chapterCount}</span>
                     </button>

                   {isOpen && (
                        <div className="chapter-grid">
                             {(Array.from({ length: chapterCount }, (_, i) => i + 1)).map(ch => (
                                  <button key={ch} className={`chapter-item`} onClick={() => onSelect?.(ch)}>
                                       {ch}
                                      </button>
                                 ))}
                            </div>
                        )}
                    </div>
               );
           }
