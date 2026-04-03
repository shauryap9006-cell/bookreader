/**
 * RESUME OVERLAY — Shown when returning to a book in progress.
 * Offers: Continue reading (resume) or Start from beginning.
 */
const ResumeOverlay = ({ book, onResume, onStartOver }) => {
  return (
    <div className="resume-overlay" id="resume-overlay">
      <div className="resume-card">
        <p className="resume-title">{book.title}</p>
        <p className="resume-page">
          You were on page {book.lastPage}
          {book.totalPages ? ` of ${book.totalPages}` : ''}
        </p>
        <div className="resume-actions">
          <button className="resume-btn" onClick={onStartOver}>
            Start over
          </button>
          <button className="resume-btn primary" onClick={onResume}>
            Continue reading &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeOverlay;
