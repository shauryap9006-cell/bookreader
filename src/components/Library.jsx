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

const PANTONE_COLORS = [
  '#FFBE98', // Peach Fuzz
  '#6667AB', // Very Peri
  '#BB2649', // Viva Magenta
  '#0F4C81', // Classic Blue
  '#FF6F61', // Living Coral
  '#F5DF4D', // Illuminating
  '#939597', // Ultimate Gray
];

const getPantoneColor = (id) => {
  if (!id) return PANTONE_COLORS[0];
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PANTONE_COLORS[index % PANTONE_COLORS.length];
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
    <div className="fullscreen fade-in" id="library" style={{ position: 'relative', overflow: 'hidden' }}>

      {/* ── Background Video ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4" type="video/mp4" />
        </video>
        {/* Dim overlay so content stays readable */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      </div>


      {/* ── Content layer ── */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-6)',
        height: '100%',
      }}>

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
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 'var(--space-5)',
              flex: 1,
              overflow: 'auto',
              alignContent: 'start',
              paddingBottom: '40px'
            }}
          >
            {library.map((book) => {
              const themeColor = getPantoneColor(book.id);
              return (
                <div
                  key={book.id}
                  onClick={() => openBook(book)}
                  style={{
                    aspectRatio: '1 / 1',
                    background: 'rgba(255,255,255,0.035)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderRadius: '28px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    opacity: loading === book.id ? 0.4 : 1,
                    transition: 'all 0.4s cubic-bezier(0.2, 0, 0, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
                  }}
                >
                  {/* Subtle Accent Glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-15%',
                    right: '-15%',
                    width: '60%',
                    height: '60%',
                    background: themeColor,
                    filter: 'blur(24px)',
                    opacity: 0.12,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                  }} />

                  {/* Top Bar: Icon & Delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: `${themeColor}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${themeColor}30`,
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>

                    <button
                      onClick={(e) => deleteBook(e, book.id)}
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '20px',
                        transition: 'color 0.2s ease',
                        marginTop: '-4px',
                        marginRight: '-4px',
                        padding: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4d'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >
                      ×
                    </button>
                  </div>

                  {/* Bottom Info */}
                  <div style={{ zIndex: 1 }}>
                    <p style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#fff',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      letterSpacing: '-0.01em'
                    }}>
                      {book.title}
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: book.status === 'completed' ? '#4CAF50' : themeColor,
                        opacity: 0.8
                      }} />
                      {statusLabel[book.status] || 'Not started'}
                      {book.lastPage > 1 && ` · P${book.lastPage}`}
                    </p>
                  </div>

                  {/* Progress Indicator at very bottom */}
                  {book.status === 'reading' && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'rgba(255,255,255,0.05)',
                    }}>
                      <div style={{
                        height: '100%',
                        background: themeColor,
                        width: book.totalPages ? `${((book.lastPage || 1) / book.totalPages) * 100}%` : '0%',
                        boxShadow: `0 0 10px ${themeColor}60`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
