import { useState } from 'react';
import useStore from '../store/useStore';
import { loadBookFile, deleteBookFromLibrary } from '../utils/storage';

/**
 * LIBRARY — Grid of books with minimal metadata.
 * Shows: cover placeholder + title + reading status + resume entry.
 * Statuses: not_started, reading, completed.
 */
const statusLabel = {
  not_started: 'Not started',
  reading: 'Reading',
  completed: 'Completed',
};

const Library = () => {
  const { setCurrentView, setCurrentBookId, setCurrentBookFile, setCurrentPage, library, setLibrary } = useStore();
  const [loading, setLoading] = useState(null);

  const openBook = async (book) => {
    try {
      setLoading(book.id);
      const data = await loadBookFile(book.id);
      setCurrentBookId(book.id);
      setCurrentBookFile(data);
      setCurrentPage(book.lastPage || 1);
      setCurrentView('reader');
    } catch (err) {
      console.error('Failed to open:', err);
    } finally {
      setLoading(null);
    }
  };

  const deleteBook = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this book?')) return;
    try {
      const updated = await deleteBookFromLibrary(id);
      setLibrary(updated);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 60) return '';
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  return (
    <div className="fullscreen fade-in" id="library" style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-6)' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <button className="action-link" id="library-back-btn" onClick={() => setCurrentView('dashboard')}>
          &larr; Back
        </button>
        <div style={{ flex: 1 }} />
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 300, letterSpacing: '0.04em', textTransform: 'lowercase' }}>
          library
        </h2>
      </header>

      {/* Empty state */}
      {library.length === 0 ? (
        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-sm)' }}>No books yet</p>
          <button className="action-link" onClick={() => setCurrentView('dashboard')}>
            Upload your first book &rarr;
          </button>
        </div>
      ) : (

        /* Book Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 'var(--space-5)',
            flex: 1,
            overflow: 'auto',
            alignContent: 'start',
          }}
        >
          {library.map((book) => (
            <div
              key={book.id}
              onClick={() => openBook(book)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                cursor: 'pointer',
                opacity: loading === book.id ? 0.4 : 1,
                transition: 'opacity var(--duration) var(--ease)',
              }}
            >
              {/* Cover placeholder */}
              <div
                style={{
                  aspectRatio: '1 / 1.45',
                  background: '#0a0a0a',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'background var(--duration) var(--ease)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#111'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#0a0a0a'; }}
              >
                {/* Minimal book icon — just two lines */}
                <svg width="28" height="36" viewBox="0 0 28 36" fill="none" style={{ opacity: 0.15 }}>
                  <rect x="2" y="2" width="24" height="32" rx="1" stroke="white" strokeWidth="1"/>
                  <line x1="8" y1="10" x2="20" y2="10" stroke="white" strokeWidth="0.5"/>
                  <line x1="8" y1="14" x2="16" y2="14" stroke="white" strokeWidth="0.5"/>
                </svg>

                {/* Delete */}
                <button
                  onClick={(e) => deleteBook(e, book.id)}
                  style={{
                    position: 'absolute',
                    top: 'var(--space-2)',
                    right: 'var(--space-2)',
                    color: 'var(--fg-secondary)',
                    opacity: 0,
                    transition: 'opacity var(--duration) var(--ease), color var(--duration) var(--ease)',
                    fontSize: 'var(--text-xs)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--fg-secondary)';
                  }}
                  className="book-delete-btn"
                >
                  ×
                </button>

                {/* Reading status indicator */}
                {book.status === 'reading' && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'var(--fg)',
                    opacity: 0.3,
                    width: book.totalPages ? `${((book.lastPage || 1) / book.totalPages) * 100}%` : '0%',
                  }} />
                )}
              </div>

              {/* Title & meta */}
              <div>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 400,
                }}>
                  {book.title}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-secondary)', marginTop: '2px' }}>
                  {statusLabel[book.status] || 'Not started'}
                  {book.lastPage > 1 && ` · Page ${book.lastPage}`}
                  {formatTime(book.readingTime) && ` · ${formatTime(book.readingTime)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Show delete button on hover via CSS-in-JS parent hover
const styleTag = document.createElement('style');
styleTag.textContent = `
  #library div:hover > div > .book-delete-btn { opacity: 0.6 !important; }
`;
document.head.appendChild(styleTag);

export default Library;
