import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  scrollProgress?: number;
  sticky?: boolean;
}

export const PageHeader = ({
  title,
  description,
  actions,
  scrollProgress = 0,
  sticky = true,
}: PageHeaderProps) => {
  const scale = 1 - (scrollProgress * 0.2);
  const opacity = 1 - (scrollProgress * 1.5);
  const blur = scrollProgress * 6;
  const translateY = -(scrollProgress * 120); // Pousse le header beaucoup plus haut
  const zIndex = 10;

  return (
    <section
      className={
        sticky
          ? '-mt-5 sticky top-0 z-20 -mx-4 mb-5 border-b border-border bg-background/95 px-4 backdrop-blur transition-all duration-200 ease-out supports-[backdrop-filter]:bg-background/80 sm:-mx-5 sm:px-5 lg:-mt-7 lg:-mx-8 lg:px-8'
          : '-mt-5 mb-5 border-b border-border bg-background lg:-mt-7'
      }
      style={
        sticky
          ? {
              transform: `translateY(${translateY}px) scale(${scale})`,
              opacity: Math.max(0, opacity),
              filter: `blur(${blur}px)`,
              transformOrigin: 'top center',
              zIndex,
            }
          : undefined
      }
    >
      <div className="py-5 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="h-1 w-10 rounded-full bg-primary" />
            <h1 className="truncate text-2xl font-semibold tracking-normal md:text-[28px]">
              {title}
            </h1>
            {description && (
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </section>
  );
};
