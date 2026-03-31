import React, { useState } from 'react';
import useStore from '../store/useStore';
import { loadBookFile, deleteBookFromLibrary } from '../utils/storage';
import { ArrowLeft, Book, Trash2 } from 'lucide-react';

const Library = () => {
  const { setCurrentView, setCurrentBookId, setCurrentBookFile, setCurrentPage, library, setLibrary } = useStore();
  const [loadingBookId, setLoadingBookId] = useState(null);

  const handleDeleteBook = async (e, bookId) => {
    e.stopPropagation();
    if (window.confirm('Delete this book from the library?')) {
      try {
        const updatedLibrary = await deleteBookFromLibrary(bookId);
        setLibrary(updatedLibrary);
      } catch (err) {
        console.error('Failed to delete book:', err);
        alert('Failed to delete book.');
      }
    }
  };

  const handleOpenBook = async (book) => {
    try {
      setLoadingBookId(book.id);
      
      const fileData = await loadBookFile(book.id);
      
      setCurrentBookId(book.id);
      setCurrentBookFile(fileData);
      setCurrentPage(book.lastPage || 1);
      
      setCurrentView('reader');
    } catch (err) {
      console.error('Failed to load book from storage:', err);
      alert('Failed to open book. It may be corrupted or deleted.');
    } finally {
      setLoadingBookId(null);
    }
  };

  return (
    <div className="fade-in" style={{ padding: 'var(--spacing-5)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
        <button className="action-link" onClick={() => setCurrentView('dashboard')}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div style={{ flex: 1 }} />
        <h2 className="section-text" style={{ textTransform: 'lowercase', letterSpacing: '0.05em' }}>library</h2>
      </header>
      
      {library.length === 0 ? (
        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <p className="body-text" style={{ color: 'var(--text-secondary)' }}>No books yet</p>
          <button className="action-link" onClick={() => setCurrentView('dashboard')}>
            Upload your first book &rarr;
          </button>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: 'var(--spacing-5)',
            alignItems: 'start'
          }}
        >
          {library.map((book) => (
            <div 
              key={book.id} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
                cursor: 'pointer',
                opacity: loadingBookId === book.id ? 0.5 : 1,
              }}
              onClick={() => handleOpenBook(book)}
            >
              <div 
                style={{ 
                  aspectRatio: '1 / 1.4', 
                  backgroundColor: '#111', 
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative'
                }}
              >
                <Book size={32} color="var(--text-secondary)" />
                <button
                  onClick={(e) => handleDeleteBook(e, book.id)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '4px',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ff4444'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div>
                <p className="body-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {book.title}
                </p>
                <p className="small-text">Page {book.lastPage || 1}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
