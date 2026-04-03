const DictionaryPopup = ({ word, meaning, x, y }) => {
  return (
    <div
      className="reader-popup dictionary-popup"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <p className="reader-popup-title">{word}</p>
      <p className="reader-popup-body">{meaning}</p>
    </div>
  );
};

export default DictionaryPopup;
