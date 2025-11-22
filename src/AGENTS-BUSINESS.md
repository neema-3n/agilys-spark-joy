# AGENTS - Règles Métier

> **🎯 Objectif** : Comprendre le domaine budgétaire et les règles métier d'AGILYS
> **👥 Pour qui** : Agents IA intervenant sur le code
> **⏱️ Dernière MAJ** : 2025-01-21

## 📍 Navigation Rapide

- [Contexte Métier](#-contexte-métier)
- [Structure Budgétaire](#-structure-budgétaire)
- [Cycle de Vie des Dépenses](#-cycle-de-vie-des-dépenses)
- [Statuts et Workflows](#-statuts-et-workflows)
- [Règles de Gestion](#-règles-de-gestion)
- [Rôles et Permissions](#-rôles-et-permissions)

---

## 🏢 Contexte Métier

### Qu'est-ce qu'AGILYS ?

AGILYS est une application de **gestion budgétaire pour collectivités locales africaines** (communes, départements, régions) au Bénin.

### Problématique

Les collectivités locales doivent :
- 📊 Prévoir leur budget annuel (prévisions)
- 💰 Gérer les crédits budgétaires (disponibilité)
- 📝 Tracer toutes les dépenses (engagement → facture → paiement)
- 🔍 Contrôler en temps réel la disponibilité des crédits
- 📈 Produire des rapports budgétaires et comptables

### Solution AGILYS

- ✅ **Multi-tenant** : Plusieurs collectivités sur une instance
- ✅ **Multi-exercice** : Gestion de plusieurs années budgétaires
- ✅ **Structure budgétaire** : Section → Programme → Action → Ligne
- ✅ **Workflow complet** : Réservation → Engagement → Facture → Dépense → Paiement
- ✅ **Contrôle automatique** : Vérification de disponibilité en temps réel
- ✅ **Traçabilité** : Historique complet de toutes les opérations

---

## 🏗️ Structure Budgétaire

### Hiérarchie (4 niveaux)

```
📁 Section (ex: "Éducation")
  ├── 📂 Programme (ex: "Enseignement Primaire")
  │     ├── 📄 Action (ex: "Fonctionnement des écoles")
  │     │     ├── 💰 Ligne Budgétaire (ex: "Fournitures scolaires - Compte 604100")
  │     │     ├── 💰 Ligne Budgétaire (ex: "Entretien bâtiments - Compte 615200")
  │     │     └── ...
  │     └── ...
  └── ...
```

### 1️⃣ Section

**Définition** : Grand domaine d'action (ex: Éducation, Santé, Infrastructure)

**Attributs** :
- `code` : Code unique (ex: "SEC01")
- `libelle` : Libellé (ex: "Éducation et Formation")
- `ordre` : Ordre d'affichage
- `statut` : 'actif' | 'inactif'

**Relations** :
- Contient plusieurs **Programmes**
- Liée à un **Exercice** et un **Client**

### 2️⃣ Programme

**Définition** : Sous-domaine d'une section (ex: Enseignement Primaire, Enseignement Secondaire)

**Attributs** :
- `code` : Code unique (ex: "PROG01")
- `libelle` : Libellé (ex: "Enseignement Primaire")
- `ordre` : Ordre d'affichage
- `statut` : 'actif' | 'inactif'
- `sectionId` : Section parente

**Relations** :
- Appartient à une **Section**
- Contient plusieurs **Actions**

### 3️⃣ Action

**Définition** : Activité spécifique d'un programme (ex: Fonctionnement des écoles, Cantines scolaires)

**Attributs** :
- `code` : Code unique (ex: "ACT01")
- `libelle` : Libellé (ex: "Fonctionnement des écoles primaires")
- `ordre` : Ordre d'affichage
- `statut` : 'actif' | 'inactif'
- `programmeId` : Programme parent

**Relations** :
- Appartient à un **Programme**
- Contient plusieurs **Lignes Budgétaires**

### 4️⃣ Ligne Budgétaire

**Définition** : Ligne de crédit concrète avec un montant alloué (ex: Fournitures scolaires - 5M XOF)

**Attributs** :
- `libelle` : Libellé descriptif
- `compteId` : Compte comptable (plan comptable)
- `actionId` : Action parente
- `enveloppeId` : Enveloppe budgétaire (source de financement)
- **Montants** :
  - `montantInitial` : Budget voté initial
  - `montantModifie` : Ajustements (modifications budgétaires)
  - `montantReserve` : Crédits réservés (réservations)
  - `montantEngage` : Crédits engagés (engagements validés)
- `montantLiquide` : Crédits liquidés (dépenses payées)
  - `disponible` : **Calculé automatiquement** = Initial + Modifié - Réservé - Engagé
- `statut` : 'actif' | 'cloture'

**Relations** :
- Appartient à une **Action**
- Liée à un **Compte** (plan comptable)
- Liée à une **Enveloppe** (source financement)
- Référencée par **Engagements**, **Factures**, **Dépenses**

**⚠️ Règle critique** : Le **disponible** est calculé automatiquement et ne doit jamais être modifié directement.

---

## 💸 Cycle de Vie des Dépenses

### Vue d'ensemble

```
1. Réservation de crédit (optionnel)
   ↓
2. Engagement (obligation juridique)
   ↓
3. Bon de Commande (optionnel)
   ↓
4. Facture (créance fournisseur)
   ↓
5. Dépense (liquidation)
   ↓
6. Paiement (décaissement)
```

### 1️⃣ Réservation de Crédit

**Définition** : Pré-réservation de crédit pour un besoin futur (ex: dépense urgente planifiée)

**Attributs** :
- `numero` : Généré auto (ex: "RES/2024/001")
- `objet` : Description
- `montant` : Montant réservé
- `ligneBudgetaireId` : Ligne concernée
- `beneficiaire` : Bénéficiaire potentiel
- `dateReservation` : Date
- `dateExpiration` : Date limite (optionnel)
- `statut` : 'actif' | 'engage' | 'expire' | 'annule'

**Workflow** :
1. Créer réservation → Statut 'actif' → Montant réservé bloqué
2. Créer engagement depuis réservation → Statut 'engage' → Libère et bloque en tant qu'engagement
3. Si expiration → Statut 'expire' → Libère le montant réservé

**Impact sur ligne budgétaire** :
- `montantReserve` augmente
- `disponible` diminue

### 2️⃣ Engagement

**Définition** : **Obligation juridique** de dépense (ex: marché, convention, contrat)

**Attributs** :
- `numero` : Généré auto (ex: "ENG/2024/001")
- `objet` : Objet de l'engagement
- `montant` : Montant engagé
- `ligneBudgetaireId` : Ligne impactée
- `fournisseurId` : Fournisseur (optionnel)
- `beneficiaire` : Nom du bénéficiaire
- `dateCreation` : Date création
- `dateValidation` : Date validation
- `statut` : 'brouillon' | 'en_attente' | 'valide' | 'annule'
- `projetId` : Projet associé (optionnel)
- `reservationCreditId` : Réservation source (optionnel)

**Workflow** :
1. Brouillon → Saisie, modification possible
2. En attente → Soumis pour validation
3. Validé → **Montant engagé bloqué** sur ligne budgétaire
4. Annulé → Libère le montant engagé

**Impact sur ligne budgétaire** (si validé) :
- `montantEngage` augmente
- `disponible` diminue

**⚠️ Règle critique** : Un engagement validé **NE PEUT PAS** être modifié ou supprimé (sauf annulation avec motif).

### 3️⃣ Bon de Commande

**Définition** : Document de commande formelle auprès d'un fournisseur

**Attributs** :
- `numero` : Généré auto (ex: "BC/2024/001")
- `objet` : Objet de la commande
- `montant` : Montant commandé
- `fournisseurId` : Fournisseur
- `engagementId` : Engagement source (optionnel)
- `ligneBudgetaireId` : Ligne impactée
- `dateCommande` : Date commande
- `dateLivraisonPrevue` : Date livraison prévue
- `dateLivraisonReelle` : Date livraison réelle
- `conditionsLivraison` : Conditions
- `statut` : 'brouillon' | 'emis' | 'receptionne' | 'annule'

**Workflow** :
1. Brouillon → Préparation
2. Émis → Envoyé au fournisseur
3. Réceptionné → Marchandises/services livrés
4. Annulé → BC annulé

**Impact** : Aucun impact direct sur ligne budgétaire (l'engagement a déjà bloqué les crédits)

### 4️⃣ Facture

**Définition** : Créance du fournisseur suite à livraison/prestation

**Attributs** :
- `numero` : Généré auto (ex: "FAC/2024/001")
- `numeroFactureFournisseur` : Numéro facture du fournisseur
- `objet` : Objet
- `fournisseurId` : Fournisseur
- `engagementId` : Engagement source (optionnel)
- `bonCommandeId` : BC source (optionnel)
- `ligneBudgetaireId` : Ligne impactée
- `dateFacture` : Date facture
- `dateEcheance` : Date échéance
- `montantHT` : Montant HT
- `montantTVA` : Montant TVA
- `montantTTC` : Montant TTC
- `montantLiquide` : Montant déjà liquidé (calculé)
- `statut` : 'brouillon' | 'validee' | 'partiellement_payee' | 'payee' | 'annulee'

**Workflow** :
1. Brouillon → Saisie
2. Validée → Prête pour liquidation
3. Partiellement payée → Paiement(s) partiel(s)
4. Payée → Totalement soldée
5. Annulée → Facture annulée

**Impact** : Aucun impact direct (engagement a déjà bloqué)

**⚠️ Règle critique** : Une facture validée peut être source de plusieurs dépenses (paiements partiels).

### 5️⃣ Dépense

**Définition** : **Liquidation** de la dépense (calcul exact du montant à payer)

**Attributs** :
- `numero` : Généré auto (ex: "DEP/2024/001")
- `objet` : Objet
- `montant` : Montant à payer
- `montantLiquide` : Montant effectivement liquidé
- `beneficiaire` : Bénéficiaire
- `fournisseurId` : Fournisseur (optionnel)
- `engagementId` : Engagement source (optionnel)
- `factureId` : Facture source (optionnel)
- `reservationCreditId` : Réservation source (dépense urgence, optionnel)
- `ligneBudgetaireId` : Ligne impactée
- `dateDepense` : Date
- `dateValidation` : Date validation
- `dateOrdonnancement` : Date ordonnancement
- `datePaiement` : Date paiement
- `modePaiement` : 'virement' | 'cheque' | 'especes' | 'mobile_money'
- `referencePaiement` : Référence paiement
- `statut` : 'brouillon' | 'validee' | 'ordonnancee' | 'payee' | 'annulee'

**Workflow** :
1. Brouillon → Saisie
2. Validée → Prête pour ordonnancement
3. Ordonnancée → Ordre de paiement émis
4. Payée → **Montant payé comptabilisé** sur ligne budgétaire
5. Annulée → Dépense annulée

**Impact sur ligne budgétaire** (si payée) :
- `montantLiquide` augmente

**Types de dépenses** :
- **Depuis engagement** : Dépense normale (engagement → dépense)
- **Depuis facture** : Dépense suite facture (engagement → facture → dépense)
- **Depuis réservation** (urgence) : Dépense urgente sans engagement préalable

### 6️⃣ Paiement

**Définition** : Décaissement effectif (sortie de trésorerie)

**Dans AGILYS** : Le paiement est géré au niveau de la **Dépense** (statut 'payee', date_paiement, mode_paiement, reference_paiement).

Une table `paiements` séparée peut être ajoutée pour gérer :
- Paiements partiels
- Échéanciers
- Rapprochements bancaires

---

## 📊 Statuts et Workflows

### Statuts Communs

La plupart des entités suivent un workflow similaire :

```
brouillon → en_attente → valide → (annule)
```

**Explications** :
- **brouillon** : Éditable, supprimable, aucun impact budgétaire
- **en_attente** : Soumis pour validation, plus éditable par le créateur
- **valide** : Validé, **impact budgétaire actif**, modifications restreintes
- **annule** : Annulé avec motif, libère les crédits bloqués

### Workflows Spécifiques

#### Réservation
```
actif → (engage | expire | annule)
```
- **actif** : Crédit réservé
- **engage** : Converti en engagement
- **expire** : Date expiration dépassée
- **annule** : Annulée manuellement

#### Bon de Commande
```
brouillon → emis → receptionne → (annule)
```
- **brouillon** : Préparation
- **emis** : Envoyé au fournisseur
- **receptionne** : Livraison effectuée
- **annule** : BC annulé

#### Facture
```
brouillon → validee → (partiellement_payee) → payee → (annulee)
```
- **brouillon** : Saisie
- **validee** : Prête pour paiement
- **partiellement_payee** : Paiement(s) partiel(s)
- **payee** : Totalement soldée
- **annulee** : Annulée

#### Dépense
```
brouillon → validee → ordonnancee → payee → (annulee)
```
- **brouillon** : Saisie
- **validee** : Prête pour ordonnancement
- **ordonnancee** : Ordre de paiement émis
- **payee** : Paiement effectué
- **annulee** : Annulée

---

## 🔐 Règles de Gestion

### Multi-tenant

**Règle** : Isolation stricte des données par `client_id`

**Implémentation** :
- ✅ Toutes les tables métier ont un `client_id`
- ✅ Tous les services API filtrent par `client_id`
- ✅ RLS policies vérifient `client_id` via profil utilisateur
- ✅ Le contexte `ClientContext` gère le client actif

**Exemple RLS** :
```sql
CREATE POLICY "Users can only see their client's data"
ON engagements FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM profiles WHERE id = auth.uid()
  )
);
```

### Multi-exercice

**Règle** : Opérations budgétaires isolées par `exercice_id`

**Implémentation** :
- ✅ Tables budgétaires ont un `exercice_id`
- ✅ Contexte `ExerciceContext` gère l'exercice actif
- ✅ Filtrage automatique par exercice dans hooks et services
- ✅ Changement d'exercice recharge les données

**Statuts d'exercice** :
- **ouvert** : Opérations autorisées
- **cloture** : Lecture seule, aucune modification

### Génération de Numéros

**Règle** : Numéros uniques et séquentiels par exercice

**Format** : `{TYPE}/{ANNEE}/{SEQUENCE}`

Exemples :
- `ENG/2024/001`, `ENG/2024/002`, ...
- `FAC/2024/001`, `FAC/2024/002`, ...
- `DEP/2024/001`, `DEP/2024/002`, ...

**Implémentation** :
- ❌ **JAMAIS** générer côté client (risque de doublon)
- ✅ **TOUJOURS** via edge function dédiée
- ✅ Transaction SQL pour garantir unicité
- ✅ Séquence gérée par table `numero_sequences`

**Edge functions** :
- `create-engagement`
- `create-facture`
- `create-depense`
- `create-reservation`
- `create-bon-commande`
- `create-modification-budgetaire`

### Contrôle de Disponibilité

**Règle** : Vérifier disponibilité avant validation engagement/réservation

**Calcul** :
```
Disponible = MontantInitial + MontantModifié - MontantRéservé - MontantEngagé
```

**Implémentation** :
- ✅ Calcul automatique via trigger DB (`update_ligne_budgetaire_montants`)
- ✅ Vérification côté serveur dans edge functions
- ✅ Affichage temps réel dans interface
- ✅ Blocage si crédit insuffisant

**Exemple** :
```sql
-- Trigger de calcul automatique
CREATE OR REPLACE FUNCTION update_ligne_budgetaire_montants()
RETURNS TRIGGER AS $$
BEGIN
  NEW.disponible := NEW.montant_initial + NEW.montant_modifie 
                    - NEW.montant_reserve - NEW.montant_engage;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Modifications Budgétaires

**Types** :
- **virement** : Transfert de crédits entre deux lignes
- **augmentation** : Augmentation crédit d'une ligne (source externe)
- **diminution** : Diminution crédit d'une ligne

**Workflow** :
```
brouillon → en_attente → validee → (annulee)
```

**Implémentation** :
- ✅ Création via edge function `create-modification-budgetaire`
- ✅ Validation met à jour `montantModifie` des lignes concernées
- ✅ Trigger recalcule automatiquement `disponible`

### Validation & Annulation

**Règles** :
- ✅ Validation irréversible (sauf annulation)
- ✅ Annulation nécessite un motif obligatoire
- ✅ Annulation libère les crédits bloqués
- ✅ Historique conservé (pas de suppression physique)

**Implémentation** :
```typescript
// Validation
async validate(id: string): Promise<Engagement> {
  return this.update(id, {
    statut: 'valide',
    dateValidation: new Date().toISOString(),
  });
}

// Annulation
async cancel(id: string, motif: string): Promise<Engagement> {
  return this.update(id, {
    statut: 'annule',
    motifAnnulation: motif,
  });
}
```

---

## 👥 Rôles et Permissions

### Rôles Disponibles

1. **super_admin** : Administrateur global (multi-clients)
2. **admin_client** : Administrateur d'une collectivité
3. **directeur_financier** : Directeur financier (validation, pilotage)
4. **chef_service** : Chef de service (gestion opérationnelle)
5. **comptable** : Comptable (saisie, suivi)
6. **lecteur** : Lecture seule

### Matrice de Permissions

| Action | super_admin | admin_client | directeur_financier | chef_service | comptable | lecteur |
|--------|-------------|--------------|---------------------|--------------|-----------|---------|
| **Budget** |
| Créer structure budgétaire | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modifier structure | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Valider modification budgétaire | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Engagements** |
| Créer engagement | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Valider engagement | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Annuler engagement | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Factures** |
| Créer facture | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Valider facture | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Dépenses** |
| Créer dépense | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ordonnancer dépense | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Marquer payée | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Paramètres** |
| Gérer exercices | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gérer fournisseurs | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Gérer utilisateurs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Implémentation

**Contexte** : `AuthContext` expose `user.roles[]`

**Composant Guard** :
```tsx
<RoleGuard allowedRoles={['admin_client', 'directeur_financier']}>
  <Button onClick={handleValidate}>Valider</Button>
</RoleGuard>
```

**Hook personnalisé** :
```typescript
const { hasRole } = useAuth();

if (hasRole(['admin_client', 'directeur_financier'])) {
  // Afficher action
}
```

**RLS Policies** :
```sql
CREATE POLICY "Only admins and DF can validate"
ON engagements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin_client', 'directeur_financier')
  )
);
```

---

## 📚 Concepts Complémentaires

### Enveloppes Budgétaires

**Définition** : Source de financement (ex: Budget propre, Subvention État, Partenaire)

**Attributs** :
- `code` : Code unique
- `nom` : Nom de l'enveloppe
- `sourceFinancement` : Type de source
- `montantAlloue` : Montant total
- `montantConsomme` : Montant consommé (calculé)
- `montantDisponible` : Calculé = Alloué - Consommé

**Usage** : Les lignes budgétaires sont liées à une enveloppe pour tracer l'origine des fonds.

### Projets

**Définition** : Projet transversal (ex: Construction école, Réhabilitation route)

**Attributs** :
- `code`, `nom`, `description`
- `dateDebut`, `dateFin`
- `budgetAlloue`, `budgetConsomme`, `budgetEngage`
- `tauxAvancement` : % avancement
- `statut` : 'planifie' | 'en_cours' | 'termine' | 'suspendu'
- `priorite` : 'basse' | 'moyenne' | 'haute' | 'critique'
- `enveloppeId` : Source de financement

**Usage** : Engagements, factures, dépenses peuvent être liés à un projet pour suivi transversal.

### Fournisseurs

**Définition** : Entreprise ou personne fournissant biens/services

**Attributs** :
- Identification : `code`, `nom`, `typeFournisseur`, `categorie`
- Contact : `telephone`, `email`, `adresse`, `ville`, `pays`
- Informations légales : `registreCommerce`, `numeroContribuable`, `formeJuridique`
- Informations bancaires : `banque`, `numeroCompte`, `iban`, `codeSwift`
- Statistiques : `nombreEngagements`, `montantTotalEngage`, `dernierEngagementDate`

**Usage** : Lié aux engagements, factures, dépenses pour traçabilité fournisseur.

### Plan Comptable

**Définition** : Nomenclature des comptes comptables (système OHADA)

**Attributs** :
- `numero` : Numéro de compte (ex: "604100")
- `libelle` : Libellé (ex: "Fournitures de bureau")
- `type` : 'charge' | 'produit' | 'actif' | 'passif'
- `categorie` : 'fonctionnement' | 'investissement'
- `niveau` : Niveau hiérarchique (1, 2, 3, ...)
- `parentId` : Compte parent

**Usage** : Chaque ligne budgétaire est liée à un compte comptable.

### Structure Organisationnelle

**Définition** : Organigramme de la collectivité (ex: Directions, Services, Divisions)

**Attributs** :
- `code`, `nom`, `type` ('direction' | 'service' | 'division')
- `parentId` : Structure parente
- `responsable` : Nom du responsable

**Usage** : Peut être utilisé pour filtrage et reporting par direction/service.

---

## 🔗 Voir Aussi

- **[AGENTS.md](../AGENTS.md)** - Vue d'ensemble du projet
- **[AGENTS-PATTERNS.md](./AGENTS-PATTERNS.md)** - Patterns de code
- **[AGENTS-WORKFLOWS.md](./AGENTS-WORKFLOWS.md)** - Guides pratiques
- **[AGENTS-GOTCHAS.md](./AGENTS-GOTCHAS.md)** - Pièges à éviter

---

**✨ Comprendre le métier est essentiel pour intervenir efficacement sur AGILYS.**
