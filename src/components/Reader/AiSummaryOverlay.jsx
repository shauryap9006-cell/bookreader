import React, { useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import { extractPageText } from '../../utils/pdfLoader';

const AiSummaryOverlay = ({ pdfDoc, page }) => {
  const { summaryCache, setSummaryCache, clearActivePopup } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    if (summaryCache[page]) {
      return;
    }

    const fetchSummary = async () => {
      setLoading(true);
      setError(false);
      try {
        const fullText = await extractPageText(pdfDoc, page);
        // Cap text at 4000 chars as per performance rules
        const cappedText = fullText.slice(0, 4000);

        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cappedText }),
        });

        if (!res.ok) throw new Error('Network response was not ok');
        
        const data = await res.json();
        
        if (active) {
          setSummaryCache(page, data.bulletPoints || []);
        }
      } catch (err) {
        if (active) {
          console.error('Summary API error:', err);
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      active = false;
    };
  }, [page, pdfDoc, setSummaryCache, summaryCache]);

  const popupStyle = {
    width: '350px',
    minWidth: '350px',
    position: 'fixed',
    top: '16px',
    right: '16px',
    height: 'auto',           // ← shrinks to content, no full height
    maxHeight: '60vh',        // ← caps it if content gets long
    overflowY: 'auto',
    backgroundColor: '#5b5050ee',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#e1c4c4ff',
    padding: '20px',
    border: '1px solid rgba(225, 196, 196, 0.15)',
    borderRadius: '16px',
    boxSizing: 'border-box',
    zIndex: 1000,
    fontSize: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2)',
  };

  const bullets = summaryCache[page];

  return (
    <div style={popupStyle} className="ai-summary-overlay">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Page Summary</strong>
        <button
          onClick={clearActivePopup}
          className="action-link"
          style={{ fontSize: '12px', opacity: 0.6 }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginTop: '0px', lineHeight: '1.2' }}>
        {loading && <div style={{ fontSize: '13px', opacity: 0.7 }}>Generating summary...</div>}
        {error && <div style={{ color: '#ff6b6b' }}>Failed to generate. Ensure server is running.</div>}
        {bullets && bullets.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {bullets.map((point, index) => (
              <li key={index} style={{ marginBottom: '2px' }}>{point}</li>
            ))}
          </ul>
        )}
        {!loading && !error && bullets?.length === 0 && (
          <div style={{ opacity: 0.7 }}>No summary available.</div>
        )}
      </div>
    </div>
  );
};

export default AiSummaryOverlay;
