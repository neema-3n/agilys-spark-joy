import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  scrollProgress?: number;
}

export const PageHeader = ({ title, description, actions, scrollProgress = 0 }: PageHeaderProps) => {
  const scale = 1 - (scrollProgress * 0.2);
  const opacity = 1 - (scrollProgress * 1.5);
  const blur = scrollProgress * 6;
  const translateY = -(scrollProgress * 120); // Pousse le header beaucoup plus haut
  const zIndex = 10;

  return (
    <div 
      className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border transition-all duration-200 ease-out"
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity: Math.max(0, opacity),
        filter: `blur(${blur}px)`,
        transformOrigin: 'top center',
        zIndex,
      }}
    >
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-1">{title}</h1>
            {description && (
              <p className="text-sm md:text-base text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
};
