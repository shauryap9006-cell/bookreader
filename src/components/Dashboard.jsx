import { useMemo, useRef } from 'react';

import GradientText from './GradientText';
import TextCursor from './TextCursor';
import useStore from '../store/useStore';
import { saveBookToLibrary, loadLibrary } from '../utils/storage';

const quotes = [
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "You have power over your mind \u2014 not outside events.", author: "Marcus Aurelius" },
  { text: "What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "We suffer more in imagination than in reality.", author: "Seneca" },
  { text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "Man is condemned to be free.", author: "Jean-Paul Sartre" },
  { text: "It is not death that a man should fear, but never beginning to live.", author: "Marcus Aurelius" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Happiness depends upon ourselves.", author: "Aristotle" },
  { text: "A man who conquers himself is greater than one who conquers a thousand men.", author: "Buddha" },
  { text: "You become what you believe.", author: "Oprah Winfrey" },
  { text: "Everything you\u2019ve ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "The best way out is always through.", author: "Robert Frost" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" }
];

const Dashboard = () => {
  const { setCurrentView, setCurrentBookId, setCurrentBookFile, setCurrentPage, setLibrary } = useStore();
  const fileRef = useRef(null);
  const quote = useMemo(() => {
    const index = Math.floor(Math.random() * quotes.length);
    return quotes[index];
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    try {
      const title = file.name.replace(/\.pdf$/i, '');
      const newBook = await saveBookToLibrary(file, title);
      const lib = await loadLibrary();
      setLibrary(lib);

      const buf = await file.arrayBuffer();
      setCurrentBookId(newBook.id);
      setCurrentBookFile(new Uint8Array(buf));
      setCurrentPage(1);
      setCurrentView('reader');
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className="fullscreen flex-center fade-in dashboard-shell" id="dashboard">
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '110%',
          height: '100%',
          objectFit: 'contain',
          zIndex: -10,
          pointerEvents: 'none',
        }}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
      />
      <div className="dashboard-cursor-layer">
        <TextCursor
          text="♡"
          spacing={80}
          followMouseDirection
          randomFloat
          exitDuration={0.3}
          removalInterval={20}
          maxPoints={10}
        />
      </div>

      <div className="dashboard-content">
        <div className="quote-glow">
            <div className="quote-container">
              <h1 className="quote-heading">
                <GradientText
                  colors={['#cf4e17', '#9effc0', '#6f793e']}
                  animationSpeed={8}
                  showBorder={false}
                  className="quote-text"
                >
                  &ldquo;{quote.text}&rdquo;
                </GradientText>
              </h1>
              <p className="quote-author">&mdash; {quote.author}</p>
            </div>
        </div>

        <button
          id="upload-book-btn"
          className="action-link"
          onClick={() => fileRef.current.click()}
        >
          Upload Book &rarr;
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />

        <button
          id="library-btn"
          className="action-link"
          onClick={() => setCurrentView('library')}
        >
          Library &rarr;
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
