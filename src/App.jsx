import { useState, useEffect } from 'react';
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

  return (
    <>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'library' && <Library />}
      {currentView === 'reader' && <Reader />}
    </>
  );
}

export default App;
