import { useEffect, useRef, useState, useCallback } from 'react';
import useStore from '../../store/useStore';

const MAX_RESULTS = 60;
const MAX_MATCHES_PER_PAGE = 5;
const SNIPPET_RADIUS = 40;

const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();

const buildSnippet = (text, matchIndex, queryLength) => {
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(text.length, matchIndex + queryLength + SNIPPET_RADIUS);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${normalizeText(text.slice(start, end))}${suffix}`;
};

const SearchOverlay = ({ pdfDoc }) => {
  const {
    setCurrentPage,
    totalPages,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchIndex,
    setSearchIndex,
    clearSearchState,
  } = useStore();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const cacheRef = useRef({});
  const searchTokenRef = useRef(0);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    cacheRef.current = {};
  }, [pdfDoc]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        clearSearchState();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSearchState]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const getPageText = useCallback(async (pageNum) => {
    if (cacheRef.current[pageNum]) return cacheRef.current[pageNum];
    if (!pdfDoc) return '';

    try {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const text = normalizeText(content.items.map((item) => item.str).join(' '));
      cacheRef.current[pageNum] = text;
      return text;
    } catch {
      return '';
    }
  }, [pdfDoc]);

  const doSearch = useCallback(async (value) => {
    const nextQuery = value.trim();
    const searchToken = searchTokenRef.current + 1;
    searchTokenRef.current = searchToken;

    if (!nextQuery || !pdfDoc) {
      setSearchResults([]);
      setSearchIndex(-1);
      setSearching(false);
      return;
    }

    setSearching(true);
    const lowerQuery = nextQuery.toLowerCase();
    const found = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
      const text = await getPageText(pageNum);
      if (searchTokenRef.current !== searchToken) return;

      const lowerText = text.toLowerCase();
      let fromIndex = 0;
      let pageMatches = 0;

      while (pageMatches < MAX_MATCHES_PER_PAGE && found.length < MAX_RESULTS) {
        const matchIndex = lowerText.indexOf(lowerQuery, fromIndex);
        if (matchIndex === -1) break;

        found.push({
          id: `${pageNum}-${matchIndex}-${pageMatches}`,
          page: pageNum,
          snippet: buildSnippet(text, matchIndex, nextQuery.length),
        });

        pageMatches += 1;
        fromIndex = matchIndex + Math.max(lowerQuery.length, 1);
      }

      if (found.length >= MAX_RESULTS) break;
    }

    if (searchTokenRef.current !== searchToken) return;

    setSearchResults(found);
    setSearchIndex(found.length > 0 ? 0 : -1);
    if (found.length > 0) {
      setCurrentPage(found[0].page);
    }
    setSearching(false);
  }, [getPageText, pdfDoc, setCurrentPage, setSearchIndex, setSearchResults, totalPages]);

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 250);
  };

  const goToResult = (index) => {
    if (index < 0 || index >= searchResults.length) return;
    setSearchIndex(index);
    setCurrentPage(searchResults[index].page);
  };

  const goNext = () => {
    if (searchResults.length === 0) return;
    const next = (searchIndex + 1) % searchResults.length;
    goToResult(next);
  };

  const goPrev = () => {
    if (searchResults.length === 0) return;
    const prev = (searchIndex - 1 + searchResults.length) % searchResults.length;
    goToResult(prev);
  };

  const handleSubmit = () => {
    if (searching || searchResults.length === 0) return;
    goToResult(searchIndex >= 0 ? searchIndex : 0);
    clearSearchState();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="search-shell" id="search-overlay">
      <div className="search-overlay">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search in book..."
          spellCheck={false}
        />

        {searchQuery && (
          <span className="search-count">
            {searching ? '...' : searchResults.length === 0 ? 'No results' : `${searchIndex + 1}/${searchResults.length}`}
          </span>
        )}

        {searchResults.length > 1 && (
          <>
            <button onClick={goPrev} title="Previous">Prev</button>
            <button onClick={goNext} title="Next">Next</button>
          </>
        )}

        <button onClick={clearSearchState} title="Close" style={{ marginLeft: 'var(--space-2)' }}>
          Close
        </button>
      </div>

      {searchQuery && (
        <div className="search-results">
          {searching && <div className="search-results-empty">Searching...</div>}

          {!searching && searchResults.length === 0 && (
            <div className="search-results-empty">No matches found for "{searchQuery}".</div>
          )}

          {!searching && searchResults.length > 0 && (
            searchResults.map((result, index) => (
              <button
                key={result.id}
                className={`search-result-item ${index === searchIndex ? 'active' : ''}`}
                onClick={() => goToResult(index)}
                title={`Page ${result.page}`}
              >
                <span className="search-result-page">Page {result.page}</span>
                <span className="search-result-snippet">{result.snippet}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchOverlay;
