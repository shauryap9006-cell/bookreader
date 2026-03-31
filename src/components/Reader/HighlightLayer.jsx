import React, { useEffect, useRef } from 'react';
import useStore from '../../store/useStore';

/**
 * HighlightLayer renders colored rectangles over the text layer
 * to display saved highlights for the current page.
 */
const HighlightLayer = ({ containerRef }) => {
  const { currentBookId, currentPage, highlights, removeHighlight } = useStore();
  const layerRef = useRef(null);

  // Get highlights for current page
  const pageHighlights = highlights.filter(
    h => h.bookId === currentBookId && h.page === currentPage
  );

  if (pageHighlights.length === 0) return null;

  return (
    <div
      ref={layerRef}
      className="highlight-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Allow clicks to pass through to text layer
        zIndex: 1, // Above canvas, below textLayer
      }}
    >
      {pageHighlights.map((highlight) =>
        highlight.rects.map((rect, rIdx) => (
          <div
            key={`${highlight.id}-${rIdx}`}
            className="highlight-rect"
            data-highlight-id={highlight.id}
            style={{
              position: 'absolute',
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              backgroundColor: highlight.color,
              opacity: 0.35,
              borderRadius: '2px',
              pointerEvents: 'auto', // Make highlights clickable
              cursor: 'pointer',
              transition: 'opacity 200ms ease',
              mixBlendMode: 'multiply',
            }}
            title={`"${highlight.text}" — Click to remove`}
            onClick={(e) => {
              e.stopPropagation();
              // Show a small confirm before deleting
              if (window.confirm(`Remove highlight: "${highlight.text.substring(0, 40)}${highlight.text.length > 40 ? '...' : ''}"?`)) {
                removeHighlight(highlight.id);
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.55';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.35';
            }}
          />
        ))
      )}
    </div>
  );
};

export default HighlightLayer;
