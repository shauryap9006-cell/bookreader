import localforage from 'localforage';

const pdfStore = localforage.createInstance({
  name: 'MinimalReader',
  storeName: 'pdf_blobs',
});

const metaStore = localforage.createInstance({
  name: 'MinimalReader',
  storeName: 'metadata',
});

const getHighlightsKey = (bookId) => `highlights:${bookId}`;

export const saveBookToLibrary = async (file, title) => {
  const id = crypto.randomUUID();
  const fileData = await file.arrayBuffer();

  await pdfStore.setItem(id, fileData);

  const newBook = {
    id,
    title,
    lastPage: 1,
    totalPages: 0,
    readingTime: 0,
    status: 'not_started',
    uploadedAt: Date.now(),
  };

  const library = (await metaStore.getItem('library')) || [];
  await metaStore.setItem('library', [newBook, ...library]);

  return newBook;
};

export const loadLibrary = async () => {
  return (await metaStore.getItem('library')) || [];
};

export const loadBookFile = async (id) => {
  const buffer = await pdfStore.getItem(id);
  if (!buffer) throw new Error('Book not found');
  return new Uint8Array(buffer);
};

export const updateProgress = async (id, pageNumber, totalPages) => {
  const library = (await metaStore.getItem('library')) || [];
  const updated = library.map((book) => {
    if (book.id !== id) return book;

    let status = book.status;
    if (status === 'not_started' && pageNumber > 1) status = 'reading';
    if (totalPages && pageNumber >= totalPages) status = 'completed';

    return { ...book, lastPage: pageNumber, totalPages: totalPages || book.totalPages, status };
  });

  await metaStore.setItem('library', updated);
  return updated;
};

export const updateReadingTime = async (id, seconds) => {
  const library = (await metaStore.getItem('library')) || [];
  const updated = library.map((book) =>
    book.id === id ? { ...book, readingTime: (book.readingTime || 0) + seconds } : book,
  );

  await metaStore.setItem('library', updated);
  return updated;
};

export const loadHighlights = async (bookId) => {
  if (!bookId) return [];
  return (await metaStore.getItem(getHighlightsKey(bookId))) || [];
};

export const saveHighlights = async (bookId, highlights) => {
  if (!bookId) return [];
  await metaStore.setItem(getHighlightsKey(bookId), highlights);
  return highlights;
};

export const deleteBookFromLibrary = async (id) => {
  await pdfStore.removeItem(id);
  await metaStore.removeItem(getHighlightsKey(id));

  const library = (await metaStore.getItem('library')) || [];
  const updated = library.filter((book) => book.id !== id);
  await metaStore.setItem('library', updated);

  return updated;
};
