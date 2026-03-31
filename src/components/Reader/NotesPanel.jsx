import React, { useState } from 'react';
import useStore from '../../store/useStore';
import { PanelRightClose, PanelRightOpen, Plus, Trash2 } from 'lucide-react';

const NotesPanel = () => {
  const { notes, addNote, currentBookId, currentPage } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const currentBookNotes = notes.filter(n => n.bookId === currentBookId);

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    addNote({
      id: crypto.randomUUID(),
      bookId: currentBookId,
      text: newNoteText.trim(),
      page: currentPage,
      createdAt: Date.now()
    });
    setNewNoteText('');
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        className="action-link"
        style={{
          position: 'fixed',
          top: 'var(--spacing-3)',
          right: 'var(--spacing-3)',
          zIndex: 300,
          background: 'rgba(0,0,0,0.5)',
          padding: 'var(--spacing-1)',
          borderRadius: '4px'
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Notes Panel"
      >
        {isOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
      </button>

      {/* Slide Out Panel */}
      <div 
        className="glass-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '320px',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-in-out',
          zIndex: 250,
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--spacing-4)',
        }}
      >
        <h3 className="section-text" style={{ marginTop: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)' }}>Notes</h3>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          {currentBookNotes.length === 0 ? (
            <p className="small-text" style={{ fontStyle: 'italic' }}>No notes yet.</p>
          ) : (
            currentBookNotes.map(note => (
              <div key={note.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'var(--spacing-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-1)' }}>
                  <span className="small-text">Page {note.page}</span>
                </div>
                <p className="body-text">{note.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Add Note Input */}
        <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
          <textarea 
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Add a thought..."
            rows={3}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-inter)',
              padding: 'var(--spacing-2)',
              resize: 'none',
              outline: 'none',
              borderRadius: '4px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <button 
            onClick={handleAddNote}
            style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '4px', opacity: newNoteText ? 1 : 0.5 }}
            disabled={!newNoteText.trim()}
          >
            <Plus size={16} /> Save
          </button>
        </div>
      </div>
    </>
  );
};

export default NotesPanel;
