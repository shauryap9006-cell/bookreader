import React from 'react';
import useStore from '../../store/useStore';
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Home } from 'lucide-react';

const Controls = ({ isVisible }) => {
  const { 
    currentPage, 
    setCurrentPage, 
    totalPages, 
    zoomIn, 
    zoomOut, 
    zoomLevel,
    setCurrentView 
  } = useStore();

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 'var(--spacing-3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 400ms ease-in-out',
        pointerEvents: isVisible ? 'auto' : 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)', // Subtle gradient to ensure text readability on weird canvases
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
        <button className="action-link" onClick={() => setCurrentView('library')} title="Back to Library">
          <Home size={20} />
        </button>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <button className="action-link" onClick={zoomOut} disabled={zoomLevel <= 0.5} title="Zoom Out">
            <ZoomOut size={20} />
          </button>
          <button className="action-link" onClick={zoomIn} disabled={zoomLevel >= 3.0} title="Zoom In">
            <ZoomIn size={20} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-5)' }}>
        <button 
          className="action-link" 
          onClick={handlePrev} 
          disabled={currentPage <= 1}
          style={{ opacity: currentPage <= 1 ? 0.3 : 1 }}
        >
          <ArrowLeft size={24} />
        </button>
        
        <span className="body-text" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
          {currentPage} <span style={{ color: 'var(--text-secondary)' }}>/ {totalPages || '?'}</span>
        </span>
        
        <button 
          className="action-link" 
          onClick={handleNext} 
          disabled={currentPage >= totalPages}
          style={{ opacity: currentPage >= totalPages ? 0.3 : 1 }}
        >
          <ArrowRight size={24} />
        </button>
      </div>
      
      {/* Spacer for flex balance */}
      <div style={{ width: '80px' }} />
    </div>
  );
};

export default Controls;
