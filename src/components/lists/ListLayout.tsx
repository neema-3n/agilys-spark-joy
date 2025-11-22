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
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {toolbar}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
      {footer && <CardContent className="border-t bg-muted/20 px-6 py-4">{footer}</CardContent>}
    </Card>
  );
};
