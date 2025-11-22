import { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';

interface ListPageLoadingProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  stickyHeader?: boolean;
  loadingText?: string;
}

export const ListPageLoading = ({
  title,
  description,
  actions,
  stickyHeader = false,
  loadingText = 'Chargement...',
}: ListPageLoadingProps) => {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} sticky={stickyHeader} actions={actions} />
      <p className="text-center text-muted-foreground">{loadingText}</p>
    </div>
  );
};
