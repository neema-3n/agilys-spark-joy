import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Copy, Lock, Mail, ShieldCheck, Trash2, UserMinus, UserPlus, Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useClient } from '@/contexts/ClientContext';
import { usePermissions } from '@/hooks/usePermissions';
import { adminUsersService, type OrganisationRole } from '@/services/api/admin-users.service';

const MODULE_LABELS: Record<string, string> = {
  budgets: 'Budget', projets: 'Projets', reservations: 'Réservations',
  engagements: 'Engagements', bons_commande: 'Bons de commande', factures: 'Factures',
  depenses: 'Dépenses', paiements: 'Paiements', fournisseurs: 'Fournisseurs',
  tresorerie: 'Trésorerie', comptabilite: 'Comptabilité', reporting: 'Reporting',
  parametres: 'Paramètres', utilisateurs: 'Utilisateurs', audit: 'Audit',
};

const slug = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

/**
 * Utilisateurs et rôles de l'organisation courante.
 *
 * Cet écran vit dans l'application, pas dans le back-office : l'administrateur
 * d'une organisation est l'un de ses utilisateurs, et le super admin AGILYS n'a
 * pas à connaître le personnel de ses clients. Un super admin qui doit
 * intervenir passe par la prise en main du client, qui est journalisée.
 */
export const UtilisateursEtRoles = () => {
  const { currentClient } = useClient();
  const { can, isLoading: chargementDroits } = usePermissions();
  const clientId = currentClient?.id ?? '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [roleActif, setRoleActif] = useState<OrganisationRole | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [ajout, setAjout] = useState({ email: '', nom: '', prenom: '', roleId: '', existant: false });
  const [cloneOuvert, setCloneOuvert] = useState(false);
  const [clone, setClone] = useState({ libelle: '', code: '' });

  const echec = (error: Error) =>
    toast({ title: 'Opération impossible', description: error.message, variant: 'destructive' });

  const { data: roles = [] } = useQuery({
    queryKey: ['org-roles', clientId], queryFn: () => adminUsersService.roles(clientId), enabled: !!clientId,
  });
  const { data: utilisateurs = [], isLoading: chargementUsers } = useQuery({
    queryKey: ['org-users', clientId], queryFn: () => adminUsersService.utilisateurs(clientId), enabled: !!clientId,
  });
  const { data: catalogue = [] } = useQuery({ queryKey: ['catalogue'], queryFn: adminUsersService.catalogue });
  const { data: permissionsRole = [] } = useQuery({
    queryKey: ['role-permissions', roleActif?.id],
    queryFn: () => adminUsersService.permissionsDuRole(roleActif!.id),
    enabled: !!roleActif,
  });

  const rafraichir = () => {
    void queryClient.invalidateQueries({ queryKey: ['org-users', clientId] });
    void queryClient.invalidateQueries({ queryKey: ['org-roles', clientId] });
    void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
  };

  const ajoutMutation = useMutation({
    mutationFn: () =>
      ajout.existant
        ? adminUsersService.rattacher(clientId, ajout.email.trim(), ajout.roleId)
        : adminUsersService.inviter(clientId, ajout.email.trim(), ajout.nom, ajout.prenom, ajout.roleId),
    onSuccess: (data: { invitation?: boolean }) => {
      toast({
        title: data?.invitation ? 'Invitation envoyée' : 'Utilisateur rattaché',
        description: data?.invitation
          ? `${ajout.email} recevra un lien pour choisir son mot de passe.`
          : `${ajout.email} a désormais accès à cette organisation.`,
      });
      setAjoutOuvert(false);
      setAjout({ email: '', nom: '', prenom: '', roleId: '', existant: false });
      rafraichir();
    },
    onError: echec,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      adminUsersService.changerRole(clientId, userId, roleId),
    onSuccess: () => { toast({ title: 'Rôle modifié' }); rafraichir(); },
    onError: echec,
  });

  const statutMutation = useMutation({
    mutationFn: ({ userId, statut }: { userId: string; statut: 'actif' | 'inactif' }) =>
      adminUsersService.changerStatut(clientId, userId, statut),
    onSuccess: () => { toast({ title: 'Accès mis à jour' }); rafraichir(); },
    onError: echec,
  });

  const detacherMutation = useMutation({
    mutationFn: (userId: string) => adminUsersService.detacher(clientId, userId),
    onSuccess: () => { toast({ title: 'Accès retiré' }); rafraichir(); },
    onError: echec,
  });

  const cloneMutation = useMutation({
    mutationFn: () => adminUsersService.clonerRole(clientId, roleActif!.id, clone.code, clone.libelle),
    onSuccess: () => {
      toast({ title: 'Rôle cloné', description: `« ${clone.libelle} » part des mêmes permissions et se modifie librement.` });
      setCloneOuvert(false); setClone({ libelle: '', code: '' }); rafraichir();
    },
    onError: echec,
  });

  const permissionMutation = useMutation({
    mutationFn: ({ code, accordee }: { code: string; accordee: boolean }) =>
      adminUsersService.basculerPermission(roleActif!.id, code, accordee),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['role-permissions', roleActif?.id] });
      void queryClient.invalidateQueries({ queryKey: ['org-roles', clientId] });
    },
    onError: echec,
  });

  const modules = [...new Set(catalogue.map((p) => p.module))];
  const accordees = new Set(permissionsRole);

  // Masquer l'écran à qui n'a pas le droit d'en faire usage. La base le
  // refuserait de toute façon ; l'afficher ne ferait que promettre en vain.
  if (!chargementDroits && !can('utilisateurs.gerer')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Accès restreint</CardTitle>
          <CardDescription>
            La gestion des utilisateurs et des rôles revient aux administrateurs de
            {currentClient ? ` ${currentClient.nom}` : ' cette organisation'}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="utilisateurs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utilisateurs">
            <Users className="mr-2 h-4 w-4" />
            Utilisateurs ({utilisateurs.length})
          </TabsTrigger>
          <TabsTrigger value="roles">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Rôles ({roles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="utilisateurs">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Utilisateurs</CardTitle>
                <CardDescription>
                  Retirer un accès ne supprime pas le compte : il peut servir dans une autre organisation.
                </CardDescription>
              </div>
              <Button onClick={() => setAjoutOuvert(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Accès</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utilisateurs.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell>
                        <p className="font-medium">
                          {[u.prenom, u.nom].filter(Boolean).join(' ') || u.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        {u.autresOrganisations > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Également dans {u.autresOrganisations} autre
                            {u.autresOrganisations > 1 ? 's' : ''} organisation
                            {u.autresOrganisations > 1 ? 's' : ''}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.roleId ?? ''}
                          onValueChange={(roleId) => roleMutation.mutate({ userId: u.userId, roleId })}
                        >
                          <SelectTrigger className="w-56"><SelectValue placeholder="Aucun rôle" /></SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.libelle}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.statut === 'actif' ? 'default' : 'secondary'}>
                          {u.statut === 'actif' ? 'Actif' : 'Désactivé'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline" size="sm"
                            onClick={() => statutMutation.mutate({
                              userId: u.userId, statut: u.statut === 'actif' ? 'inactif' : 'actif',
                            })}
                          >
                            {u.statut === 'actif' ? 'Désactiver' : 'Réactiver'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => detacherMutation.mutate(u.userId)}>
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!chargementUsers && utilisateurs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Aucun utilisateur rattaché.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rôles</CardTitle>
                <CardDescription>
                  Les rôles standard ne se modifient pas : clonez-en un pour vous en écarter.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoleActif(r)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                      roleActif?.id === r.id ? 'border-primary bg-accent' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.libelle}</span>
                      {r.estStandard ? (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Lock className="h-3 w-3" /> Standard
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.nbPermissions} permissions</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    {roleActif ? roleActif.libelle : 'Sélectionnez un rôle'}
                  </CardTitle>
                  <CardDescription>
                    {roleActif?.estStandard
                      ? 'Rôle standard, en lecture seule. Clonez-le pour l’ajuster.'
                      : roleActif
                        ? 'Cochez ou décochez librement : la base applique ces droits.'
                        : 'La matrice des permissions s’affiche ici.'}
                  </CardDescription>
                </div>
                {roleActif ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { setClone({ libelle: `${roleActif.libelle} (copie)`, code: `${roleActif.code}_copie` }); setCloneOuvert(true); }}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" /> Cloner
                    </Button>
                    {!roleActif.estStandard ? (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => adminUsersService.supprimerRole(roleActif.id).then(() => { setRoleActif(null); rafraichir(); }).catch(echec)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardHeader>
              <CardContent>
                {roleActif ? (
                  <div className="space-y-5">
                    {modules.map((module) => (
                      <div key={module}>
                        <p className="mb-2 text-sm font-semibold">{MODULE_LABELS[module] ?? module}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {catalogue.filter((p) => p.module === module).map((p) => (
                            <label
                              key={p.code}
                              className={`flex items-center gap-2 rounded border border-border p-2 text-sm ${
                                roleActif.estStandard ? 'opacity-60' : 'cursor-pointer hover:bg-accent'
                              }`}
                            >
                              <Checkbox
                                checked={accordees.has(p.code)}
                                disabled={roleActif.estStandard || permissionMutation.isPending}
                                onCheckedChange={(v) =>
                                  permissionMutation.mutate({ code: p.code, accordee: v === true })
                                }
                              />
                              <span>{p.libelle}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-muted-foreground">
                    Choisissez un rôle à gauche.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={ajoutOuvert} onOpenChange={setAjoutOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>
              Une adresse déjà connue est rattachée sans créer de doublon : le compte reste unique,
              seul l’accès s’ajoute.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button" className="flex-1"
                variant={!ajout.existant ? 'default' : 'outline'}
                onClick={() => setAjout((c) => ({ ...c, existant: false }))}
              >
                <Mail className="mr-2 h-4 w-4" /> Inviter
              </Button>
              <Button
                type="button" className="flex-1"
                variant={ajout.existant ? 'default' : 'outline'}
                onClick={() => setAjout((c) => ({ ...c, existant: true }))}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Compte existant
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email" type="email" value={ajout.email}
                onChange={(e) => setAjout((c) => ({ ...c, email: e.target.value }))}
                placeholder="prenom.nom@organisation.bj"
              />
            </div>

            {!ajout.existant ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" value={ajout.prenom}
                    onChange={(e) => setAjout((c) => ({ ...c, prenom: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" value={ajout.nom}
                    onChange={(e) => setAjout((c) => ({ ...c, nom: e.target.value }))} />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={ajout.roleId} onValueChange={(roleId) => setAjout((c) => ({ ...c, roleId }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un rôle" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!ajout.existant ? (
              <p className="text-xs text-muted-foreground">
                Aucun mot de passe n’est saisi ici : l’utilisateur reçoit une invitation et choisit le sien.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAjoutOuvert(false)}>Annuler</Button>
            <Button
              disabled={!ajout.email.trim() || !ajout.roleId || ajoutMutation.isPending}
              onClick={() => ajoutMutation.mutate()}
            >
              {ajoutMutation.isPending ? 'En cours…' : ajout.existant ? 'Rattacher' : 'Inviter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cloneOuvert} onOpenChange={setCloneOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cloner « {roleActif?.libelle} »</DialogTitle>
            <DialogDescription>
              Le nouveau rôle part des mêmes permissions, puis se modifie librement. L’original
              reste intact.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clone-libelle">Nom du rôle</Label>
              <Input
                id="clone-libelle" value={clone.libelle}
                onChange={(e) => setClone({ libelle: e.target.value, code: slug(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clone-code">Code</Label>
              <Input
                id="clone-code" value={clone.code} className="font-mono text-sm"
                onChange={(e) => setClone((c) => ({ ...c, code: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOuvert(false)}>Annuler</Button>
            <Button
              disabled={!clone.libelle.trim() || !clone.code.trim() || cloneMutation.isPending}
              onClick={() => cloneMutation.mutate()}
            >
              Cloner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


