import React, { useEffect, useState, useRef } from 'react';
import useStore from '../../store/useStore';
import { saveHighlights } from '../../utils/storage';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFE066' },
  { name: 'Green', value: '#69DB7C' },
  { name: 'Blue', value: '#74C0FC' },
  { name: 'Pink', value: '#F783AC' },
  { name: 'Orange', value: '#FFA94D' },
];

const DictionaryPopup = () => {
  const [selection, setSelection] = useState({ text: '', x: 0, y: 0 });
  const [selectionRects, setSelectionRects] = useState([]);
  const [rawSelectedText, setRawSelectedText] = useState('');
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [highlightedMsg, setHighlightedMsg] = useState('');
  const popupRef = useRef(null);

  const { addHighlight, highlights, currentBookId, currentPage } = useStore();

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        closePopup();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closePopup = () => {
    setSelection({ text: '', x: 0, y: 0 });
    setSelectionRects([]);
    setRawSelectedText('');
    setDefinition(null);
    setError(false);
    setLoading(false);
    setHighlightedMsg('');
  };

  useEffect(() => {
    const handleMouseUp = (e) => {
      // Ignore clicks on the popup itself
      if (popupRef.current && popupRef.current.contains(e.target)) return;

      setTimeout(() => {
        const activeSel = window.getSelection();
        const text = activeSel?.toString().trim();

        if (!text) {
          return;
        }

        // Store the raw selected text for highlighting (before cleaning)
        const selectedRawText = text;

        // Capture selection rects relative to the canvas-wrapper
        let rects = [];
        try {
          const range = activeSel.getRangeAt(0);
          const clientRects = range.getClientRects();
          
          // Find the canvas-wrapper to get its bounding rect
          const canvasWrapper = document.querySelector('.canvas-wrapper');
          const wrapperRect = canvasWrapper?.getBoundingClientRect();

          if (wrapperRect && clientRects.length > 0) {
            // Convert client rects to be relative to the canvas-wrapper
            for (let i = 0; i < clientRects.length; i++) {
              const cr = clientRects[i];
              rects.push({
                left: cr.left - wrapperRect.left,
                top: cr.top - wrapperRect.top,
                width: cr.width,
                height: cr.height,
              });
            }
          }
        } catch (err) {
          // ignore range errors
        }

        // Clean punctuation from text for dictionary lookup
        const cleanWord = text.replace(/[.,!?;:\"'()\[\]{}""''…—–\-]/g, '').trim().toLowerCase();

        // Check if it's a single word for dictionary lookup
        const isSingleWord =
          cleanWord &&
          cleanWord.length > 1 &&
          cleanWord.length < 30 &&
          !cleanWord.includes(' ') &&
          !cleanWord.includes('\n') &&
          /^[a-zA-Z]+$/.test(cleanWord);

        // Show popup for both single words (dictionary + highlight) and multi-word selections (highlight only)
        if (cleanWord && cleanWord.length > 0 && rects.length > 0) {
          try {
            const range = activeSel.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            let posX = rect.x + (rect.width / 2);
            let posY = rect.bottom;

            const popupWidth = 360;
            posX = Math.max(popupWidth / 2 + 10, Math.min(posX, window.innerWidth - popupWidth / 2 - 10));

            const showAbove = posY + 300 > window.innerHeight;
            if (showAbove) {
              posY = rect.top - 16;
            }

            setSelection({
              text: cleanWord,
              x: posX,
              y: posY,
              showAbove,
              isSingleWord,
            });
            setSelectionRects(rects);
            setRawSelectedText(selectedRawText);
            setHighlightedMsg('');

            // Only fetch dictionary definition for single English words
            if (isSingleWord) {
              fetchDefinition(cleanWord);
            }
          } catch (err) {
            // Range error — ignore
          }
        }
      }, 50);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closePopup();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchDefinition = async (word) => {
    setLoading(true);
    setError(false);
    setDefinition(null);
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
      if (!response.ok) throw new Error('Not found');
      const data = await response.json();

      const entry = data[0];
      if (!entry) throw new Error('No entry');

      const allMeanings = [];
      entry.meanings.forEach((meaning) => {
        const defs = meaning.definitions.slice(0, 2);
        allMeanings.push({
          partOfSpeech: meaning.partOfSpeech,
          definitions: defs.map((d) => ({
            definition: d.definition,
            example: d.example || null,
          })),
          synonyms: meaning.synonyms?.slice(0, 4) || [],
          antonyms: meaning.antonyms?.slice(0, 4) || [],
        });
      });

      const phonetic =
        entry.phonetic ||
        entry.phonetics?.find((p) => p.text)?.text ||
        '';

      const audioUrl =
        entry.phonetics?.find((p) => p.audio && p.audio.length > 0)?.audio || '';

      const origin = entry.origin || '';

      setDefinition({
        word: entry.word,
        phonetic,
        audioUrl,
        origin,
        meanings: allMeanings,
      });
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleHighlight = async (color) => {
    if (!currentBookId || selectionRects.length === 0) return;

    const newHighlight = {
      id: crypto.randomUUID(),
      bookId: currentBookId,
      page: currentPage,
      text: rawSelectedText,
      color: color,
      rects: selectionRects,
      createdAt: Date.now(),
    };

    addHighlight(newHighlight);

    // Persist to storage
    const allHighlights = useStore.getState().highlights;
    const bookHighlights = allHighlights.filter(h => h.bookId === currentBookId);
    await saveHighlights(currentBookId, bookHighlights);

    // Show confirmation
    setHighlightedMsg(`Highlighted!`);
    
    // Clear selection from browser
    window.getSelection()?.removeAllRanges();

    // Close popup after a brief moment
    setTimeout(() => {
      closePopup();
    }, 600);
  };

  if (!selection.text) return null;

  const popupStyle = {
    position: 'fixed',
    left: selection.x,
    transform: 'translateX(-50%)',
    width: '360px',
    maxWidth: '92vw',
    maxHeight: '420px',
    overflowY: 'auto',
    padding: '0',
    zIndex: 200,
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.06)',
    borderRadius: '10px',
  };

  if (selection.showAbove) {
    popupStyle.bottom = window.innerHeight - selection.y + 16;
  } else {
    popupStyle.top = selection.y + 14;
  }

  return (
    <div
      ref={popupRef}
      className="fade-in glass-panel"
      style={popupStyle}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h4 style={styles.word}>{selection.isSingleWord ? selection.text : `"${rawSelectedText.substring(0, 30)}${rawSelectedText.length > 30 ? '...' : ''}"`}</h4>
          {definition?.phonetic && (
            <span style={styles.phonetic}>{definition.phonetic}</span>
          )}
          {definition?.audioUrl && (
            <button
              onClick={() => {
                const audio = new Audio(definition.audioUrl);
                audio.play();
              }}
              style={styles.audioBtn}
              title="Pronounce"
            >
              🔊
            </button>
          )}
        </div>
        <button onClick={closePopup} style={styles.closeBtn} title="Close">
          ✕
        </button>
      </div>

      {/* Highlight Color Bar */}
      <div style={styles.highlightBar}>
        <span style={styles.highlightLabel}>Highlight:</span>
        <div style={styles.colorDots}>
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => handleHighlight(c.value)}
              title={c.name}
              style={{
                ...styles.colorDot,
                backgroundColor: c.value,
              }}
            >
              <span style={styles.colorDotInner} />
            </button>
          ))}
        </div>
        {highlightedMsg && (
          <span style={styles.highlightedMsg}>{highlightedMsg}</span>
        )}
      </div>

      {/* Dictionary Content — only for single words */}
      {selection.isSingleWord && (
        <div style={styles.body}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>Looking up...</span>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <span style={styles.errorIcon}>📖</span>
              <span style={styles.errorText}>
                No definition found for "{selection.text}"
              </span>
              <span style={styles.errorHint}>
                Try selecting a different word
              </span>
            </div>
          ) : definition ? (
            <div style={styles.definitionContainer}>
              {definition.meanings.map((meaning, idx) => (
                <div key={idx} style={styles.meaningBlock}>
                  <div style={styles.posTag}>
                    <span style={styles.posText}>{meaning.partOfSpeech}</span>
                    <div style={styles.posDivider} />
                  </div>

                  {meaning.definitions.map((def, dIdx) => (
                    <div key={dIdx} style={styles.defItem}>
                      <div style={styles.defRow}>
                        <span style={styles.defNumber}>{dIdx + 1}.</span>
                        <p style={styles.defText}>{def.definition}</p>
                      </div>
                      {def.example && (
                        <p style={styles.exampleText}>
                          <span style={styles.exampleQuote}>"</span>
                          {def.example}
                          <span style={styles.exampleQuote}>"</span>
                        </p>
                      )}
                    </div>
                  ))}

                  {meaning.synonyms.length > 0 && (
                    <div style={styles.synonymsRow}>
                      <span style={styles.synonymLabel}>Synonyms:</span>
                      <div style={styles.synonymTags}>
                        {meaning.synonyms.map((syn, sIdx) => (
                          <span key={sIdx} style={styles.synonymTag}>
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {meaning.antonyms.length > 0 && (
                    <div style={styles.synonymsRow}>
                      <span style={styles.antonymLabel}>Antonyms:</span>
                      <div style={styles.synonymTags}>
                        {meaning.antonyms.map((ant, aIdx) => (
                          <span key={aIdx} style={styles.antonymTag}>
                            {ant}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {definition.origin && (
                <div style={styles.originBlock}>
                  <span style={styles.originLabel}>Origin</span>
                  <p style={styles.originText}>{definition.origin}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    flex: 1,
    minWidth: 0,
  },
  word: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.01em',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '240px',
  },
  phonetic: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    fontStyle: 'italic',
  },
  audioBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
    transition: 'background 200ms',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '15px',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '4px',
    transition: 'all 200ms',
    lineHeight: 1,
    flexShrink: 0,
  },
  // Highlight bar styles
  highlightBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  },
  highlightLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  },
  colorDots: {
    display: 'flex',
    gap: '6px',
  },
  colorDot: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 200ms ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  colorDotInner: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.5)',
    opacity: 0,
    transition: 'opacity 200ms',
  },
  highlightedMsg: {
    fontSize: '11px',
    color: '#69DB7C',
    fontWeight: 600,
    marginLeft: 'auto',
    animation: 'fadeIn 300ms ease',
  },
  body: {
    padding: '12px 16px 16px',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 0',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: 'rgba(255,255,255,0.6)',
    borderRadius: '50%',
    animation: 'spin 700ms linear infinite',
  },
  loadingText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px 0',
  },
  errorIcon: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  errorText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorHint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  definitionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  meaningBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  posTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  posText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#7eb8ff',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  },
  posDivider: {
    flex: 1,
    height: '1px',
    background: 'rgba(126, 184, 255, 0.15)',
  },
  defItem: {
    paddingLeft: '4px',
  },
  defRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'flex-start',
  },
  defNumber: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.35)',
    marginTop: '1px',
    minWidth: '16px',
  },
  defText: {
    fontSize: '13.5px',
    lineHeight: 1.55,
    color: 'rgba(255,255,255,0.88)',
    margin: 0,
  },
  exampleText: {
    fontSize: '12.5px',
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    margin: '4px 0 0 22px',
  },
  exampleQuote: {
    color: 'rgba(126, 184, 255, 0.5)',
  },
  synonymsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '2px',
    paddingLeft: '4px',
  },
  synonymLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  antonymLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,180,180,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  synonymTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  synonymTag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'rgba(126, 184, 255, 0.1)',
    color: 'rgba(126, 184, 255, 0.8)',
    border: '1px solid rgba(126, 184, 255, 0.12)',
  },
  antonymTag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'rgba(255, 120, 120, 0.08)',
    color: 'rgba(255, 160, 160, 0.7)',
    border: '1px solid rgba(255, 120, 120, 0.12)',
  },
  originBlock: {
    marginTop: '4px',
    padding: '10px 12px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  originLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'block',
    marginBottom: '4px',
  },
  originText: {
    fontSize: '12px',
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
  },
};

export default DictionaryPopup;
