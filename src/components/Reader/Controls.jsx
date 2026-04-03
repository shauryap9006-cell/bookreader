import useStore from '../../store/useStore';

/**
 * CONTROLS — Minimal bottom bar.
 * Shows only: Prev | page count | Next
 * Plus a home button and zoom.
 * Appears/disappears with isVisible.
 */
const Controls = ({ isVisible }) => {
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    zoomIn,
    zoomOut,
    zoomLevel,
    setCurrentView,
    setSearchOpen,
  } = useStore();

  const prev = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const next = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

  return (
    <div
      id="reader-controls"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
        transition: `opacity var(--duration) var(--ease), transform var(--duration) var(--ease)`,
        pointerEvents: isVisible ? 'auto' : 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
        zIndex: 100,
      }}
    >
      {/* Left: Home + Search + Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button
          className="action-link"
          onClick={() => setCurrentView('dashboard')}
          title="Home"
          style={{ fontSize: 'var(--text-sm)' }}
        >
          ←
        </button>

        <button
          className="action-link"
          onClick={() => setSearchOpen(true)}
          title="Search (Ctrl+F)"
          style={{ fontSize: 'var(--text-sm)' }}
        >
          ⌕
        </button>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button
            className="action-link"
            onClick={zoomOut}
            disabled={zoomLevel <= 0.5}
            style={{ fontSize: 'var(--text-sm)', opacity: zoomLevel <= 0.5 ? 0.3 : 1 }}
            title="Zoom out"
          >
            −
          </button>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-secondary)', minWidth: '32px', textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            className="action-link"
            onClick={zoomIn}
            disabled={zoomLevel >= 3.0}
            style={{ fontSize: 'var(--text-sm)', opacity: zoomLevel >= 3.0 ? 0.3 : 1 }}
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {/* Center: Prev | Page | Next */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
        <button
          className="action-link"
          onClick={prev}
          disabled={currentPage <= 1}
          style={{ opacity: currentPage <= 1 ? 0.2 : 1, fontSize: 'var(--text-lg)' }}
        >
          ‹
        </button>

        <span style={{
          fontSize: 'var(--text-sm)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
          color: 'var(--fg)',
        }}>
          {currentPage}
          <span style={{ color: 'var(--fg-secondary)' }}> / {totalPages || '—'}</span>
        </span>

        <button
          className="action-link"
          onClick={next}
          disabled={currentPage >= totalPages}
          style={{ opacity: currentPage >= totalPages ? 0.2 : 1, fontSize: 'var(--text-lg)' }}
        >
          ›
        </button>
      </div>

      {/* Right: spacer for balance */}
      <div style={{ minWidth: '120px' }} />
    </div>
  );
};

export default Controls;
