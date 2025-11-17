import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useBonsCommande } from '@/hooks/useBonsCommande';
import { useEngagements } from '@/hooks/useEngagements';
import { BonCommandeStats } from '@/components/bonsCommande/BonCommandeStats';
import { BonCommandeTable } from '@/components/bonsCommande/BonCommandeTable';
import { BonCommandeDialog } from '@/components/bonsCommande/BonCommandeDialog';
import { AnnulerBCDialog } from '@/components/bonsCommande/AnnulerBCDialog';
import { ReceptionnerBCDialog } from '@/components/bonsCommande/ReceptionnerBCDialog';
import { BonCommande, CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';
import type { Engagement } from '@/types/engagement.types';

const BonsCommande = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [receptionnerDialogOpen, setReceptionnerDialogOpen] = useState(false);
  const [selectedBonCommande, setSelectedBonCommande] = useState<BonCommande | undefined>();
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const {
    bonsCommande,
    isLoading,
    createBonCommande,
    updateBonCommande,
    deleteBonCommande,
    genererNumero,
    validerBonCommande,
    mettreEnCours,
    receptionnerBonCommande,
    annulerBonCommande,
  } = useBonsCommande();

  const { engagements } = useEngagements();

  // Gérer la création depuis un engagement via query param
  useEffect(() => {
    const engagementId = searchParams.get('from_engagement');
    if (engagementId && engagements.length > 0 && !dialogOpen) {
      const engagement = engagements.find(e => e.id === engagementId);
      if (engagement && engagement.statut === 'valide') {
        setSelectedEngagement(engagement);
        setDialogOpen(true);
        setSearchParams({});
      }
    }
  }, [searchParams, engagements, dialogOpen, setSearchParams]);

  const handleEdit = (bonCommande: BonCommande) => {
    setSelectedBonCommande(bonCommande);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedBonCommande(undefined);
    setSelectedEngagement(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedBonCommande(undefined);
      setSelectedEngagement(undefined);
    }
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

  const handleValider = async (id: string) => {
    await validerBonCommande(id);
  };

  const handleMettreEnCours = async (id: string) => {
    await mettreEnCours(id);
  };

  const handleReceptionner = (id: string) => {
    const bc = bonsCommande.find(b => b.id === id);
    if (bc) {
      setSelectedBonCommande(bc);
      setReceptionnerDialogOpen(true);
    }
  };

  const handleReceptionnerConfirm = async (dateLivraisonReelle: string) => {
    if (selectedBonCommande) {
      await receptionnerBonCommande({ id: selectedBonCommande.id, date: dateLivraisonReelle });
      setSelectedBonCommande(undefined);
    }
  };

  const handleAnnuler = (id: string) => {
    const bc = bonsCommande.find(b => b.id === id);
    if (bc) {
      setSelectedBonCommande(bc);
      setAnnulerDialogOpen(true);
    }
  };

  const handleAnnulerConfirm = async (motif: string) => {
    if (selectedBonCommande) {
      await annulerBonCommande({ id: selectedBonCommande.id, motif });
      setSelectedBonCommande(undefined);
    }
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
          onValider={handleValider}
          onMettreEnCours={handleMettreEnCours}
          onReceptionner={handleReceptionner}
          onAnnuler={handleAnnuler}
          onDelete={handleDelete}
        />
      </div>

      <BonCommandeDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        bonCommande={selectedBonCommande}
        selectedEngagement={selectedEngagement}
        onSubmit={handleSubmit}
        onGenererNumero={genererNumero}
      />

      <AnnulerBCDialog
        open={annulerDialogOpen}
        onOpenChange={setAnnulerDialogOpen}
        bonCommandeNumero={selectedBonCommande?.numero || ''}
        onConfirm={handleAnnulerConfirm}
      />

      <ReceptionnerBCDialog
        open={receptionnerDialogOpen}
        onOpenChange={setReceptionnerDialogOpen}
        bonCommandeNumero={selectedBonCommande?.numero || ''}
        onConfirm={handleReceptionnerConfirm}
      />
    </div>
  );
};

export default BonsCommande;
