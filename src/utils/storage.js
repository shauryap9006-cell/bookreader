import localforage from 'localforage';

// Configure instances to separate metadata from heavy PDF blobs
const pdfStore = localforage.createInstance({
  name: 'UltraMinimalReader',
  storeName: 'pdf_blobs',
  description: 'Stores raw PDF binary data'
});

const metaStore = localforage.createInstance({
  name: 'UltraMinimalReader',
  storeName: 'metadata',
  description: 'Stores library books list and progress'
});

const highlightStore = localforage.createInstance({
  name: 'UltraMinimalReader',
  storeName: 'highlights',
  description: 'Stores text highlights per book'
});

/**
 * Save a new PDF to local storage
 * @param {File} file 
 * @param {string} title 
 * @returns {Object} Library item
 */
export const saveBookToLibrary = async (file, title) => {
  const id = crypto.randomUUID();
  const fileData = await file.arrayBuffer();
  
  // Store the heavy blob
  await pdfStore.setItem(id, fileData);

  // Store metadata
  const newBook = {
    id,
    title,
    lastPage: 1,
    uploadedAt: Date.now()
  };

  const existingLibrary = await metaStore.getItem('library') || [];
  const updatedLibrary = [newBook, ...existingLibrary];
  
  await metaStore.setItem('library', updatedLibrary);

  return newBook;
};

/**
 * Load just the library metadata 
 */
export const loadLibrary = async () => {
  return await metaStore.getItem('library') || [];
};

/**
 * Load the PDF file for a specific book ID
 */
export const loadBookFile = async (id) => {
  const arrayBuffer = await pdfStore.getItem(id);
  if (!arrayBuffer) throw new Error('Book not found in storage');
  
  // Convert ArrayBuffer back to an array for PDF.js compatibility
  return new Uint8Array(arrayBuffer);
};

/**
 * Update the last read page for a book
 */
export const updateProgress = async (id, pageNumber) => {
  const library = await metaStore.getItem('library') || [];
  const updated = library.map(book => 
    book.id === id ? { ...book, lastPage: pageNumber } : book
  );
  await metaStore.setItem('library', updated);
  return updated; // Return updated state
};

/**
 * Delete a book and its content from local storage
 */
export const deleteBookFromLibrary = async (id) => {
  // Remove blob
  await pdfStore.removeItem(id);
  
  // Remove metadata
  const library = await metaStore.getItem('library') || [];
  const updated = library.filter(book => book.id !== id);
  await metaStore.setItem('library', updated);
  return updated;
};

/**
 * Save highlights for a book
 */
export const saveHighlights = async (bookId, highlights) => {
  await highlightStore.setItem(bookId, highlights);
};

/**
 * Load highlights for a book
 */
export const loadHighlights = async (bookId) => {
  return await highlightStore.getItem(bookId) || [];
};

/**
 * Delete all highlights for a book
 */
export const deleteHighlightsForBook = async (bookId) => {
  await highlightStore.removeItem(bookId);
};
