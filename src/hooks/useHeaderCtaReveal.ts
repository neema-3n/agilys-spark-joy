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
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const target = headerCtaRef.current;

    if (!target) return;

    // Utiliser le conteneur scroll principal (main) pour fiabiliser la détection
    const scrollRoot = document.querySelector('main');

    const computeVisibility = () => {
      const rect = target.getBoundingClientRect();
      const rootRect = scrollRoot?.getBoundingClientRect();

      // Rect du viewport par défaut si aucun root spécifique n'est trouvé
      const viewportTop = rootRect?.top ?? 0;
      const viewportLeft = rootRect?.left ?? 0;
      const viewportHeight = rootRect?.height ?? window.innerHeight;
      const viewportWidth = rootRect?.width ?? window.innerWidth;

      const isIntersecting =
        rect.bottom > viewportTop &&
        rect.top < viewportTop + viewportHeight &&
        rect.right > viewportLeft &&
        rect.left < viewportLeft + viewportWidth;

      setIsHeaderCtaVisible(isIntersecting);
    };

    // Mesure initiale pour éviter les faux négatifs au montage
    computeVisibility();

    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            setIsHeaderCtaVisible(entry.isIntersecting);
          },
          { root: scrollRoot ?? null, threshold: 0 }
        )
      : null;

    observer?.observe(target);

    const scrollElement: HTMLElement | Window = scrollRoot ?? window;
    scrollElement.addEventListener('scroll', computeVisibility, { passive: true });
    window.addEventListener('resize', computeVisibility);

    return () => {
      observer?.disconnect();
      scrollElement.removeEventListener('scroll', computeVisibility);
      window.removeEventListener('resize', computeVisibility);
    };
  }, [headerCtaRef, ...observeDeps]);

  return { headerCtaRef, isHeaderCtaVisible };
}
