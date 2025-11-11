import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Fournisseur, TypeFournisseur, StatutFournisseur } from '@/types/fournisseur.types';

interface FournisseurDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  fournisseur?: Fournisseur;
}

export const FournisseurDialog = ({ open, onOpenChange, onSubmit, fournisseur }: FournisseurDialogProps) => {
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    nomCourt: '',
    typeFournisseur: 'personne_morale' as TypeFournisseur,
    categorie: '',
    email: '',
    telephone: '',
    telephoneMobile: '',
    adresse: '',
    ville: '',
    pays: '',
    siteWeb: '',
    numeroContribuable: '',
    registreCommerce: '',
    formeJuridique: '',
    banque: '',
    numeroCompte: '',
    codeSwift: '',
    iban: '',
    conditionsPaiement: '',
    delaiLivraisonMoyen: '',
    noteEvaluation: '',
    statut: 'actif' as StatutFournisseur,
    datePremiereCollaboration: '',
    contactNom: '',
    contactPrenom: '',
    contactFonction: '',
    contactEmail: '',
    contactTelephone: '',
    commentaires: '',
  });

  useEffect(() => {
    if (open) {
      if (fournisseur) {
        setFormData({
          code: fournisseur.code,
          nom: fournisseur.nom,
          nomCourt: fournisseur.nomCourt || '',
          typeFournisseur: fournisseur.typeFournisseur,
          categorie: fournisseur.categorie || '',
          email: fournisseur.email || '',
          telephone: fournisseur.telephone || '',
          telephoneMobile: fournisseur.telephoneMobile || '',
          adresse: fournisseur.adresse || '',
          ville: fournisseur.ville || '',
          pays: fournisseur.pays || '',
          siteWeb: fournisseur.siteWeb || '',
          numeroContribuable: fournisseur.numeroContribuable || '',
          registreCommerce: fournisseur.registreCommerce || '',
          formeJuridique: fournisseur.formeJuridique || '',
          banque: fournisseur.banque || '',
          numeroCompte: fournisseur.numeroCompte || '',
          codeSwift: fournisseur.codeSwift || '',
          iban: fournisseur.iban || '',
          conditionsPaiement: fournisseur.conditionsPaiement || '',
          delaiLivraisonMoyen: fournisseur.delaiLivraisonMoyen?.toString() || '',
          noteEvaluation: fournisseur.noteEvaluation?.toString() || '',
          statut: fournisseur.statut,
          datePremiereCollaboration: fournisseur.datePremiereCollaboration || '',
          contactNom: fournisseur.contactNom || '',
          contactPrenom: fournisseur.contactPrenom || '',
          contactFonction: fournisseur.contactFonction || '',
          contactEmail: fournisseur.contactEmail || '',
          contactTelephone: fournisseur.contactTelephone || '',
          commentaires: fournisseur.commentaires || '',
        });
      } else {
        setFormData({
          code: '',
          nom: '',
          nomCourt: '',
          typeFournisseur: 'personne_morale',
          categorie: '',
          email: '',
          telephone: '',
          telephoneMobile: '',
          adresse: '',
          ville: '',
          pays: '',
          siteWeb: '',
          numeroContribuable: '',
          registreCommerce: '',
          formeJuridique: '',
          banque: '',
          numeroCompte: '',
          codeSwift: '',
          iban: '',
          conditionsPaiement: '',
          delaiLivraisonMoyen: '',
          noteEvaluation: '',
          statut: 'actif',
          datePremiereCollaboration: '',
          contactNom: '',
          contactPrenom: '',
          contactFonction: '',
          contactEmail: '',
          contactTelephone: '',
          commentaires: '',
        });
      }
    }
  }, [open, fournisseur]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = {
      code: formData.code,
      nom: formData.nom,
      typeFournisseur: formData.typeFournisseur,
      statut: formData.statut,
    };

    if (formData.nomCourt) payload.nomCourt = formData.nomCourt;
    if (formData.categorie) payload.categorie = formData.categorie;
    if (formData.email) payload.email = formData.email;
    if (formData.telephone) payload.telephone = formData.telephone;
    if (formData.telephoneMobile) payload.telephoneMobile = formData.telephoneMobile;
    if (formData.adresse) payload.adresse = formData.adresse;
    if (formData.ville) payload.ville = formData.ville;
    if (formData.pays) payload.pays = formData.pays;
    if (formData.siteWeb) payload.siteWeb = formData.siteWeb;
    if (formData.numeroContribuable) payload.numeroContribuable = formData.numeroContribuable;
    if (formData.registreCommerce) payload.registreCommerce = formData.registreCommerce;
    if (formData.formeJuridique) payload.formeJuridique = formData.formeJuridique;
    if (formData.banque) payload.banque = formData.banque;
    if (formData.numeroCompte) payload.numeroCompte = formData.numeroCompte;
    if (formData.codeSwift) payload.codeSwift = formData.codeSwift;
    if (formData.iban) payload.iban = formData.iban;
    if (formData.conditionsPaiement) payload.conditionsPaiement = formData.conditionsPaiement;
    if (formData.delaiLivraisonMoyen) payload.delaiLivraisonMoyen = parseInt(formData.delaiLivraisonMoyen);
    if (formData.noteEvaluation) payload.noteEvaluation = parseFloat(formData.noteEvaluation);
    if (formData.datePremiereCollaboration) payload.datePremiereCollaboration = formData.datePremiereCollaboration;
    if (formData.contactNom) payload.contactNom = formData.contactNom;
    if (formData.contactPrenom) payload.contactPrenom = formData.contactPrenom;
    if (formData.contactFonction) payload.contactFonction = formData.contactFonction;
    if (formData.contactEmail) payload.contactEmail = formData.contactEmail;
    if (formData.contactTelephone) payload.contactTelephone = formData.contactTelephone;
    if (formData.commentaires) payload.commentaires = formData.commentaires;

    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {fournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="general" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="coordonnees">Coordonnées</TabsTrigger>
              <TabsTrigger value="legal">Légal</TabsTrigger>
              <TabsTrigger value="bancaire">Bancaire</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="general" className="space-y-4 mt-4 h-full">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nomCourt">Nom court</Label>
                  <Input
                    id="nomCourt"
                    value={formData.nomCourt}
                    onChange={(e) => setFormData({ ...formData, nomCourt: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="typeFournisseur">Type *</Label>
                  <Select
                    value={formData.typeFournisseur}
                    onValueChange={(value: TypeFournisseur) =>
                      setFormData({ ...formData, typeFournisseur: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personne_physique">Personne physique</SelectItem>
                      <SelectItem value="personne_morale">Personne morale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="categorie">Catégorie</Label>
                  <Input
                    id="categorie"
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    placeholder="Ex: Prestataire de service"
                  />
                </div>
                <div>
                  <Label htmlFor="statut">Statut *</Label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value: StatutFournisseur) =>
                      setFormData({ ...formData, statut: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="en_attente_validation">En attente validation</SelectItem>
                      <SelectItem value="blackliste">Blacklisté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="datePremiereCollaboration">Date première collaboration</Label>
                  <Input
                    id="datePremiereCollaboration"
                    type="date"
                    value={formData.datePremiereCollaboration}
                    onChange={(e) => setFormData({ ...formData, datePremiereCollaboration: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="conditionsPaiement">Conditions de paiement</Label>
                  <Input
                    id="conditionsPaiement"
                    value={formData.conditionsPaiement}
                    onChange={(e) => setFormData({ ...formData, conditionsPaiement: e.target.value })}
                    placeholder="Ex: 30 jours"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="commentaires">Commentaires</Label>
                <Textarea
                  id="commentaires"
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="coordonnees" className="space-y-4 mt-4 h-full">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="telephoneMobile">Téléphone mobile</Label>
                  <Input
                    id="telephoneMobile"
                    value={formData.telephoneMobile}
                    onChange={(e) => setFormData({ ...formData, telephoneMobile: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="siteWeb">Site web</Label>
                  <Input
                    id="siteWeb"
                    value={formData.siteWeb}
                    onChange={(e) => setFormData({ ...formData, siteWeb: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="adresse">Adresse</Label>
                <Textarea
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pays">Pays</Label>
                  <Input
                    id="pays"
                    value={formData.pays}
                    onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="legal" className="space-y-4 mt-4 h-full">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroContribuable">Numéro contribuable</Label>
                  <Input
                    id="numeroContribuable"
                    value={formData.numeroContribuable}
                    onChange={(e) => setFormData({ ...formData, numeroContribuable: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="registreCommerce">Registre de commerce</Label>
                  <Input
                    id="registreCommerce"
                    value={formData.registreCommerce}
                    onChange={(e) => setFormData({ ...formData, registreCommerce: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="formeJuridique">Forme juridique</Label>
                  <Input
                    id="formeJuridique"
                    value={formData.formeJuridique}
                    onChange={(e) => setFormData({ ...formData, formeJuridique: e.target.value })}
                    placeholder="Ex: SARL, SA, EI"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bancaire" className="space-y-4 mt-4 h-full">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="banque">Banque</Label>
                  <Input
                    id="banque"
                    value={formData.banque}
                    onChange={(e) => setFormData({ ...formData, banque: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="numeroCompte">Numéro de compte</Label>
                  <Input
                    id="numeroCompte"
                    value={formData.numeroCompte}
                    onChange={(e) => setFormData({ ...formData, numeroCompte: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="codeSwift">Code SWIFT</Label>
                  <Input
                    id="codeSwift"
                    value={formData.codeSwift}
                    onChange={(e) => setFormData({ ...formData, codeSwift: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4 h-full">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactNom">Nom</Label>
                  <Input
                    id="contactNom"
                    value={formData.contactNom}
                    onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactPrenom">Prénom</Label>
                  <Input
                    id="contactPrenom"
                    value={formData.contactPrenom}
                    onChange={(e) => setFormData({ ...formData, contactPrenom: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactFonction">Fonction</Label>
                  <Input
                    id="contactFonction"
                    value={formData.contactFonction}
                    onChange={(e) => setFormData({ ...formData, contactFonction: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactTelephone">Téléphone</Label>
                  <Input
                    id="contactTelephone"
                    value={formData.contactTelephone}
                    onChange={(e) => setFormData({ ...formData, contactTelephone: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {fournisseur ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
