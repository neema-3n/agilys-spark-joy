import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarClock, Pause, Play, Plus, Settings2, Users, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  adminClientsService,
  estExpire,
  joursRestants,
  type AdminClient,
  type ClientStatut,
  type TypeAbonnement,
} from '@/services/api/admin-clients.service';

const STATUT_LABELS: Record<ClientStatut, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  actif: { label: 'Actif', variant: 'default' },
  suspendu: { label: 'Suspendu — lecture seule', variant: 'secondary' },
  resilie: { label: 'Résilié', variant: 'destructive' },
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const formatDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR') : '—';

/** Résume l'abonnement en une phrase, et signale ce qui demande une action. */
const AbonnementCell = ({ client }: { client: AdminClient }) => {
  const jours = joursRestants(client.dateFinAbonnement);
  const expire = estExpire(client.dateFinAbonnement);
  const libelleType = client.typeAbonnement === 'live' ? 'Abonné' : 'Essai';

  if (jours === null) {
    return <Badge variant="destructive">Aucune validité — lecture seule</Badge>;
  }

  if (expire) {
    return (
      <div className="space-y-1">
        <Badge variant="destructive">Expiré — lecture seule</Badge>
        <p className="text-xs text-muted-foreground">
          depuis le {formatDate(client.dateFinAbonnement)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Badge variant={client.typeAbonnement === 'live' ? 'default' : 'secondary'}>
        {libelleType} jusqu'au {formatDate(client.dateFinAbonnement)}
      </Badge>
      {jours <= 15 ? (
        <p className="text-xs font-medium text-amber-600">
          {jours === 0 ? "Dernier jour" : `${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`}
        </p>
      ) : null}
    </div>
  );
};

const AdminClients = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ nom: '', code: '', pays: '', devise: 'XOF', id: '' });
  const [idTouched, setIdTouched] = useState(false);
  const [pendingStatut, setPendingStatut] = useState<{ client: AdminClient; statut: ClientStatut } | null>(null);
  const [abonnementClient, setAbonnementClient] = useState<AdminClient | null>(null);
  const [abonnementForm, setAbonnementForm] = useState<{ type: TypeAbonnement; dateFin: string }>({
    type: 'trial',
    dateFin: '',
  });
  const [reglagesOpen, setReglagesOpen] = useState(false);
  const [dureeEssai, setDureeEssai] = useState('30');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: adminClientsService.listAll,
  });

  useQuery({
    queryKey: ['duree-essai'],
    queryFn: async () => {
      const jours = await adminClientsService.getDureeEssaiJours();
      setDureeEssai(String(jours));
      return jours;
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
  };

  const createMutation = useMutation({
    mutationFn: adminClientsService.create,
    onSuccess: () => {
      toast({ title: 'Organisation créée', description: `${form.nom} peut maintenant être configurée.` });
      setCreateOpen(false);
      setForm({ nom: '', code: '', pays: '', devise: 'XOF', id: '' });
      setIdTouched(false);
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: 'Création impossible', description: error.message, variant: 'destructive' });
    },
  });

  const statutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: ClientStatut }) =>
      adminClientsService.setStatut(id, statut),
    onSuccess: () => {
      toast({ title: 'Abonnement mis à jour' });
      setPendingStatut(null);
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: 'Mise à jour impossible', description: error.message, variant: 'destructive' });
    },
  });

  const abonnementMutation = useMutation({
    mutationFn: ({ id, type, dateFin }: { id: string; type: TypeAbonnement; dateFin: string }) =>
      adminClientsService.setAbonnement(id, type, dateFin || null),
    onSuccess: () => {
      toast({ title: 'Abonnement mis à jour' });
      setAbonnementClient(null);
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: 'Mise à jour impossible', description: error.message, variant: 'destructive' });
    },
  });

  const dureeMutation = useMutation({
    mutationFn: (jours: number) => adminClientsService.setDureeEssaiJours(jours),
    onSuccess: () => {
      toast({ title: 'Durée d\'essai enregistrée' });
      setReglagesOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['duree-essai'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Enregistrement impossible', description: error.message, variant: 'destructive' });
    },
  });

  const openAbonnement = (client: AdminClient) => {
    setAbonnementForm({
      type: client.typeAbonnement,
      dateFin: client.dateFinAbonnement ?? '',
    });
    setAbonnementClient(client);
  };

  const handleNomChange = (nom: string) => {
    setForm((current) => ({
      ...current,
      nom,
      // L'identifiant est la clé primaire portée par toutes les tables métier :
      // on le propose d'après le nom, mais il reste modifiable et définitif.
      id: idTouched ? current.id : slugify(nom),
    }));
  };

  const canSubmit = form.nom.trim() && form.code.trim() && form.id.trim() && form.devise.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organisations</h1>
          <p className="text-sm text-muted-foreground">
            Création des clients et gestion de leur abonnement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReglagesOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Durée d'essai : {dureeEssai} j
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle organisation
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isLoading ? 'Chargement…' : `${clients.length} organisation${clients.length > 1 ? 's' : ''}`}
          </CardTitle>
          <CardDescription>
            Suspendre un abonnement place l&apos;organisation en lecture seule : ses données restent
            consultables et exportables, aucune modification n&apos;est possible.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead className="text-right">Utilisateurs</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const statut = STATUT_LABELS[client.statut];
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{client.nom}</p>
                          <p className="text-xs text-muted-foreground">{client.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{client.id}</TableCell>
                    <TableCell>{client.pays || '—'}</TableCell>
                    <TableCell>{client.devise}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {client.membres}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AbonnementCell client={client} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statut.variant}>{statut.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAbonnement(client)}>
                          <CalendarClock className="mr-2 h-3.5 w-3.5" />
                          Abonnement
                        </Button>
                        {client.statut === 'actif' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingStatut({ client, statut: 'suspendu' })}
                          >
                            <Pause className="mr-2 h-3.5 w-3.5" />
                            Suspendre
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingStatut({ client, statut: 'actif' })}
                          >
                            <Play className="mr-2 h-3.5 w-3.5" />
                            Réactiver
                          </Button>
                        )}
                        {client.statut !== 'resilie' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingStatut({ client, statut: 'resilie' })}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Aucune organisation.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle organisation</DialogTitle>
            <DialogDescription>
              Elle démarrera sans exercice ni plan comptable : ses administrateurs seront guidés
              par la liste de configuration à leur première connexion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={form.nom}
                onChange={(event) => handleNomChange(event.target.value)}
                placeholder="Mairie de Porto-Novo"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(event) => setForm((c) => ({ ...c, code: event.target.value }))}
                  placeholder="MPN-2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id">Identifiant technique</Label>
                <Input
                  id="id"
                  value={form.id}
                  onChange={(event) => {
                    setIdTouched(true);
                    setForm((c) => ({ ...c, id: event.target.value }));
                  }}
                  placeholder="mairie-porto-novo"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Définitif : il porte toutes les données.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pays">Pays</Label>
                <Input
                  id="pays"
                  value={form.pays}
                  onChange={(event) => setForm((c) => ({ ...c, pays: event.target.value }))}
                  placeholder="Bénin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="devise">Devise</Label>
                <Input
                  id="devise"
                  value={form.devise}
                  onChange={(event) => setForm((c) => ({ ...c, devise: event.target.value }))}
                  placeholder="XOF"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={!canSubmit || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  id: form.id.trim(),
                  nom: form.nom.trim(),
                  code: form.code.trim(),
                  pays: form.pays.trim(),
                  devise: form.devise.trim().toUpperCase(),
                })
              }
            >
              {createMutation.isPending ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!abonnementClient} onOpenChange={(open) => !open && setAbonnementClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abonnement — {abonnementClient?.nom}</DialogTitle>
            <DialogDescription>
              L&apos;échéance seule décide : au-delà, l&apos;organisation passe en lecture seule.
              Le type indique pourquoi elle est valide, sans influer sur ce calcul.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={abonnementForm.type === 'trial' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setAbonnementForm((c) => ({ ...c, type: 'trial' }))}
                >
                  Essai / sursis
                </Button>
                <Button
                  type="button"
                  variant={abonnementForm.type === 'live' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setAbonnementForm((c) => ({ ...c, type: 'live' }))}
                >
                  Abonné (payé)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Un sursis accordé à un client qui paiera plus tard reste un « essai » : on repousse
                simplement l&apos;échéance.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFin">Valide jusqu&apos;au</Label>
              <Input
                id="dateFin"
                type="date"
                value={abonnementForm.dateFin}
                onChange={(event) =>
                  setAbonnementForm((c) => ({ ...c, dateFin: event.target.value }))
                }
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[30, 90, 365].map((jours) => (
                  <Button
                    key={jours}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // On prolonge depuis l'échéance en cours si elle est à venir,
                      // sinon depuis aujourd'hui : c'est le comportement attendu
                      // d'un renouvellement, sans faire perdre les jours restants.
                      const base =
                        abonnementForm.dateFin && !estExpire(abonnementForm.dateFin)
                          ? new Date(`${abonnementForm.dateFin}T00:00:00`)
                          : new Date();
                      base.setDate(base.getDate() + jours);
                      setAbonnementForm((c) => ({ ...c, dateFin: base.toISOString().slice(0, 10) }));
                    }}
                  >
                    +{jours} j
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAbonnementForm((c) => ({ ...c, dateFin: '' }))}
                >
                  Aucune validité
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbonnementClient(null)}>
              Annuler
            </Button>
            <Button
              disabled={abonnementMutation.isPending}
              onClick={() =>
                abonnementClient &&
                abonnementMutation.mutate({
                  id: abonnementClient.id,
                  type: abonnementForm.type,
                  dateFin: abonnementForm.dateFin,
                })
              }
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reglagesOpen} onOpenChange={setReglagesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Durée de la période d&apos;essai</DialogTitle>
            <DialogDescription>
              Appliquée automatiquement à chaque nouvelle organisation. À zéro, une organisation
              créée démarre en lecture seule jusqu&apos;à ce qu&apos;une échéance soit fixée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="duree">Jours</Label>
            <Input
              id="duree"
              type="number"
              min={0}
              value={dureeEssai}
              onChange={(event) => setDureeEssai(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReglagesOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={dureeMutation.isPending}
              onClick={() => dureeMutation.mutate(Math.max(0, Number(dureeEssai) || 0))}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingStatut} onOpenChange={(open) => !open && setPendingStatut(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatut?.statut === 'suspendu' && 'Suspendre l\'abonnement ?'}
              {pendingStatut?.statut === 'actif' && 'Réactiver l\'abonnement ?'}
              {pendingStatut?.statut === 'resilie' && 'Résilier l\'abonnement ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatut?.statut === 'suspendu' &&
                `${pendingStatut.client.nom} passera en lecture seule. Ses ${pendingStatut.client.membres} utilisateur(s) pourront consulter et exporter, mais plus rien modifier.`}
              {pendingStatut?.statut === 'actif' &&
                `${pendingStatut.client.nom} retrouvera un accès complet.`}
              {pendingStatut?.statut === 'resilie' &&
                `${pendingStatut.client.nom} disparaîtra de la liste de ses utilisateurs. Les données sont conservées et l'organisation peut être réactivée.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingStatut &&
                statutMutation.mutate({ id: pendingStatut.client.id, statut: pendingStatut.statut })
              }
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminClients;
