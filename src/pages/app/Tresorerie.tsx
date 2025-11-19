import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

const Tresorerie = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion de Trésorerie"
        description="Tableau de flux et prévisions"
      />
      
      <div className="px-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Construction className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Module en construction</h3>
                <p className="text-muted-foreground">
                  Le module de gestion de trésorerie sera développé prochainement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Tresorerie;
