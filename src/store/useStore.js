import { create } from 'zustand';

const useStore = create((set, get) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),

  currentBookId: null,
  currentBookFile: null,
  currentPage: 1,
  totalPages: 1,
  zoomLevel: 1.0,

  setCurrentBookId: (id) => set({ currentBookId: id }),
  setCurrentBookFile: (file) => set({ currentBookFile: file }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (total) => set({ totalPages: total }),
  zoomIn: () => set((state) => ({ zoomLevel: Math.min(state.zoomLevel + 0.25, 3.0) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.max(state.zoomLevel - 0.25, 0.5) })),
  resetZoom: () => set({ zoomLevel: 1.0 }),

  library: [],
  setLibrary: (library) => set({ library }),

  displayMode: 'normal',
  setDisplayMode: (mode) => set({ displayMode: mode }),
  cycleDisplayMode: () => {
    const modes = ['normal', 'dim', 'invert'];
    const index = modes.indexOf(get().displayMode);
    set({ displayMode: modes[(index + 1) % modes.length] });
  },

  isFocusMode: true,
  setFocusMode: (value) => set({ isFocusMode: value }),

  sessionReadingTime: 0,
  setSessionReadingTime: (time) => set({ sessionReadingTime: time }),
  incrementReadingTime: () =>
    set((state) => ({ sessionReadingTime: state.sessionReadingTime + 1 })),

  isSearchOpen: false,
  setSearchOpen: (value) => set({ isSearchOpen: value }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),
  searchIndex: -1,
  setSearchIndex: (index) => set({ searchIndex: index }),
  clearSearchState: () =>
    set({
      isSearchOpen: false,
      searchQuery: '',
      searchResults: [],
      searchIndex: -1,
    }),

  highlights: [],
  setHighlights: (highlights) => set({ highlights }),

  activePopup: null,
  setActivePopup: (popup) => set({ activePopup: popup }),
  clearActivePopup: () => set({ activePopup: null }),

  dictionaryCache: {},
  setDictionaryEntry: (word, meaning) =>
    set((state) => ({
      dictionaryCache: { ...state.dictionaryCache, [word]: meaning },
    })),

  summaryCache: {},
  setSummaryCache: (page, summary) =>
    set((state) => ({
      summaryCache: { ...state.summaryCache, [page]: summary }
    })),
}));

export default useStore;
