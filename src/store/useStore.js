import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Navigation State
  currentView: 'dashboard', // 'dashboard' | 'library' | 'reader'
  setCurrentView: (view) => set({ currentView: view }),

  // Reader State
  currentBookId: null,      // The ID of the open book
  currentBookFile: null,    // Base64/Blob or LocalForage reference (if loaded from disk)
  currentPage: 1,
  totalPages: 1,
  zoomLevel: 1.0,           // 0.5 to 3.0

  setCurrentBookId: (id) => set({ currentBookId: id }),
  setCurrentBookFile: (file) => set({ currentBookFile: file }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (total) => set({ totalPages: total }),
  
  zoomIn: () => set((state) => ({ zoomLevel: Math.min(state.zoomLevel + 0.25, 3.0) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.max(state.zoomLevel - 0.25, 0.5) })),
  resetZoom: () => set({ zoomLevel: 1.0 }),

  // Library State (metadata only, not files to avoid memory bloat)
  library: [], // Array of { id, title, uploadedAt, lastPage, coverDataUrl }
  setLibrary: (libraryData) => set({ library: libraryData }),

  // Notes & Highlights
  notes: [], // Array of { id, bookId, text, page, selectedText }
  setNotes: (notesData) => set({ notes: notesData }),
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),

  // Highlights
  highlights: [], // Array of { id, bookId, page, text, color, rects[], createdAt }
  setHighlights: (data) => set({ highlights: data }),
  addHighlight: (highlight) => set((state) => ({ 
    highlights: [...state.highlights, highlight] 
  })),
  removeHighlight: (highlightId) => set((state) => ({
    highlights: state.highlights.filter(h => h.id !== highlightId)
  })),

  // Get highlights for the current page
  getPageHighlights: () => {
    const { highlights, currentBookId, currentPage } = get();
    return highlights.filter(h => h.bookId === currentBookId && h.page === currentPage);
  },

  // Interaction State
  isFocusMode: true,
  setFocusMode: (isFocus) => set({ isFocusMode: isFocus }),
}));

export default useStore;
