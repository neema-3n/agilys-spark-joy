import { DependencyList, useEffect, useRef, useState } from 'react';

/**
 * Tracks whether the primary header CTA is visible and exposes a class/style
 * pair to reveal a secondary CTA when the header CTA scrolls out of view.
 */
export const CTA_REVEAL_STYLES = `
  @keyframes stickyCtaReveal {
    0% {
      filter: blur(10px);
      background: hsl(var(--background));
      color: hsl(var(--primary));
      box-shadow: none;
    }
    60% {
      filter: blur(3px);
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      box-shadow: var(--shadow-glow);
    }
    100% {
      filter: blur(0);
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      box-shadow: var(--shadow-primary);
    }
  }
  .sticky-cta-appear {
    animation: stickyCtaReveal 1.5s ease forwards;
    will-change: transform, filter;
  }
`;

export function useHeaderCtaReveal(observeDeps: DependencyList = []) {
  const [isHeaderCtaVisible, setIsHeaderCtaVisible] = useState(true);
  const headerCtaRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const target = headerCtaRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsHeaderCtaVisible(entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [headerCtaRef, ...observeDeps]);

  return { headerCtaRef, isHeaderCtaVisible };
}
