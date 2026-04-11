import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Loader2 } from 'lucide-react';
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
    position: 'fixed',
    top: '24px',
    right: '24px',
    width: '400px',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    backgroundColor: 'rgba(15, 15, 20, 0.75)',
    backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
    color: '#EDEDED',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    zIndex: 1000,
    fontFamily: '"Inter", "Outfit", system-ui, -apple-system, sans-serif',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  };

  const bullets = summaryCache[page];

  return (
    <motion.div 
      style={popupStyle} 
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="ai-summary-overlay"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A5B4FC' }}>
          <Sparkles size={16} strokeWidth={2.5} />
          <strong style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: '700' }}>
            Page Summary
          </strong>
        </div>
        <button
          onClick={clearActivePopup}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#888', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#888';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ fontSize: '15px', lineHeight: '1.65', letterSpacing: '0.01em', fontWeight: '400', color: '#E4E4E7' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8, padding: '8px 0' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            >
              <Loader2 size={18} color="#A5B4FC" />
            </motion.div>
            <span style={{ fontSize: '14px', color: '#A1A1AA' }}>Reading page content...</span>
          </div>
        )}
        {error && <div style={{ color: '#FCA5A5' }}>Failed to generate. Ensure server is running.</div>}
        
        {bullets && bullets.length > 0 && (
          <motion.ul 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ margin: 0, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {bullets.map((point, index) => (
              <motion.li 
                key={index} 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                style={{ paddingLeft: '4px', color: '#F4F4F5' }}
              >
                {point}
              </motion.li>
            ))}
          </motion.ul>
        )}
        
        {!loading && !error && bullets?.length === 0 && (
          <div style={{ color: '#A1A1AA', fontStyle: 'italic' }}>No summary available for this page.</div>
        )}
      </div>
    </motion.div>
  );
};

export default AiSummaryOverlay;
