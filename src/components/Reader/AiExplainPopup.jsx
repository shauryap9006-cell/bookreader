import React, { useEffect, useState } from 'react';
import useStore from '../../store/useStore';

const AiExplainPopup = ({ text, x, y }) => {
  const { clearActivePopup } = useStore();
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchExplanation = async () => {
      setLoading(true);
      setError(false);
      try {
        const cappedText = text.slice(0, 4000); // 4000 char cap

        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cappedText }),
        });

        if (!res.ok) throw new Error('Network response was not ok');
        
        const data = await res.json();
        
        if (active) {
          setExplanation(data.explanation || 'No explanation provided.');
        }
      } catch (err) {
        if (active) {
          console.error('Explain API error:', err);
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (text) {
      fetchExplanation();
    }

    return () => {
      active = false;
    };
  }, [text]);

  const popupStyle = {
    position: 'absolute',
    top: `${y}px`,
    left: `${x}px`,
    width: '380px',
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Slightly more opaque white for black text
    color: '#000',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    fontSize: '14px',
    lineHeight: '1.5',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div style={popupStyle} className="reader-popup ai-explain-popup">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong>Explanation</strong>
        <button
          onClick={clearActivePopup}
          className="action-link"
          style={{ fontSize: '12px', opacity: 0.6 }}
        >
          ✕
        </button>
      </div>
      <div>
        {loading && <div style={{ opacity: 0.7 }}>Thinking...</div>}
        {error && <div style={{ color: '#ff6b6b' }}>Failed to get explanation. Server running?</div>}
        {!loading && !error && <div>{explanation}</div>}
      </div>
    </div>
  );
};

export default AiExplainPopup;
