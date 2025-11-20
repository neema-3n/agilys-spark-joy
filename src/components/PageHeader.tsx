import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  scrollProgress?: number;
}

export const PageHeader = ({ title, description, actions, scrollProgress = 0 }: PageHeaderProps) => {
  // Courbes non-linéaires pour un effet plus naturel et élégant
  const scale = 1 - (Math.pow(scrollProgress, 1.5) * 0.15);
  const opacity = 1 - scrollProgress;
  const translateY = -(scrollProgress * 30);
  const blur = scrollProgress * 2;
  
  // Les actions disparaissent plus vite que le titre
  const titleOpacity = 1 - (scrollProgress * 0.8);
  const descriptionOpacity = 1 - scrollProgress;
  const actionsOpacity = 1 - (scrollProgress * 1.2);

  return (
    <div 
      className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border"
      style={{
        transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
        opacity: opacity,
        filter: `blur(${blur}px)`,
        transformOrigin: 'top center',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform, opacity, filter',
        contain: 'layout style paint',
      }}
    >
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-start justify-between">
          <div style={{ opacity: titleOpacity }}>
            <h1 className="text-xl md:text-2xl font-bold mb-1">{title}</h1>
            {description && (
              <p className="text-sm md:text-base text-muted-foreground" style={{ opacity: descriptionOpacity }}>{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2" style={{ opacity: actionsOpacity }}>{actions}</div>}
        </div>
      </div>
    </div>
  );
};
