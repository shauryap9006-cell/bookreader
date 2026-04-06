import { useCallback, useEffect, useRef, useState } from 'react';
import useStore from '../../store/useStore';
import { loadPdfDocument, renderPdfPage } from '../../utils/pdfLoader';
import {
  loadHighlights,
  saveHighlights,
  updateProgress,
  updateReadingTime,
} from '../../utils/storage';
import Controls from './Controls';
import DictionaryPopup from './DictionaryPopup';
import HighlightLayer from './HighlightLayer';
import ResumeOverlay from './ResumeOverlay';
import SearchOverlay from './SearchOverlay';
import TimeIndicator from './TimeIndicator';
import AiExplainPopup from './AiExplainPopup';
import AiSummaryOverlay from './AiSummaryOverlay';

const POPUP_MARGIN = 16;
const POPUP_GAP = 4;
const DICTIONARY_POPUP_WIDTH = 220;
const NOTE_POPUP_WIDTH = 220;
const NOTE_INPUT_WIDTH = 180;
const ACTION_POPUP_WIDTH = 116;
const SELECTION_POPUP_WIDTH = 280;
const HIGHLIGHT_HIT_TOLERANCE = 0.75;
const HIGHLIGHT_CLICK_DELAY = 180;
const SEARCH_MATCH_LIMIT = 80;
const SWATCH_COLORS = ['yellow', 'green', 'blue', 'pink', 'white'];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const cleanText = (value) => value.replace(/\s+/g, ' ').trim();

const normalizeWord = (value) => value.replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, '');

