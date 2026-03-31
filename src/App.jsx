import { useState, useEffect } from 'react';
import useStore from './store/useStore';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import Reader from './components/Reader/Reader';
import TextCursor from './components/TextCursor';
import { loadLibrary } from './utils/storage';

function App() {
  const { currentView, setLibrary } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize Library from localforage on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cachedLibrary = await loadLibrary();
        if (mounted && cachedLibrary) {
          setLibrary(cachedLibrary);
        }
      } catch (err) {
        console.error('Error loading library:', err);
      } finally {
        if (mounted) setIsInitializing(false);
      }
    })();
    return () => { mounted = false; };
  }, [setLibrary]);

  if (isInitializing) {
    return <div className="fullscreen flex-center" style={{ backgroundColor: '#000' }} />
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'library':
        return <Library />;
      case 'reader':
        return <Reader />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <TextCursor
        text="♡"
        spacing={80}
        followMouseDirection
        randomFloat
        exitDuration={0.3}
        removalInterval={20}
        maxPoints={10}
      />
      {renderView()}
    </>
  );
}

export default App;
