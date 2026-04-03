import { Fragment } from 'react';

const HighlightLayer = ({ highlights, activeHighlightId }) => {
  if (!highlights.length) {
    return <div className="reader-highlight-layer" aria-hidden="true" />;
  }

  return (
    <div className="reader-highlight-layer" aria-hidden="true">
      {highlights.map((highlight) => {
        const firstRect = highlight.rects?.[0];
        const isActive = highlight.id === activeHighlightId;

        return (
          <Fragment key={highlight.id}>
            {highlight.rects.map((rect, index) => (
              <div
                className={`reader-highlight${isActive ? ' active' : ''}`}
                key={`${highlight.id}-${index}`}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                  backgroundColor: highlight.color 
                    ? `var(--color-${highlight.color}${isActive ? '-active' : ''})` 
                    : undefined,
                }}
              />
            ))}
            {highlight.note && firstRect && (
              <div
                className="note-dot"
                style={{
                  left: `calc(${firstRect.left + firstRect.width}% - 4px)`,
                  top: `calc(${firstRect.top}% + 2px)`,
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
};

export default HighlightLayer;
