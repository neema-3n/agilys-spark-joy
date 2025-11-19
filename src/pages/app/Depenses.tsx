import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

const Depenses = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Dépenses"
        description="Module en cours de définition"
      />
      
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Construction className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Module en construction</h3>
              <p className="text-muted-foreground">
                Le contenu de ce module sera défini ultérieurement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Depenses;
