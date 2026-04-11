import { useMemo, useRef } from 'react';
import HeroScrollZoom from './HeroScrollZoom';
import useStore from '../store/useStore';
import { loadLibrary, saveBookToLibrary } from '../utils/storage';
import GradientText from './GradientText';

const quotes = [
  { text: 'He who has a why to live can bear almost any how.', author: 'Friedrich Nietzsche' },
  { text: 'You have power over your mind — not outside events.', author: 'Marcus Aurelius' },
  { text: 'What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'We suffer more in imagination than in reality.', author: 'Seneca' },
  { text: 'The cave you fear to enter holds the treasure you seek.', author: 'Joseph Campbell' },
  { text: 'Knowing yourself is the beginning of all wisdom.', author: 'Aristotle' },
  { text: 'Discipline equals freedom.', author: 'Jocko Willink' },
  { text: 'Man is condemned to be free.', author: 'Jean-Paul Sartre' },
  {
    text: 'It is not death that a man should fear, but never beginning to live.',
    author: 'Marcus Aurelius',
  },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Turn your wounds into wisdom.', author: 'Oprah Winfrey' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates' },
  { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
  { text: 'Happiness depends upon ourselves.', author: 'Aristotle' },
  {
    text: 'A man who conquers himself is greater than one who conquers a thousand men.',
    author: 'Buddha',
  },
  { text: 'You become what you believe.', author: 'Oprah Winfrey' },
  {
    text: 'Everything you’ve ever wanted is on the other side of fear.',
    author: 'George Addair',
  },
  { text: 'The best way out is always through.', author: 'Robert Frost' },
  { text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
];

const HERO_VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4';

const Dashboard = () => {
  const { setCurrentView, setCurrentBookId, setCurrentBookFile, setCurrentPage, setLibrary } =
    useStore();
  const fileRef = useRef(null);

  const quote = useMemo(() => {
    const index = Math.floor(Math.random() * quotes.length);
    return quotes[index];
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    try {
      const title = file.name.replace(/\.pdf$/i, '');
      const newBook = await saveBookToLibrary(file, title);
      const library = await loadLibrary();
      setLibrary(library);

      const buffer = await file.arrayBuffer();
      setCurrentBookId(newBook.id);
      setCurrentBookFile(new Uint8Array(buffer));
      setCurrentPage(1);
      setCurrentView('reader');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <>
      <HeroScrollZoom
        backgroundWord="READER"
        badge="SCROLL TO DISCOVER"
        headline={
          <GradientText
            colors={['#a4a8b6ff', '#fdf5f5ff', '#8d94f8ff']}
            animationSpeed={10}
            showBorder={false}
          >
            {`“${quote.text}”`}
          </GradientText>
        }
        body={`— ${quote.author}`}
        secondaryLabel="Library"
        primaryLabel="Upload Book"
        onSecondaryClick={() => setCurrentView('library')}
        onPrimaryClick={() => fileRef.current?.click()}
        videoSrc={HERO_VIDEO_SRC}
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
    </>
  );
};

export default Dashboard;
