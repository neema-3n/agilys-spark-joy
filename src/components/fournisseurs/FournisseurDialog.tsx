import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Fournisseur, TypeFournisseur, StatutFournisseur } from '@/types/fournisseur.types';

const fournisseurSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(20, 'Maximum 20 caractères'),
  nom: z.string().min(1, 'Le nom est requis').max(200, 'Maximum 200 caractères'),
  nomCourt: z.string().max(100, 'Maximum 100 caractères').optional(),
  typeFournisseur: z.enum(['personne_physique', 'personne_morale']),
  categorie: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  telephoneMobile: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  siteWeb: z.string().url('URL invalide').optional().or(z.literal('')),
  numeroContribuable: z.string().optional(),
  registreCommerce: z.string().optional(),
  formeJuridique: z.string().optional(),
  banque: z.string().optional(),
  numeroCompte: z.string().optional(),
  codeSwift: z.string().optional(),
  iban: z.string().optional(),
  conditionsPaiement: z.string().optional(),
  delaiLivraisonMoyen: z.coerce.number().optional(),
  noteEvaluation: z.coerce.number().min(0).max(5).optional(),
  statut: z.enum(['actif', 'inactif', 'blackliste', 'en_attente_validation']),
  datePremiereCollaboration: z.string().optional(),
  contactNom: z.string().optional(),
  contactPrenom: z.string().optional(),
  contactFonction: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  contactTelephone: z.string().optional(),
  commentaires: z.string().optional(),
});

interface FournisseurDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  fournisseur?: Fournisseur;
}

export const FournisseurDialog = ({ open, onOpenChange, onSubmit, fournisseur }: FournisseurDialogProps) => {
  const form = useForm<z.infer<typeof fournisseurSchema>>({
    resolver: zodResolver(fournisseurSchema),
    defaultValues: {
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
      delaiLivraisonMoyen: undefined,
      noteEvaluation: undefined,
      statut: 'actif',
      datePremiereCollaboration: '',
      contactNom: '',
      contactPrenom: '',
      contactFonction: '',
      contactEmail: '',
      contactTelephone: '',
      commentaires: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (fournisseur) {
        form.reset({
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
          delaiLivraisonMoyen: fournisseur.delaiLivraisonMoyen || undefined,
          noteEvaluation: fournisseur.noteEvaluation || undefined,
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
        form.reset({
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
          delaiLivraisonMoyen: undefined,
          noteEvaluation: undefined,
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

  const handleSubmit = (values: z.infer<typeof fournisseurSchema>) => {
    const payload = {
      ...values,
      delaiLivraisonMoyen: values.delaiLivraisonMoyen || null,
      noteEvaluation: values.noteEvaluation || null,
    };
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {fournisseur ? 'Modifier le fournisseur' : 'Créer un fournisseur'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <Form {...form}>
          <form className="space-y-4 py-4">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="coordonnees">Coordonnées</TabsTrigger>
                <TabsTrigger value="legal">Légal</TabsTrigger>
                <TabsTrigger value="bancaire">Bancaire</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Code fournisseur" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="statut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="actif">Actif</SelectItem>
                            <SelectItem value="inactif">Inactif</SelectItem>
                            <SelectItem value="blackliste">Blacklisté</SelectItem>
                            <SelectItem value="en_attente_validation">En attente de validation</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom du fournisseur" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nomCourt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom court</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nom court" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="typeFournisseur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personne_physique">Personne physique</SelectItem>
                            <SelectItem value="personne_morale">Personne morale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="categorie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Informatique, Construction, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="datePremiereCollaboration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date première collaboration</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commentaires"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commentaires</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Notes et commentaires" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="coordonnees" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="email@exemple.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="siteWeb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site web</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://www.exemple.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+225..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telephoneMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+225..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="adresse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Adresse complète" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ville"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ville" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Pays" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="legal" className="space-y-4">
                <FormField
                  control={form.control}
                  name="numeroContribuable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro contribuable</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Numéro d'identification fiscale" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registreCommerce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registre de commerce</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Numéro RC" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formeJuridique"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forme juridique</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: SARL, SA, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="bancaire" className="space-y-4">
                <FormField
                  control={form.control}
                  name="banque"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banque</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom de la banque" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numeroCompte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de compte</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Numéro de compte bancaire" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="codeSwift"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code SWIFT/BIC</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Code SWIFT" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="IBAN" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="conditionsPaiement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conditions de paiement</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Ex: 30 jours fin de mois" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="delaiLivraisonMoyen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Délai livraison moyen (jours)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="noteEvaluation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note d'évaluation (0-5)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" min="0" max="5" {...field} placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactNom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du contact</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nom" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPrenom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom du contact</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Prénom" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contactFonction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonction</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Responsable commercial" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email du contact</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="contact@exemple.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactTelephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone du contact</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+225..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
                />
              </div>
            </TabsContent>
          </Tabs>

            </form>
          </Form>
        </div>
        
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
          >
            {fournisseur ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
