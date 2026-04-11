import React, { useEffect, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import Lenis from 'lenis';
import { WebGLShader } from '@/components/ui/web-gl-shader';

type HeroScrollZoomProps = {
  backgroundWord?: string;
  badge?: string;
  body: string;
  eyebrow?: string;
  headline: React.ReactNode;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
  posterSrc?: string;
  primaryLabel: string;
  secondaryLabel: string;
  videoSrc: string;
};

function useSmoothScroll(
  wrapperRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!enabled || !wrapper || !content) return undefined;

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.16,
      smoothWheel: true,
    });

    let frameId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    frameId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [contentRef, enabled, wrapperRef]);
}

export default function HeroScrollZoom({
  backgroundWord,
  badge = 'Now available',
  body,
  eyebrow,
  headline,
  onPrimaryClick,
  onSecondaryClick,
  posterSrc,
  primaryLabel,
  secondaryLabel,
  videoSrc,
}: HeroScrollZoomProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useSmoothScroll(scrollRef, containerRef, !prefersReducedMotion);

  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 30,
    restDelta: 0.0005,
  });

  const scale = useTransform(smooth, [0, 0.35, 1], [0.34, 0.34, 1]);
  const mediaY = useTransform(smooth, [0, 0.35, 1], [180, 0, 0]);
  const radius = useTransform(smooth, [0, 0.35, 1], [24, 24, 0]);
  const overlayOpacity = useTransform(smooth, [0, 0.6, 1], [0, 0.15, 0.52]);
  const backdropWordOpacity = useTransform(smooth, [0, 0.18, 0.42, 0.62], [0.8, 0.72, 0.4, 0]);
  const backdropWordY = useTransform(smooth, [0, 0.6], [-68, -96]);
  const backdropWordScale = useTransform(smooth, [0, 0.6], [1, 1.08]);
  const textOpacity = useTransform(smooth, [0.68, 1], [0, 1]);
  const textY = useTransform(smooth, [0.68, 1], [36, 0]);
  const badgeOpacity = useTransform(smooth, [0, 0.3], [1, 0]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .hz-scroll-shell {
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: #080808;
          scrollbar-width: none;
          -ms-overflow-style: none;
          overscroll-behavior: none;
        }

        .hz-scroll-shell::-webkit-scrollbar {
          display: none;
        }

        .hz-btn-outline,
        .hz-btn-solid {
          padding: 11px 28px;
          border-radius: 999px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition:
            background 0.25s ease,
            border-color 0.25s ease,
            color 0.25s ease,
            transform 0.15s ease;
        }

        .hz-btn-outline {
          border: 1.5px solid rgba(255, 255, 255, 0.55);
          background: transparent;
          color: #fff;
        }

        .hz-btn-outline:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.85);
        }

        .hz-btn-solid {
          border: none;
          background: #fff;
          color: #0a0a0a;
          font-weight: 500;
        }

        .hz-btn-solid:hover {
          background: #e8e8e8;
          transform: scale(1.02);
        }

        .hz-btn-outline:focus-visible,
        .hz-btn-solid:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.88);
          outline-offset: 3px;
        }

        @media (max-width: 640px) {
          .hz-btn-outline,
          .hz-btn-solid {
            width: 100%;
          }
        }
      `}</style>

      <div ref={scrollRef} className="hz-scroll-shell">
        <div ref={containerRef} style={{ height: '300vh', background: '#080808' }}>
          <div
            style={{
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                background:
                  'radial-gradient(circle at top, rgba(22, 39, 72, 0.28), transparent 48%), #040404',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.50,
                }}
              >
                <WebGLShader />
              </div>
            </div>

            {backgroundWord ? (
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: 0,
                  opacity: prefersReducedMotion ? 0.3 : backdropWordOpacity,
                  y: prefersReducedMotion ? -68 : backdropWordY,
                  scale: prefersReducedMotion ? 1 : backdropWordScale,
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 'clamp(88px, 19vw, 260px)',
                    fontWeight: 500,
                    letterSpacing: '0.22em',
                    paddingLeft: '0.22em',
                    lineHeight: 0.9,
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.08)',
                    textShadow: '0 0 36px rgba(255,255,255,0.08)',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {backgroundWord}
                </span>
              </motion.div>
            ) : null}

            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                scale: prefersReducedMotion ? 1 : scale,
                y: prefersReducedMotion ? 0 : mediaY,
                borderRadius: prefersReducedMotion ? 0 : radius,
                overflow: 'hidden',
                transformOrigin: 'center center',
                pointerEvents: 'none',
                zIndex: 1,
                willChange: 'transform',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transformOrigin: 'center center',
                }}
              >
                <video
                  src={videoSrc}
                  poster={posterSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>

              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to bottom, rgba(0,0,0,0.22), rgba(0,0,0,0.44) 55%, rgba(0,0,0,0.68))',
                  opacity: prefersReducedMotion ? 0.48 : overlayOpacity,
                  pointerEvents: 'none',
                }}
              />
            </motion.div>

            <motion.div
              style={{
                position: 'absolute',
                top: 32,
                left: '50%',
                x: '-50%',
                opacity: prefersReducedMotion ? 0 : badgeOpacity,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#d2f8dd',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.75)',
                  letterSpacing: '0.06em',
                }}
              >
                {badge}
              </span>
            </motion.div>

            <motion.div
              style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                x: '-50%',
                y: prefersReducedMotion ? 0 : textY,
                translateY: '-50%',
                opacity: prefersReducedMotion ? 1 : textOpacity,
                textAlign: 'center',
                zIndex: 10,
                width: 'min(720px, calc(100vw - 24px))',
                paddingInline: '18px',
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            >
              {eyebrow ? (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: '0.18em',
                    color: 'rgba(255,255,255,0.55)',
                    textTransform: 'uppercase',
                    margin: '0 0 14px',
                  }}
                >
                  {eyebrow}
                </p>
              ) : null}

              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 'clamp(38px, 5vw, 68px)',
                  fontWeight: 300,
                  fontStyle: 'italic',
                  color: '#fff',
                  margin: '0 0 18px',
                  lineHeight: 1.12,
                  textWrap: 'balance',
                  overflow: 'visible',
                }}
              >
                {headline}
              </h1>

              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  fontWeight: 300,
                  color: 'rgba(255,255,255,0.68)',
                  margin: '0 auto 32px',
                  lineHeight: 1.7,
                  maxWidth: 380,
                }}
              >
                {body}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'center',
                  pointerEvents: 'all',
                  flexWrap: 'wrap',
                }}
              >
                <button className="hz-btn-outline" onClick={onSecondaryClick}>
                  {secondaryLabel}
                </button>
                <button className="hz-btn-solid" onClick={onPrimaryClick}>
                  {primaryLabel}
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
}
