import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Loader2 } from 'lucide-react';
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
        const cappedText = text.slice(0, 4000); 

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
    width: '400px',
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

  return (
    <motion.div 
      style={popupStyle} 
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="reader-popup ai-explain-popup"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A5B4FC' }}>
          <Sparkles size={16} strokeWidth={2.5} />
          <strong style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: '700' }}>
            Ai Explanation
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
            <span style={{ fontSize: '14px', color: '#A1A1AA' }}>Analyzing your selection...</span>
          </div>
        )}
        {error && <div style={{ color: '#FCA5A5' }}>Failed to get explanation. Please check connection.</div>}
        {!loading && !error && (
          <motion.div
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5 }}
          >
            {explanation}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AiExplainPopup;
