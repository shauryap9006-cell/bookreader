import React, { useRef } from 'react';
import useStore from '../store/useStore';
import { saveBookToLibrary } from '../utils/storage';
import { BookOpen, Upload } from 'lucide-react';
import DecryptedText from './DecryptedText';
import BorderGlow from './BorderGlow';
import Galaxy from './Galaxy';

const Dashboard = () => {
  const { setCurrentView, setCurrentBookId, setCurrentBookFile, setLibrary } = useStore();
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      try {
        const title = file.name.replace('.pdf', '');
        
        // Save to IndexedDB
        const newBook = await saveBookToLibrary(file, title);
        
        // Fetch fresh library
        const { loadLibrary } = await import('../utils/storage');
        const updatedLibrary = await loadLibrary();
        setLibrary(updatedLibrary);

        // Load into Reader
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        
        setCurrentBookId(newBook.id);
        setCurrentBookFile(pdfData);
        setCurrentView('reader');
      } catch (err) {
        console.error('Error loading PDF:', err);
        alert('Failed to load PDF.');
      }
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  return (
    <div className="fullscreen fade-in dashboard-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <Galaxy 
          mouseRepulsion={false}
          mouseInteraction={false}
          density={1.8}
          glowIntensity={0.3}
          saturation={0}
          hueShift={230}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          repulsionStrength={2}
          autoCenterRepulsion={0}
          starSpeed={0.2}
          speed={2}
        />
      </div>

      <div className="flex-center" style={{ position: 'relative', zIndex: 1, flexDirection: 'column', gap: 'var(--spacing-5)', height: '100%' }}>
        <BorderGlow
          edgeSensitivity={0}
          glowColor="40 80 80"
          backgroundColor="#000000"
          borderRadius={30}
          glowRadius={60}
          glowIntensity={1.5}
          coneSpread={30}
          animated
          colors={['#c084fc', '#f472b6', '#38bdf8']}
        >
          <div style={{ padding: 'var(--spacing-4) var(--spacing-6)' }}>
            <h1 
              className="hero-text" 
              style={{ textTransform: 'lowercase', letterSpacing: '0.05em', cursor: 'default', margin: 0 }}
            >
              <DecryptedText
                text="reader"
                speed={60}
                maxIterations={15}
                characters="abcdefghijklmnopqrstuvwxyz"
                animateOn="hover"
                parentClassName="decrypted-title"
                encryptedClassName="encrypted-char"
                className="revealed-char"
              />
            </h1>
          </div>
        </BorderGlow>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <button 
            className="action-link"
            onClick={() => fileInputRef.current.click()}
          >
            <Upload size={18} />
            Upload Book &rarr;
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="application/pdf"
            onChange={handleFileUpload} 
          />
          
          <button 
            className="action-link"
            onClick={() => setCurrentView('library')}
          >
            <BookOpen size={18} />
            Library &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
