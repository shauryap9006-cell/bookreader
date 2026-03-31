import React, { useEffect, useRef, useCallback } from 'react';
import useStore from '../../store/useStore';
import { loadPdfDocument, renderPdfPage } from '../../utils/pdfLoader';
import { updateProgress, loadHighlights, saveHighlights } from '../../utils/storage';
import Controls from './Controls';
import DictionaryPopup from './DictionaryPopup';
import NotesPanel from './NotesPanel';
import HighlightLayer from './HighlightLayer';

const Reader = () => {
  const { 
    currentBookId, 
    currentBookFile,
    currentPage, 
    totalPages,
    setTotalPages,
    zoomLevel,
    isFocusMode,
    setFocusMode,
    setHighlights,
    highlights,
  } = useStore();

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const containerRef = useRef(null);
  const focusTimeoutRef = useRef(null);
  const isFocusModeRef = useRef(isFocusMode);
  const highlightSaveTimerRef = useRef(null);

  // Keep ref in sync so the throttled handler always has current value
  useEffect(() => {
    isFocusModeRef.current = isFocusMode;
  }, [isFocusMode]);

  // Load PDF Document
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!currentBookFile) return;
        const resultDoc = await loadPdfDocument(currentBookFile);
        if (active) {
          pdfDocRef.current = resultDoc;
          setTotalPages(resultDoc.numPages);
        }
      } catch (err) {
        console.error('Core PDF Load Error:', err);
      }
    })();
    return () => { active = false; };
  }, [currentBookFile, setTotalPages]);

  // Load highlights from storage when book changes
  useEffect(() => {
    if (!currentBookId) return;
    let active = true;
    (async () => {
      try {
        const savedHighlights = await loadHighlights(currentBookId);
        if (active && savedHighlights.length > 0) {
          setHighlights(savedHighlights);
        }
      } catch (err) {
        console.error('Error loading highlights:', err);
      }
    })();
    return () => { active = false; };
  }, [currentBookId, setHighlights]);

  // Debounced auto-save highlights (300ms delay to avoid spamming storage)
  useEffect(() => {
    if (!currentBookId) return;
    if (highlightSaveTimerRef.current) {
      clearTimeout(highlightSaveTimerRef.current);
    }
    highlightSaveTimerRef.current = setTimeout(() => {
      const bookHighlights = highlights.filter(h => h.bookId === currentBookId);
      saveHighlights(currentBookId, bookHighlights).catch(err => 
        console.error('Error saving highlights:', err)
      );
    }, 300);
    return () => {
      if (highlightSaveTimerRef.current) {
        clearTimeout(highlightSaveTimerRef.current);
      }
    };
  }, [highlights, currentBookId]);

  // Render Page whenever currentPage, zoomLevel, or pdfDoc changes
  useEffect(() => {
    (async () => {
      if (pdfDocRef.current && canvasRef.current) {
        try {
           await renderPdfPage(pdfDocRef.current, currentPage, canvasRef.current, textLayerRef.current, zoomLevel);
        } catch (err) {
          console.error('Page render error:', err);
        }
      }
    })();
    
    // Auto-save progress
    if (currentBookId) {
      updateProgress(currentBookId, currentPage).catch(err => console.error(err));
    }
  }, [currentPage, zoomLevel, currentBookId, totalPages]);

  // Focus Mode: stable handler that uses refs to avoid re-renders
  // Uses requestAnimationFrame-throttled mousemove instead of raw events
  useEffect(() => {
    let rafId = null;
    let lastActivityTime = Date.now();

    const resetFocusTimer = () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      // Only set state if currently in focus mode (avoids redundant setState)
      if (isFocusModeRef.current) {
        setFocusMode(false);
      }
      focusTimeoutRef.current = setTimeout(() => {
        setFocusMode(true);
      }, 2500);
    };

    const handleMouseMove = () => {
      // Throttle to 1 call per animation frame (~16ms)
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const now = Date.now();
        // Further throttle: skip if last activity was <100ms ago
        if (now - lastActivityTime < 100) return;
        lastActivityTime = now;
        resetFocusTimer();
      });
    };

    const handleKeyOrTouch = () => {
      lastActivityTime = Date.now();
      resetFocusTimer();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyOrTouch, { passive: true });
    window.addEventListener('touchstart', handleKeyOrTouch, { passive: true });

    // Initial timeout
    resetFocusTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyOrTouch);
      window.removeEventListener('touchstart', handleKeyOrTouch);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [setFocusMode]); // Stable dependency — setFocusMode never changes

  return (
    <div 
      className="fullscreen reader-container" 
      ref={containerRef}
      style={{ 
        overflow: 'auto', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        cursor: isFocusMode ? 'none' : 'default',
        backgroundColor: '#000000',
      }}
    >
      <div 
        className="canvas-wrapper" 
        style={{
          position: 'relative',
          willChange: 'transform', // GPU hint for smooth transforms
        }}
      >
        {/* The core canvas */}
        <canvas ref={canvasRef} style={{ display: 'block', backgroundColor: '#FFFFFF' }} />
        
        {/* Highlight overlay layer — renders colored rectangles */}
        <HighlightLayer />
        
        {/* Invisible logical layer for text selection */}
        <div ref={textLayerRef} className="textLayer"></div>
      </div>

      <Controls isVisible={!isFocusMode} />
      <DictionaryPopup />
      <NotesPanel />
    </div>
  );
};

export default Reader;
