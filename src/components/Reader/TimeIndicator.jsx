/**
 * TIME INDICATOR — Subtle reading time display.
 * Only visible when controls are shown.
 * Format: Xm or Xh Xm
 */
const TimeIndicator = ({ visible, seconds }) => {
  const format = (s) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  return (
    <div className={`time-indicator ${visible ? 'visible' : ''}`} id="time-indicator">
      {format(seconds)}
    </div>
  );
};

export default TimeIndicator;
