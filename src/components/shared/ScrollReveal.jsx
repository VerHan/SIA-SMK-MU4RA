/* ============================================================
   ScrollReveal.jsx — Reusable Scroll-Triggered Motion Component
   Ringan, 60fps, bertenaga IntersectionObserver & CSS Transform
   ============================================================ */

import { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal Component
 * @param {'slide-left' | 'slide-right' | 'slide-up' | 'zoom' | 'fade'} animation
 * @param {number} delay - delay in milliseconds (e.g. 100, 200, 300)
 * @param {number} duration - animation duration in ms (default: 1000)
 * @param {number} threshold - visibility threshold to trigger (0 to 1, default: 0.15)
 * @param {boolean} once - trigger only once (default: true)
 */
export default function ScrollReveal({
  children,
  animation = 'slide-left',
  delay = 0,
  duration = 1350,
  threshold = 0.12,
  once = true,
  className = '',
  style = {},
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef(null);

  useEffect(() => {
    // Respect user's motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once && domRef.current) {
              observer.unobserve(domRef.current);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const currentRef = domRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, once]);

  const animationClass = {
    'slide-left': 'reveal-slide-left',
    'slide-right': 'reveal-slide-right',
    'slide-up': 'reveal-slide-up',
    'zoom': 'reveal-zoom',
    'fade': 'reveal-fade',
  }[animation] || 'reveal-slide-left';

  return (
    <div
      ref={domRef}
      className={`reveal-item ${animationClass} ${isVisible ? 'is-visible' : ''} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
