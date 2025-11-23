import { Fournisseur } from '@/types/fournisseur.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { BaseSnapshotProps } from '@/types/snapshot.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Building2, MapPin, FileText, CreditCard, User } from 'lucide-react';
import { formatMontant, formatDate } from '@/lib/snapshot-utils';

interface FournisseurSnapshotProps extends BaseSnapshotProps {
  fournisseur: Fournisseur;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getStatutBadge = (statut: string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    actif: { variant: 'default', label: 'Actif' },
    inactif: { variant: 'secondary', label: 'Inactif' },
    blackliste: { variant: 'destructive', label: 'Blacklisté' },
    en_attente_validation: { variant: 'outline', label: 'En attente' },
  };
  const config = variants[statut] || variants.actif;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const getTypeFournisseurLabel = (type: string) => {
  return type === 'personne_physique' ? 'Personne physique' : 'Personne morale';
};

export const FournisseurSnapshot = ({
  fournisseur,
  onEdit,
  onDelete,
  ...snapshotProps
}: FournisseurSnapshotProps) => {
  const actions = (
    <div className="flex gap-2">
      {onEdit && (
        <Button onClick={onEdit} variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      )}
      {onDelete && fournisseur.nombreEngagements === 0 && (
        <Button onClick={onDelete} variant="outline" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      )}
    </div>
  );

  return (
    <SnapshotBase
      title={fournisseur.nom}
      subtitle={`Fournisseur ${fournisseur.code}`}
      statusBadge={getStatutBadge(fournisseur.statut)}
      actions={actions}
      {...snapshotProps}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Montant total engagé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMontant(fournisseur.montantTotalEngage)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nombre d'engagements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fournisseur.nombreEngagements}</div>
          </CardContent>
        </Card>
      </div>

      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-muted-foreground">Code</div>
            <div className="font-medium">{fournisseur.code}</div>
            <div className="text-muted-foreground">Nom complet</div>
            <div className="font-medium">{fournisseur.nom}</div>
            <div className="text-muted-foreground">Nom court</div>
            <div>{fournisseur.nomCourt || '-'}</div>
            <div className="text-muted-foreground">Type</div>
            <div>{getTypeFournisseurLabel(fournisseur.typeFournisseur)}</div>
            <div className="text-muted-foreground">Catégorie</div>
            <div>{fournisseur.categorie || '-'}</div>
            <div className="text-muted-foreground">Statut</div>
            <div>{getStatutBadge(fournisseur.statut)}</div>
            <div className="text-muted-foreground">Date première collaboration</div>
            <div>{formatDate(fournisseur.datePremiereCollaboration)}</div>
            <div className="text-muted-foreground">Dernier engagement</div>
            <div>{formatDate(fournisseur.dernierEngagementDate)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Coordonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Coordonnées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-muted-foreground">Email</div>
            <div>{fournisseur.email || '-'}</div>
            <div className="text-muted-foreground">Téléphone</div>
            <div>{fournisseur.telephone || '-'}</div>
            <div className="text-muted-foreground">Mobile</div>
            <div>{fournisseur.telephoneMobile || '-'}</div>
            <div className="text-muted-foreground">Site web</div>
            <div>{fournisseur.siteWeb || '-'}</div>
            <div className="text-muted-foreground">Adresse</div>
            <div>{fournisseur.adresse || '-'}</div>
            <div className="text-muted-foreground">Ville</div>
            <div>{fournisseur.ville || '-'}</div>
            <div className="text-muted-foreground">Pays</div>
            <div>{fournisseur.pays || '-'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Informations légales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informations légales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-muted-foreground">Numéro contribuable</div>
            <div>{fournisseur.numeroContribuable || '-'}</div>
            <div className="text-muted-foreground">Registre de commerce</div>
            <div>{fournisseur.registreCommerce || '-'}</div>
            <div className="text-muted-foreground">Forme juridique</div>
            <div>{fournisseur.formeJuridique || '-'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Informations bancaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informations bancaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-muted-foreground">Banque</div>
            <div>{fournisseur.banque || '-'}</div>
            <div className="text-muted-foreground">Numéro de compte</div>
            <div>{fournisseur.numeroCompte || '-'}</div>
            <div className="text-muted-foreground">Code SWIFT</div>
            <div>{fournisseur.codeSwift || '-'}</div>
            <div className="text-muted-foreground">IBAN</div>
            <div>{fournisseur.iban || '-'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Informations commerciales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informations commerciales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-muted-foreground">Conditions de paiement</div>
            <div>{fournisseur.conditionsPaiement || '-'}</div>
            <div className="text-muted-foreground">Délai de livraison moyen</div>
            <div>{fournisseur.delaiLivraisonMoyen ? `${fournisseur.delaiLivraisonMoyen} jours` : '-'}</div>
            <div className="text-muted-foreground">Note d'évaluation</div>
            <div>{fournisseur.noteEvaluation ? `${fournisseur.noteEvaluation}/5` : '-'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Contact principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact principal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-muted-foreground">Nom</div>
            <div>{fournisseur.contactNom || '-'}</div>
            <div className="text-muted-foreground">Prénom</div>
            <div>{fournisseur.contactPrenom || '-'}</div>
            <div className="text-muted-foreground">Fonction</div>
            <div>{fournisseur.contactFonction || '-'}</div>
            <div className="text-muted-foreground">Email</div>
            <div>{fournisseur.contactEmail || '-'}</div>
            <div className="text-muted-foreground">Téléphone</div>
            <div>{fournisseur.contactTelephone || '-'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Commentaires */}
      {fournisseur.commentaires && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Commentaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{fournisseur.commentaires}</p>
          </CardContent>
        </Card>
      )}
    </SnapshotBase>
  );
};
