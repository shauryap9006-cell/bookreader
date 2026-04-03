import { useRef, useCallback, useEffect } from 'react';
import './BorderGlow.css';

function parseHSL(hslStr) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {
  const vars = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x) { return x * x * x; }

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }) {
  const t0 = performance.now() + delay;
  let rafId = null;
  let timeoutId = null;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;

    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);

    onUpdate(start + (end - start) * ease(t));

    if (t < 1) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    onEnd?.();
  };

  timeoutId = window.setTimeout(() => {
    if (!cancelled) {
      rafId = requestAnimationFrame(tick);
    }
  }, delay);

  return () => {
    cancelled = true;
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    if (rafId !== null) window.cancelAnimationFrame(rafId);
  };
}

const BorderGlow = ({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#060010',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1.0,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  fillOpacity = 0.5,
}) => {
  const cardRef = useRef(null);
  const isIntroAnimatingRef = useRef(false);

  const getCenterOfElement = useCallback((el) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getEdgeProximity = useCallback((el, x, y) => {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    let kx = Infinity;
    let ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }, [getCenterOfElement]);

  const getCursorAngle = useCallback((el, x, y) => {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const radians = Math.atan2(dy, dx);
    let degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  }, [getCenterOfElement]);

  const handlePointerMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card || isIntroAnimatingRef.current) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const edge = getEdgeProximity(card, x, y);
    const angle = getCursorAngle(card, x, y);

    card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, [getEdgeProximity, getCursorAngle]);

  const handlePointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card || isIntroAnimatingRef.current) return;

    card.style.setProperty('--edge-proximity', '0');
  }, []);

  useEffect(() => {
    if (!animated || !cardRef.current) return;

    const card = cardRef.current;
    const stopAnimations = [];
    const angleStart = 110;
    const angleMid = 290;
    const angleEnd = 470;

    isIntroAnimatingRef.current = true;
    card.classList.add('sweep-active');
    card.style.setProperty('--edge-proximity', '0');
    card.style.setProperty('--cursor-angle', `${angleStart}deg`);

    stopAnimations.push(
      animateValue({
        duration: 600,
        end: 100,
        onUpdate: (value) => {
          card.style.setProperty('--edge-proximity', `${value.toFixed(3)}`);
        },
      }),
    );

    stopAnimations.push(
      animateValue({
        duration: 1400,
        start: angleStart,
        end: angleMid,
        onUpdate: (value) => {
          card.style.setProperty('--cursor-angle', `${value.toFixed(3)}deg`);
        },
      }),
    );

    stopAnimations.push(
      animateValue({
        delay: 1400,
        duration: 1400,
        start: angleMid,
        end: angleEnd,
        onUpdate: (value) => {
          card.style.setProperty('--cursor-angle', `${value.toFixed(3)}deg`);
        },
      }),
    );

    stopAnimations.push(
      animateValue({
        ease: easeInCubic,
        delay: 2100,
        duration: 900,
        start: 100,
        end: 0,
        onUpdate: (value) => {
          card.style.setProperty('--edge-proximity', `${value.toFixed(3)}`);
        },
        onEnd: () => {
          isIntroAnimatingRef.current = false;
          card.classList.remove('sweep-active');
          card.style.setProperty('--cursor-angle', '45deg');
        },
      }),
    );

    return () => {
      isIntroAnimatingRef.current = false;
      stopAnimations.forEach((stop) => stop?.());
      card.classList.remove('sweep-active');
      card.style.setProperty('--edge-proximity', '0');
      card.style.setProperty('--cursor-angle', '45deg');
    };
  }, [animated]);

  const glowVars = buildGlowVars(glowColor, glowIntensity);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`border-glow-card ${className}`}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': edgeSensitivity,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': coneSpread,
        '--fill-opacity': fillOpacity,
        ...glowVars,
        ...buildGradientVars(colors),
      }}
    >
      <span className="edge-light" />
      <div className="border-glow-inner">
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;
