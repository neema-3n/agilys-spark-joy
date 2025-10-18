import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExercicesManager } from '@/components/parametres/ExercicesManager';
import { EnveloppesManager } from '@/components/parametres/EnveloppesManager';
import { StructureManager } from '@/components/parametres/StructureManager';

const Parametres = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
        <p className="text-muted-foreground">
          Configuration de l'application
        </p>
      </div>

      <Tabs defaultValue="exercices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="exercices">Exercices Budgétaires</TabsTrigger>
          <TabsTrigger value="enveloppes">Enveloppes & Financement</TabsTrigger>
          <TabsTrigger value="structure">Structure Organisationnelle</TabsTrigger>
          <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          <TabsTrigger value="general">Général</TabsTrigger>
        </TabsList>

        <TabsContent value="exercices">
          <ExercicesManager />
        </TabsContent>

        <TabsContent value="enveloppes">
          <EnveloppesManager />
        </TabsContent>

        <TabsContent value="structure">
          <StructureManager />
        </TabsContent>

        <TabsContent value="utilisateurs">
          <div className="text-muted-foreground">
            Module de gestion des utilisateurs à venir
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="text-muted-foreground">
            Paramètres généraux à venir
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Parametres;
