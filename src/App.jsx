import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import useStore from './store/useStore';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import Reader from './components/Reader/Reader';
import { loadLibrary } from './utils/storage';

function App() {
  const { currentView, setLibrary } = useStore();
  const [ready, setReady] = useState(false);

  // Initialize library from storage
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const lib = await loadLibrary();
        if (active) setLibrary(lib);
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, [setLibrary]);

  // Ctrl+F intercept → open search (only in reader)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const { currentView, setSearchOpen } = useStore.getState();
        if (currentView === 'reader') {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!ready) return <div className="fullscreen" style={{ background: '#000' }} />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'library': return <Library />;
      case 'reader': return <Reader />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#000' }}>
      <AnimatePresence>
        <motion.div
          key={currentView}
          initial={{ scale: 1.1, opacity: 0, filter: 'blur(6px)' }}
          animate={{
            scale: 1,
            opacity: 1,
            filter: 'blur(0px)',
            transition: {
              delay: 0.2,
              duration: 0.5,
              ease: [0.25, 1, 0.5, 1]
            }
          }}
          exit={{
            scale: 0.88,
            opacity: 0,
            filter: 'blur(6px)',
            transition: {
              duration: 0.5,
              ease: [0.25, 1, 0.5, 1]
            }
          }}
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'center center',
            zIndex: currentView === 'reader' ? 10 : 1, // Optional: keep reader on top if needed
          }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


export default App;


