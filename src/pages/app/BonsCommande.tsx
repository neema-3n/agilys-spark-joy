import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useBonsCommande } from '@/hooks/useBonsCommande';
import { BonCommandeStats } from '@/components/bonsCommande/BonCommandeStats';
import { BonCommandeTable } from '@/components/bonsCommande/BonCommandeTable';
import { BonCommandeDialog } from '@/components/bonsCommande/BonCommandeDialog';
import { BonCommande, CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';

const BonsCommande = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBonCommande, setSelectedBonCommande] = useState<BonCommande | undefined>();
  
  const {
    bonsCommande,
    isLoading,
    createBonCommande,
    updateBonCommande,
    deleteBonCommande,
    genererNumero,
  } = useBonsCommande();

  const handleEdit = (bonCommande: BonCommande) => {
    setSelectedBonCommande(bonCommande);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedBonCommande(undefined);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateBonCommandeInput | UpdateBonCommandeInput) => {
    if (selectedBonCommande) {
      await updateBonCommande({ id: selectedBonCommande.id, data });
    } else {
      await createBonCommande(data as CreateBonCommandeInput);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteBonCommande(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bons de Commande"
        description="Création et suivi des bons de commande"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau BC
          </Button>
        }
      />

      <div className="px-8 space-y-6">
        <BonCommandeStats bonsCommande={bonsCommande} />
        <BonCommandeTable
          bonsCommande={bonsCommande}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <BonCommandeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bonCommande={selectedBonCommande}
        onSubmit={handleSubmit}
        onGenererNumero={genererNumero}
      />
    </div>
  );
};

export default BonsCommande;
