import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

export interface SnapshotLinkedEntityItem {
  key: string;
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
}

interface SnapshotLinkedEntitiesCardProps {
  title?: string;
  items: Array<SnapshotLinkedEntityItem | null | undefined>;
  emptyMessage?: string;
}

export const SnapshotLinkedEntitiesCard = ({
  title = 'Entités liées',
  items,
  emptyMessage = 'Aucune entité liée.',
}: SnapshotLinkedEntitiesCardProps) => {
  const resolvedItems = items.filter((item): item is SnapshotLinkedEntityItem => Boolean(item));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {resolvedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {resolvedItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                disabled={!item.onClick}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                  item.onClick
                    ? 'cursor-pointer hover:bg-muted/50'
                    : 'cursor-default bg-muted/20'
                }`}
              >
                <span className="mt-0.5 text-muted-foreground">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <div className="font-medium">{item.value}</div>
                  {item.description ? (
                    <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
