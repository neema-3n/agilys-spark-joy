import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  scrollProgress?: number;
  sticky?: boolean;
}

export const PageHeader = ({ title, description, actions, scrollProgress = 0, sticky = true }: PageHeaderProps) => {
  const scale = 1 - (scrollProgress * 0.2);
  const opacity = 1 - scrollProgress;
  const translateY = -(scrollProgress * 20);

  return (
    <div 
      className={`${sticky ? 'sticky' : 'relative'} top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border`}
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity: opacity,
        transformOrigin: 'top center',
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
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