const truncate = (value, limit = 48) => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit - 1)}...` : value;
};

const getSingleWord = (value) => {
  const normalized = normalizeWord(cleanText(value || ''));
  if (!normalized) return '';
  return normalized.split(/\s+/).length === 1 ? normalized : '';
};

const isRangeInsideNode = (range, node) => {
  if (!range || !node) return false;
  const ancestor = range.commonAncestorContainer;
  const target = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode : ancestor;
  return Boolean(target && node.contains(target));
};



const getTextSegments = (textLayerNode) => {
  const walker = document.createTreeWalker(textLayerNode, NodeFilter.SHOW_TEXT);
  const segments = [];
  let fullText = '';
  let node = walker.nextNode();

  while (node) {
    const text = node.textContent || '';
    if (text) {
      segments.push({
        node,
        start: fullText.length,
        end: fullText.length + text.length,
      });
      fullText += text;
    }
    node = walker.nextNode();
  }

  return { segments, fullText };
};

const getTextPosition = (segments, index) => {
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (index <= segment.end) {
      return {
        node: segment.node,
        offset: Math.max(0, Math.min(index - segment.start, segment.node.textContent.length)),
      };
    }
  }

  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) return null;

  return {
    node: lastSegment.node,
    offset: lastSegment.node.textContent.length,
  };
};

const createSearchRects = (textLayerNode, query) => {
  const normalizedQuery = cleanText(query || '');
  if (!textLayerNode || !normalizedQuery) return [];

  const layerRect = textLayerNode.getBoundingClientRect();
  if (!layerRect.width || !layerRect.height) return [];

  const { segments, fullText } = getTextSegments(textLayerNode);
  if (!segments.length || !fullText) return [];

  const lowerText = fullText.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const rects = [];
  let fromIndex = 0;
  let matches = 0;

  while (matches < SEARCH_MATCH_LIMIT) {
    const matchIndex = lowerText.indexOf(lowerQuery, fromIndex);
    if (matchIndex === -1) break;

    const startTarget = getTextPosition(segments, matchIndex);
    const endTarget = getTextPosition(segments, matchIndex + lowerQuery.length);

    if (startTarget && endTarget) {
      const range = document.createRange();
      range.setStart(startTarget.node, startTarget.offset);
      range.setEnd(endTarget.node, endTarget.offset);

      const matchRects = Array.from(range.getClientRects())
        .map((rect) => {
          const left = Math.max(rect.left, layerRect.left);
          const top = Math.max(rect.top, layerRect.top);
          const right = Math.min(rect.right, layerRect.right);
          const bottom = Math.min(rect.bottom, layerRect.bottom);
          const width = right - left;
          const height = bottom - top;

          return { left, top, right, bottom, width, height };
        })
        .filter((rect) => rect.width > 1 && rect.height > 1);

      rects.push(
        ...matchRects.map((rect) => ({
          left: Number((((rect.left - layerRect.left) / layerRect.width) * 100).toFixed(4)),
          top: Number((((rect.top - layerRect.top) / layerRect.height) * 100).toFixed(4)),
          width: Number(((rect.width / layerRect.width) * 100).toFixed(4)),
          height: Number(((rect.height / layerRect.height) * 100).toFixed(4)),
        })),
      );
    }

    matches += 1;
    fromIndex = matchIndex + Math.max(lowerQuery.length, 1);
  }

  return rects;
};

const getPopupPosition = (anchorRect, popupWidth) => {
  const x = clamp(
    anchorRect.left + anchorRect.width / 2 - popupWidth / 2,
    POPUP_MARGIN,
    window.innerWidth - popupWidth - POPUP_MARGIN,
  );

  let y = anchorRect.top - POPUP_GAP;
  if (y < POPUP_MARGIN) {
    y = anchorRect.bottom + POPUP_GAP;
  }

  return { x, y };
};

const getHighlightAnchorRect = (highlight, pageRect) => {
  const firstRect = highlight?.rects?.[0];
  if (!firstRect || !pageRect?.width || !pageRect?.height) return null;

  const left = pageRect.left + (firstRect.left / 100) * pageRect.width;
  const top = pageRect.top + (firstRect.top / 100) * pageRect.height;
  const width = (firstRect.width / 100) * pageRect.width;
  const height = (firstRect.height / 100) * pageRect.height;

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
};

const findHighlightAtPoint = (highlights, pageRect, clientX, clientY) => {
  if (!pageRect?.width || !pageRect?.height) return null;
  if (
    clientX < pageRect.left ||
    clientX > pageRect.right ||
    clientY < pageRect.top ||
    clientY > pageRect.bottom
  ) {
    return null;
  }

  const x = ((clientX - pageRect.left) / pageRect.width) * 100;
  const y = ((clientY - pageRect.top) / pageRect.height) * 100;

  for (let index = highlights.length - 1; index >= 0; index -= 1) {
    const highlight = highlights[index];
    const match = highlight.rects.some((rect) => {
      return (
        x >= rect.left - HIGHLIGHT_HIT_TOLERANCE &&
        x <= rect.left + rect.width + HIGHLIGHT_HIT_TOLERANCE &&
        y >= rect.top - HIGHLIGHT_HIT_TOLERANCE &&
        y <= rect.top + rect.height + HIGHLIGHT_HIT_TOLERANCE
      );
    });

    if (match) return highlight;
  }

  return null;
};

const fetchDictionaryMeaning = async (word) => {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
  );

  if (!response.ok) {
    throw new Error('Definition unavailable');
  }

  const data = await response.json();
  const definition = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
  return definition ? truncate(definition, 180) : 'No definition found.';
};

const getDictionaryLookupTarget = (event, selection) => {
  if (selection && !selection.isCollapsed && selection.rangeCount) {
    const word = getSingleWord(selection.toString());
    if (word) {
      return {
        word,
        rect: selection.getRangeAt(0).getBoundingClientRect(),
      };
    }
  }

  const textNode = event.target.closest('.textLayer span');
  if (!textNode) return null;

  const word = getSingleWord(textNode.textContent);
  if (!word) return null;

  return {
    word,
    rect: textNode.getBoundingClientRect(),
  };
};

const Reader = () => {
  const {
    currentBookId,
    currentBookFile,
    currentPage,
    totalPages,
    setCurrentPage,
    setTotalPages,
    zoomLevel,
    isFocusMode,
    setFocusMode,
    displayMode,
    isSearchOpen,
    searchQuery,
    sessionReadingTime,
    incrementReadingTime,
    setSessionReadingTime,
    highlights,
    setHighlights,
    activePopup,
    setActivePopup,
    clearActivePopup,
    dictionaryCache,
    setDictionaryEntry,
  } = useStore();

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const pageLayerRef = useRef(null);
  const containerRef = useRef(null);
  const focusTimerRef = useRef(null);
  const isFocusRef = useRef(isFocusMode);
  const readingTimerRef = useRef(null);
  const isActiveRef = useRef(true);
  const clickTimerRef = useRef(null);
  const lookupRequestIdRef = useRef(0);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [searchRects, setSearchRects] = useState([]);

  const clearNativeSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount) {
      selection.removeAllRanges();
    }
  }, []);

  const clearTransientUi = useCallback(() => {
    lookupRequestIdRef.current += 1;
    setSelectionMenu(null);
    clearActivePopup();
    clearNativeSelection();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  }, [clearActivePopup, clearNativeSelection]);

  const persistHighlights = useCallback(
    async (nextHighlights) => {
      setHighlights(nextHighlights);
      if (!currentBookId) return nextHighlights;

      try {
        await saveHighlights(currentBookId, nextHighlights);
      } catch (error) {
        console.error('Highlight save error:', error);
      }

      return nextHighlights;
    },
    [currentBookId, setHighlights],
  );

  const createHighlightFromSelection = useCallback(
    (selection) => {
      if (!selection || selection.isCollapsed || !selection.rangeCount) return null;

      const range = selection.getRangeAt(0);
      if (!isRangeInsideNode(range, textLayerRef.current)) return null;

      const pageRect = pageLayerRef.current?.getBoundingClientRect();
      if (!pageRect?.width || !pageRect?.height) return null;

      const text = cleanText(selection.toString());
      if (!text) return null;

      const selectionRects = Array.from(range.getClientRects())
        .map((rect) => {
          const left = Math.max(rect.left, pageRect.left);
          const top = Math.max(rect.top, pageRect.top);
          const right = Math.min(rect.right, pageRect.right);
          const bottom = Math.min(rect.bottom, pageRect.bottom);
          const width = right - left;
          const height = bottom - top;

          return { left, top, right, bottom, width, height };
        })
        .filter((rect) => rect.width > 1 && rect.height > 1);

      const rects = selectionRects.map((rect) => ({
        left: Number((((rect.left - pageRect.left) / pageRect.width) * 100).toFixed(4)),
        top: Number((((rect.top - pageRect.top) / pageRect.height) * 100).toFixed(4)),
        width: Number(((rect.width / pageRect.width) * 100).toFixed(4)),
        height: Number(((rect.height / pageRect.height) * 100).toFixed(4)),
      }));

      if (!rects.length) return null;

      return {
        id: crypto.randomUUID(),
        page: currentPage,
        text,
        rects,
        note: null,
        createdAt: Date.now(),
      };
    },
    [currentPage],
  );

  const openNoteEditor = useCallback(
    (highlight) => {
      const pageRect = pageLayerRef.current?.getBoundingClientRect();
      const anchorRect = getHighlightAnchorRect(highlight, pageRect);
      if (!anchorRect) return;

      const position = getPopupPosition(anchorRect, NOTE_INPUT_WIDTH);
      setNoteDraft(highlight.note?.content || '');
      setActivePopup({
        type: 'note-edit',
        x: position.x,
        y: position.y,
        highlightId: highlight.id,
        noteContent: highlight.note?.content || '',
        text: highlight.text,
      });
    },
    [setActivePopup],
  );

  const openHighlightPopup = useCallback(
    (highlight) => {
      const pageRect = pageLayerRef.current?.getBoundingClientRect();
      const anchorRect = getHighlightAnchorRect(highlight, pageRect);
      if (!anchorRect) return;

      const popupWidth = highlight.note ? NOTE_POPUP_WIDTH : ACTION_POPUP_WIDTH;
      const position = getPopupPosition(anchorRect, popupWidth);

      if (highlight.note) {
        setActivePopup({
          type: 'note-view',
          x: position.x,
          y: position.y,
          highlightId: highlight.id,
          note: highlight.note.content,
          text: highlight.text,
        });
        return;
      }

      setActivePopup({
        type: 'highlight-action',
        x: position.x,
        y: position.y,
        highlightId: highlight.id,
      });
    },
    [setActivePopup],
  );

  const handleSaveNote = useCallback(async () => {
    if (!activePopup || activePopup.type !== 'note-edit') return;

    const content = noteDraft.trim();
    const nextHighlights = highlights.map((highlight) => {
      if (highlight.id !== activePopup.highlightId) return highlight;

      return {
        ...highlight,
        note: content
          ? {
            content,
            createdAt: highlight.note?.createdAt || Date.now(),
          }
          : null,
      };
    });

    await persistHighlights(nextHighlights);
    setNoteDraft('');
    clearActivePopup();
  }, [activePopup, clearActivePopup, highlights, noteDraft, persistHighlights]);

  const handleCreateHighlight = useCallback(
    async (color = 'white', openNoteEditorAfter = false) => {
      if (!selectionMenu?.highlight) return;

      const nextHighlight = { ...selectionMenu.highlight, color };
      await persistHighlights([...highlights, nextHighlight]);
      setSelectionMenu(null);
      clearNativeSelection();

      if (openNoteEditorAfter) {
        openNoteEditor(nextHighlight);
      }
    },
    [clearNativeSelection, highlights, openNoteEditor, persistHighlights, selectionMenu],
  );

  const handleChangeHighlightColor = useCallback(
    async (highlightId, color) => {
      const nextHighlights = highlights.map((h) =>
        h.id === highlightId ? { ...h, color } : h
      );
      await persistHighlights(nextHighlights);
    },
    [highlights, persistHighlights]
  );

  useEffect(() => {
    isFocusRef.current = isFocusMode;
  }, [isFocusMode]);

  useEffect(() => {
    document.body.classList.remove('mode-dim', 'mode-invert');
    if (displayMode === 'dim') document.body.classList.add('mode-dim');
    if (displayMode === 'invert') document.body.classList.add('mode-invert');
    return () => document.body.classList.remove('mode-dim', 'mode-invert');
  }, [displayMode]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!currentBookFile) {
        if (active) {
          setPdfDoc(null);
          setResumeData(null);
          setShowResume(false);
        }
        return;
      }

      try {
        const documentHandle = await loadPdfDocument(currentBookFile);
        if (!active) return;

        setPdfDoc(documentHandle);
        setTotalPages(documentHandle.numPages);

        const state = useStore.getState();
        if (state.currentPage > documentHandle.numPages) {
          state.setCurrentPage(1);
        }

        const book = state.library.find((entry) => entry.id === currentBookId);
        const shouldResume = Boolean(book && book.lastPage > 1 && book.status === 'reading');
        setResumeData(shouldResume ? book : null);
        setShowResume(shouldResume);
      } catch (error) {
        console.error('PDF load error:', error);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentBookFile, currentBookId, setTotalPages]);

  useEffect(() => {
    let active = true;

    if (!currentBookId) {
      setHighlights([]);
      return () => {
        active = false;
      };
    }

    setHighlights([]);

    (async () => {
      try {
        const savedHighlights = await loadHighlights(currentBookId);
        if (active) {
          setHighlights(Array.isArray(savedHighlights) ? savedHighlights : []);
        }
      } catch (error) {
        console.error('Highlight load error:', error);
        if (active) setHighlights([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentBookId, setHighlights]);

  useEffect(() => {
    (async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        await renderPdfPage(pdfDoc, currentPage, canvasRef.current, textLayerRef.current, zoomLevel);
      } catch (error) {
        console.error('Render error:', error);
      }
    })();

    if (currentBookId) {
      updateProgress(currentBookId, currentPage, totalPages).catch(console.error);
    }
  }, [currentBookId, currentPage, pdfDoc, totalPages, zoomLevel]);

  useEffect(() => {
    let frameId = null;
    const scheduleSearchRects = (nextRects) => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setSearchRects(nextRects);
      });
    };

    const textLayerNode = textLayerRef.current;
    if (!textLayerNode || !isSearchOpen || !cleanText(searchQuery || '')) {
      scheduleSearchRects([]);
      return () => {
        if (frameId) cancelAnimationFrame(frameId);
      };
    }

    const updateRects = () => {
      scheduleSearchRects(createSearchRects(textLayerRef.current, searchQuery));
    };

    updateRects();

    const observer = new MutationObserver(updateRects);
    observer.observe(textLayerNode, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', updateRects);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRects);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [currentPage, isSearchOpen, searchQuery, zoomLevel]);

  useEffect(() => {
    let rafId = null;
    let lastActivity = Date.now();

    const resetTimer = () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      if (isFocusRef.current) setFocusMode(false);
      focusTimerRef.current = setTimeout(() => setFocusMode(true), 2500);
    };

    const onMove = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const now = Date.now();
        if (now - lastActivity < 80) return;
        lastActivity = now;
        resetTimer();
      });
    };

    const onKey = () => {
      lastActivity = Date.now();
      resetTimer();
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onKey, { passive: true });
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onKey);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [setFocusMode]);

  useEffect(() => {
    setSessionReadingTime(0);
    isActiveRef.current = false;

    const onBlur = () => {
      isActiveRef.current = false;
    };
    const onFocus = () => {
      isActiveRef.current = true;
    };
    const onVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
    };

    let idleTimer = null;
    const markActive = () => {
      isActiveRef.current = true;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        isActiveRef.current = false;
      }, 60000);
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('mousemove', markActive, { passive: true });
    window.addEventListener('keydown', markActive);
    window.addEventListener('touchstart', markActive, { passive: true });

    markActive();

    readingTimerRef.current = setInterval(() => {
      if (isActiveRef.current) {
        incrementReadingTime();
      }
    }, 1000);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('mousemove', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('touchstart', markActive);
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
      if (idleTimer) clearTimeout(idleTimer);

      const time = useStore.getState().sessionReadingTime;
      const bookId = useStore.getState().currentBookId;
      if (bookId && time > 0) {
        updateReadingTime(bookId, time).catch(console.error);
      }
    };
  }, [currentBookId, incrementReadingTime, setSessionReadingTime]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (activePopup || selectionMenu) {
          event.preventDefault();
          clearTransientUi();
          return;
        }
      }

      const activeElement = document.activeElement;
      const isTyping =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;

      if (isTyping) return;
      if (isSearchOpen && event.key !== 'Escape') return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          if (useStore.getState().currentPage > 1) {
            useStore.getState().setCurrentPage(useStore.getState().currentPage - 1);
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          event.preventDefault();
          if (useStore.getState().currentPage < useStore.getState().totalPages) {
            useStore.getState().setCurrentPage(useStore.getState().currentPage + 1);
          }
          break;
        case 'f':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
          } else {
            document.exitFullscreen?.();
          }
          break;
        case 'd':
          useStore.getState().cycleDisplayMode();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePopup, clearTransientUi, isSearchOpen, selectionMenu]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => clearTransientUi());
    return () => cancelAnimationFrame(frame);
  }, [clearTransientUi, currentBookId, currentPage, zoomLevel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const hideTransientUi = () => clearTransientUi();
    container.addEventListener('scroll', hideTransientUi, { passive: true });
    window.addEventListener('resize', hideTransientUi);

    return () => {
      container.removeEventListener('scroll', hideTransientUi);
      window.removeEventListener('resize', hideTransientUi);
    };
  }, [clearTransientUi]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (
        event.target.closest('.reader-popup') ||
        event.target.closest('#reader-controls') ||
        event.target.closest('#search-overlay')
      ) {
        return;
      }

      if (activePopup?.type === 'note-edit') {
        return;
      }

      clearTransientUi();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [activePopup?.type, clearTransientUi]);

  useEffect(() => {
    const onDoubleClick = async (event) => {
      if (
        event.target.closest('.reader-popup') ||
        event.target.closest('#reader-controls') ||
        event.target.closest('#search-overlay')
      ) {
        return;
      }

      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      setSelectionMenu(null);

      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (range && !isRangeInsideNode(range, textLayerRef.current)) return;

      const target = getDictionaryLookupTarget(event, selection);
      if (!target) return;

      const lookupKey = target.word.toLowerCase();
      const position = getPopupPosition(target.rect, DICTIONARY_POPUP_WIDTH);
      const requestId = lookupRequestIdRef.current + 1;
      lookupRequestIdRef.current = requestId;

      setActivePopup({
        type: 'dictionary',
        x: position.x,
        y: position.y,
        word: target.word,
        meaning: dictionaryCache[lookupKey] || 'Looking up...',
      });

      try {
        const meaning = dictionaryCache[lookupKey] || (await fetchDictionaryMeaning(target.word));

        if (!dictionaryCache[lookupKey]) {
          setDictionaryEntry(lookupKey, meaning);
        }

        if (lookupRequestIdRef.current !== requestId) return;

        setActivePopup({
          type: 'dictionary',
          x: position.x,
          y: position.y,
          word: target.word,
          meaning,
        });
      } catch {
        if (lookupRequestIdRef.current !== requestId) return;

        const meaning = 'No definition found.';
        setDictionaryEntry(lookupKey, meaning);
        setActivePopup({
          type: 'dictionary',
          x: position.x,
          y: position.y,
          word: target.word,
          meaning,
        });
      }
    };

    document.addEventListener('dblclick', onDoubleClick);
    return () => document.removeEventListener('dblclick', onDoubleClick);
  }, [dictionaryCache, setActivePopup, setDictionaryEntry]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleReaderClick = useCallback(
    (event) => {
      const selection = window.getSelection();
      if (selection && cleanText(selection.toString())) return;

      const { clientX, clientY } = event;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }

      clickTimerRef.current = setTimeout(() => {
        const pageRect = pageLayerRef.current?.getBoundingClientRect();
        const highlight = findHighlightAtPoint(
          highlights.filter((entry) => entry.page === currentPage),
          pageRect,
          clientX,
          clientY,
        );

        if (!highlight) return;
        openHighlightPopup(highlight);
      }, HIGHLIGHT_CLICK_DELAY);
    },
    [currentPage, highlights, openHighlightPopup],
  );

  const handleReaderMouseUp = useCallback(
    (event) => {
      if (event.detail > 1) return;

      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          setSelectionMenu(null);
          return;
        }

        const range = selection.getRangeAt(0);
        if (!isRangeInsideNode(range, textLayerRef.current)) {
          setSelectionMenu(null);
          return;
        }

        const highlight = createHighlightFromSelection(selection);
        if (!highlight) {
          setSelectionMenu(null);
          return;
        }

        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }

        lookupRequestIdRef.current += 1;
        clearActivePopup();

        const position = getPopupPosition(range.getBoundingClientRect(), SELECTION_POPUP_WIDTH);
        setSelectionMenu({
          x: position.x,
          y: position.y,
          text: highlight.text,
          highlight,
        });
      });
    },
    [clearActivePopup, createHighlightFromSelection],
  );

  const pageHighlights = highlights.filter((highlight) => highlight.page === currentPage);
  const activeHighlightId = activePopup?.highlightId || null;
  const progressPct = totalPages > 1 ? (currentPage / totalPages) * 100 : 0;

  return (
    <div
      className="fullscreen"
      ref={containerRef}
      id="reader"
      style={{
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: isFocusMode ? 'none' : 'default',
        background: 'var(--bg)',
      }}
    >
      <div
        className="reader-page"
        ref={pageLayerRef}
        onClick={handleReaderClick}
        onMouseUp={handleReaderMouseUp}
        style={{ position: 'relative', willChange: 'transform' }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', background: '#fff' }} />
        <div ref={textLayerRef} className="textLayer" />
        {searchRects.length > 0 && (
          <div className="reader-search-layer">
            {searchRects.map((rect, index) => (
              <div
                key={`search-${index}`}
                className="reader-search-highlight"
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                }}
              />
            ))}
          </div>
        )}
        <HighlightLayer highlights={pageHighlights} activeHighlightId={activeHighlightId} />
      </div>

      <Controls isVisible={!isFocusMode} />
      <div className="progress-bar" style={{ width: `${progressPct}%` }} />
      <TimeIndicator visible={!isFocusMode} seconds={sessionReadingTime} />

      {activePopup?.type === 'dictionary' && (
        <DictionaryPopup
          meaning={activePopup.meaning}
          word={activePopup.word}
          x={activePopup.x}
          y={activePopup.y}
        />
      )}

      {selectionMenu && (
        <div
          className="reader-popup reader-selection-menu"
          style={{ left: `${selectionMenu.x}px`, top: `${selectionMenu.y}px` }}
        >
          <p className="selection-preview">{truncate(selectionMenu.text, 160)}</p>
          <div className="color-swatch-container">
            {SWATCH_COLORS.map((color) => (
              <div
                key={color}
                className={`color-swatch swatch-${color}`}
                onClick={() => handleCreateHighlight(color, false)}
              />
            ))}
          </div>
          <div className="reader-selection-actions" style={{ marginTop: 0, display: 'flex', gap: '8px' }}>
            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleCreateHighlight('white', true)}
            >
              Add note
            </button>
            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (selectionMenu.text && selectionMenu.text.length > 3) {
                  useStore.getState().setActivePopup({
                    type: 'ai-explain',
                    x: selectionMenu.x,
                    y: selectionMenu.y,
                    text: selectionMenu.text
                  });
                  setSelectionMenu(null);
                  clearNativeSelection();
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                color: 'white',
                border: 'none',
              }}
            >
              Explain
            </button>
          </div>
        </div>
      )}

      {activePopup?.type === 'ai-explain' && (
        <AiExplainPopup
          x={activePopup.x}
          y={activePopup.y}
          text={activePopup.text}
        />
      )}

      {activePopup?.type === 'ai-summary' && (
        <AiSummaryOverlay
          pdfDoc={pdfDoc}
          page={activePopup.page}
        />
      )}

      {activePopup?.type === 'highlight-action' && (
        <div
          className="reader-popup reader-action-popup"
          style={{ left: `${activePopup.x}px`, top: `${activePopup.y}px` }}
        >
          <div className="color-swatch-container" style={{ paddingBottom: '4px', marginBottom: '4px', gap: '6px' }}>
            {SWATCH_COLORS.map((color) => (
              <div
                key={color}
                className={`color-swatch swatch-${color}`}
                style={{ width: '14px', height: '14px' }}
                onClick={() => handleChangeHighlightColor(activePopup.highlightId, color)}
              />
            ))}
          </div>
          <button
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const highlight = highlights.find((entry) => entry.id === activePopup.highlightId);
              if (highlight) openNoteEditor(highlight);
            }}
          >
            Add note
          </button>
        </div>
      )}

      {activePopup?.type === 'note-view' && (
        <div
          className="reader-popup note-view-popup"
          style={{ left: `${activePopup.x}px`, top: `${activePopup.y}px` }}
        >
          <p className="reader-popup-title">{truncate(activePopup.text, 42)}</p>
          <p className="reader-popup-body">{activePopup.note}</p>
        </div>
      )}

      {activePopup?.type === 'note-edit' && (
        <div
          className="reader-popup note-box"
          style={{ left: `${activePopup.x}px`, top: `${activePopup.y}px` }}
        >
          <p className="reader-popup-title">{truncate(activePopup.text, 42)}</p>
          <textarea
            autoFocus
            className="note-input"
            placeholder="Add note..."
            value={noteDraft}
            onBlur={handleSaveNote}
            onChange={(event) => setNoteDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        </div>
      )}

      {isSearchOpen && <SearchOverlay pdfDoc={pdfDoc} />}

      {showResume && resumeData && (
        <ResumeOverlay
          book={resumeData}
          onResume={() => setShowResume(false)}
          onStartOver={() => {
            setCurrentPage(1);
            setShowResume(false);
          }}
        />
      )}
    </div>
  );
};

export default Reader;
