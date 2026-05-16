import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ListLayoutProps {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
}

export const ListLayout = ({ title, description, toolbar, children, footer, actions }: ListLayoutProps) => {
  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
      <CardHeader className="space-y-4 border-b border-border bg-muted/25 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {toolbar}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
      {footer && <CardContent className="border-t bg-muted/20 px-4 py-4 md:px-6">{footer}</CardContent>}
    </Card>
  );
};
