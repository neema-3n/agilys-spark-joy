import { differenceInCalendarDays, formatISO9075, isAfter, parseISO } from 'date-fns';
import type {
  ReportCategoryDefinition,
  ReportDefinition,
  ReportRow,
  ReportingBuildResult,
  ReportingDataContext,
} from '@/types/reporting';

const emptyResult = (message: string): ReportingBuildResult => ({
  availability: 'empty',
  rows: [],
  message,
});

const buildSearchText = (...values: Array<string | number | null | undefined>) =>
  values
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join(' ')
    .toLowerCase();

const currencyTemplates = [
  { id: 'standard', label: 'Standard' },
  { id: 'synthese', label: 'Synthese' },
];

const buildStructureMaps = (context: ReportingDataContext) => {
  const sectionById = new Map(context.sections.map((section) => [section.id, section]));
  const programmeById = new Map(context.programmes.map((programme) => [programme.id, programme]));
  const actionById = new Map(context.actions.map((action) => [action.id, action]));

  return {
    resolve(actionId?: string) {
      const action = actionId ? actionById.get(actionId) : undefined;
      const programme = action ? programmeById.get(action.programme_id) : undefined;
      const section = programme ? sectionById.get(programme.section_id) : undefined;

      return {
        action,
        programme,
        section,
        codeStructure:
          [section?.code, programme?.code, action?.code].filter(Boolean).join(' / ') || '—',
      };
    },
  };
};

const buildExecutionBudgetaire = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.lignesBudgetaires.length === 0) {
    return emptyResult('Aucune ligne budgétaire disponible sur cet exercice.');
  }

  const structureMaps = buildStructureMaps(context);
  const facturesByLigne = new Map<string, number>();
  const depensesByLigne = new Map<string, number>();

  context.factures
    .filter((facture) => facture.statut !== 'annulee')
    .forEach((facture) => {
      if (!facture.ligneBudgetaireId) return;
      facturesByLigne.set(
        facture.ligneBudgetaireId,
        (facturesByLigne.get(facture.ligneBudgetaireId) || 0) + facture.montantTTC,
      );
    });

  context.depenses
    .filter((depense) => depense.statut !== 'annulee')
    .forEach((depense) => {
      if (!depense.ligneBudgetaireId) return;
      depensesByLigne.set(
        depense.ligneBudgetaireId,
        (depensesByLigne.get(depense.ligneBudgetaireId) || 0) + depense.montant,
      );
    });

  const rows: ReportRow[] = context.lignesBudgetaires.map((ligne) => {
    const structure = structureMaps.resolve(ligne.actionId);
    const budgetRevise = ligne.montantModifie > 0 ? ligne.montantModifie : ligne.montantInitial;
    const virements = budgetRevise - ligne.montantInitial;
    const facture = facturesByLigne.get(ligne.id) || 0;
    const depense = depensesByLigne.get(ligne.id) || 0;
    const tauxExecution = budgetRevise > 0 ? (ligne.montantPaye / budgetRevise) * 100 : 0;

    return {
      id: ligne.id,
      cells: {
        codeStructure: structure.codeStructure,
        section: structure.section?.libelle || '—',
        programme: structure.programme?.libelle || '—',
        action: structure.action?.libelle || '—',
        ligneBudgetaire: ligne.id.slice(0, 8).toUpperCase(),
        libelleLigne: ligne.libelle,
        budgetInitial: ligne.montantInitial,
        virements,
        budgetRevise,
        reserve: ligne.montantReserve || 0,
        engage: ligne.montantEngage,
        facture,
        depense,
        paye: ligne.montantPaye,
        disponible: ligne.disponible,
        tauxExecution,
      },
      meta: {
        status: ligne.statut,
        searchText: buildSearchText(
          structure.codeStructure,
          structure.section?.libelle,
          structure.programme?.libelle,
          structure.action?.libelle,
          ligne.libelle,
        ),
      },
    };
  });

  return { availability: 'live', rows };
};

const buildCreditsDisponibles = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.lignesBudgetaires.length === 0) {
    return emptyResult('Aucune ligne budgétaire disponible sur cet exercice.');
  }

  const rows: ReportRow[] = context.lignesBudgetaires.map((ligne) => {
    const budgetAutorise = ligne.montantModifie > 0 ? ligne.montantModifie : ligne.montantInitial;
    const seuilAlerte = budgetAutorise * 0.1;
    const status =
      ligne.disponible < 0 ? 'Depassement' : ligne.disponible <= seuilAlerte ? 'Alerte' : 'OK';

    return {
      id: ligne.id,
      cells: {
        codeLigne: ligne.id.slice(0, 8).toUpperCase(),
        libelle: ligne.libelle,
        budgetAutorise,
        reserve: ligne.montantReserve || 0,
        engage: ligne.montantEngage,
        disponible: ligne.disponible,
        seuilAlerte,
        statut: status,
      },
      meta: {
        status,
        searchText: buildSearchText(ligne.libelle, status),
      },
    };
  });

  return { availability: 'live', rows };
};

const buildEtatEngagements = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.engagements.length === 0) {
    return emptyResult('Aucun engagement disponible sur cet exercice.');
  }

  const paidByEngagement = new Map<string, number>();
  context.depenses
    .filter((depense) => depense.statut === 'payee' || depense.statut === 'validee')
    .forEach((depense) => {
      if (!depense.engagementId) return;
      paidByEngagement.set(
        depense.engagementId,
        (paidByEngagement.get(depense.engagementId) || 0) + (depense.montantPaye || depense.montant),
      );
    });

  const rows: ReportRow[] = context.engagements.map((engagement) => {
    const montantPaye = paidByEngagement.get(engagement.id) || 0;
    return {
      id: engagement.id,
      cells: {
        referenceEngagement: engagement.numero,
        date: engagement.dateCreation,
        objet: engagement.objet,
        fournisseur: engagement.fournisseur?.nom || engagement.beneficiaire || '—',
        ligneBudgetaire: engagement.ligneBudgetaire?.libelle || '—',
        montantEngage: engagement.montant,
        montantPaye,
        soldeEngagement: engagement.montant - montantPaye,
        statut: engagement.statut,
      },
      meta: {
        date: engagement.dateCreation,
        projectId: engagement.projetId,
        status: engagement.statut,
        searchText: buildSearchText(
          engagement.numero,
          engagement.objet,
          engagement.fournisseur?.nom,
          engagement.beneficiaire,
          engagement.ligneBudgetaire?.libelle,
        ),
      },
    };
  });

  return { availability: 'live', rows };
};

const buildVirementsBudgetaires = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.modificationsBudgetaires.length === 0) {
    return emptyResult('Aucun virement budgétaire disponible sur cet exercice.');
  }

  const lineById = new Map(context.lignesBudgetaires.map((ligne) => [ligne.id, ligne]));
  const rows: ReportRow[] = context.modificationsBudgetaires.map((modification) => ({
    id: modification.id,
    cells: {
      reference: modification.numero,
      date: modification.dateCreation,
      ligneSource: modification.ligneSourceId
        ? lineById.get(modification.ligneSourceId)?.libelle || '—'
        : '—',
      ligneDestination: lineById.get(modification.ligneDestinationId)?.libelle || '—',
      montant: modification.montant,
      motif: modification.motif,
      validateur: modification.validePar || '—',
    },
    meta: {
      date: modification.dateCreation,
      status: modification.statut,
      searchText: buildSearchText(modification.numero, modification.motif),
    },
  }));

  return { availability: 'live', rows };
};

const buildEtatDepenses = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.depenses.length === 0) {
    return emptyResult('Aucune dépense disponible sur cet exercice.');
  }

  const rows: ReportRow[] = context.depenses.map((depense) => ({
    id: depense.id,
    cells: {
      referenceDepense: depense.numero,
      date: depense.dateDepense,
      nature: depense.natureCompteChargeId || depense.compteChargeId || 'Charge',
      beneficiaire: depense.fournisseur?.nom || depense.beneficiaire || '—',
      objet: depense.objet,
      montant: depense.montant,
      sourceFinancement: depense.ligneBudgetaire?.libelle || '—',
      statut: depense.statut,
    },
    meta: {
      date: depense.dateDepense,
      projectId: depense.projetId,
      status: depense.statut,
      sourceFinancement: depense.ligneBudgetaire?.libelle,
      searchText: buildSearchText(
        depense.numero,
        depense.objet,
        depense.fournisseur?.nom,
        depense.beneficiaire,
      ),
    },
  }));

  return { availability: 'live', rows };
};

const buildEtatRecettes = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.recettes.length === 0) {
    return emptyResult('Aucune recette disponible sur cet exercice.');
  }

  const rows: ReportRow[] = context.recettes.map((recette) => ({
    id: recette.id,
    cells: {
      referenceRecette: recette.numero,
      date: recette.dateRecette,
      typeRecette: recette.categorie || 'Recette',
      source: recette.sourceRecette,
      montant: recette.montant,
      projet: context.projets.find((projet) => projet.id === recette.reference)?.nom || '—',
      compteTresorerie: recette.compteDestination
        ? `${recette.compteDestination.code} - ${recette.compteDestination.libelle}`
        : '—',
    },
    meta: {
      date: recette.dateRecette,
      status: recette.statut,
      sourceFinancement: recette.sourceRecette,
      searchText: buildSearchText(recette.numero, recette.sourceRecette, recette.libelle),
    },
  }));

  return { availability: 'live', rows };
};

const buildUtilisationFinancements = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.projets.length === 0) {
    return emptyResult('Aucun projet disponible pour ventiler les financements.');
  }

  const rows: ReportRow[] = context.projets.map((projet) => {
    const montantPrevu = context.engagements
      .filter((engagement) => engagement.projetId === projet.id && engagement.statut !== 'annule')
      .reduce((sum, engagement) => sum + engagement.montant, 0);
    const montantConsomme = context.depenses
      .filter((depense) => depense.projetId === projet.id && depense.statut !== 'annulee')
      .reduce((sum, depense) => sum + depense.montant, 0);
    const disponible = montantPrevu - montantConsomme;

    return {
      id: projet.id,
      cells: {
        bailleur: 'À parametrer',
        projet: `${projet.code} - ${projet.nom}`,
        montantPrevu,
        montantConsomme,
        disponible,
        tauxConsommation: montantPrevu > 0 ? (montantConsomme / montantPrevu) * 100 : 0,
      },
      meta: {
        projectId: projet.id,
        bailleur: 'À parametrer',
        searchText: buildSearchText(projet.code, projet.nom),
      },
    };
  });

  return {
    availability: 'partial',
    rows,
    message:
      'Les montants sont calculés à partir des engagements et dépenses. La ventilation bailleur reste à paramétrer.',
  };
};

const buildEtatDettesFournisseurs = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.factures.length === 0) {
    return emptyResult('Aucune facture disponible sur cet exercice.');
  }

  const rows: ReportRow[] = context.factures
    .filter((facture) => facture.statut !== 'annulee')
    .map((facture) => {
      const paye = facture.montantLiquide || 0;
      const solde = facture.montantTTC - paye;
      const retard =
        facture.dateEcheance && solde > 0 && isAfter(new Date(), parseISO(facture.dateEcheance))
          ? differenceInCalendarDays(new Date(), parseISO(facture.dateEcheance))
          : 0;

      return {
        id: facture.id,
        cells: {
          fournisseur: facture.fournisseur?.nom || '—',
          referenceFacture: facture.numeroFactureFournisseur || facture.numero,
          date: facture.dateFacture,
          montantFacture: facture.montantTTC,
          paye,
          solde,
          echeance: facture.dateEcheance || '—',
          retard,
        },
        meta: {
          date: facture.dateFacture,
          projectId: facture.projetId,
          status: facture.statut,
          searchText: buildSearchText(
            facture.fournisseur?.nom,
            facture.numero,
            facture.numeroFactureFournisseur,
            facture.objet,
          ),
        },
      };
    });

  return { availability: 'live', rows };
};

const buildBalanceComptable = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.ecritures.length === 0) {
    return emptyResult('Aucune écriture comptable disponible sur cet exercice.');
  }

  const accountMap = new Map<
    string,
    { compte: string; libelle: string; debit: number; credit: number; classe: string; rubrique: string }
  >();

  context.ecritures.forEach((ecriture) => {
    if (ecriture.compteDebit) {
      const current = accountMap.get(ecriture.compteDebit.numero) || {
        compte: ecriture.compteDebit.numero,
        libelle: ecriture.compteDebit.libelle,
        debit: 0,
        credit: 0,
        classe: ecriture.compteDebit.numero.charAt(0),
        rubrique: 'À parametrer',
      };
      current.debit += ecriture.montant;
      accountMap.set(ecriture.compteDebit.numero, current);
    }
    if (ecriture.compteCredit) {
      const current = accountMap.get(ecriture.compteCredit.numero) || {
        compte: ecriture.compteCredit.numero,
        libelle: ecriture.compteCredit.libelle,
        debit: 0,
        credit: 0,
        classe: ecriture.compteCredit.numero.charAt(0),
        rubrique: 'À parametrer',
      };
      current.credit += ecriture.montant;
      accountMap.set(ecriture.compteCredit.numero, current);
    }
  });

  const rows: ReportRow[] = Array.from(accountMap.values())
    .sort((left, right) => left.compte.localeCompare(right.compte))
    .map((entry) => ({
      id: entry.compte,
      cells: {
        compte: entry.compte,
        libelle: entry.libelle,
        debit: entry.debit,
        credit: entry.credit,
        solde: entry.debit - entry.credit,
        classe: entry.classe,
        rubrique: entry.rubrique,
      },
      meta: {
        searchText: buildSearchText(entry.compte, entry.libelle),
      },
    }));

  return {
    availability: 'partial',
    rows,
    message:
      'La balance est alimentée en direct depuis les écritures. Les rubriques réglementaires restent à paramétrer.',
  };
};

const buildGrandLivre = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.ecritures.length === 0) {
    return emptyResult('Aucune écriture comptable disponible sur cet exercice.');
  }

  let runningBalance = 0;
  const rows: ReportRow[] = [...context.ecritures]
    .sort((left, right) => {
      const leftKey = `${left.dateEcriture}-${left.numeroPiece}-${String(left.numeroLigne).padStart(4, '0')}`;
      const rightKey = `${right.dateEcriture}-${right.numeroPiece}-${String(right.numeroLigne).padStart(4, '0')}`;
      return leftKey.localeCompare(rightKey);
    })
    .map((ecriture) => {
      runningBalance += ecriture.montant;
      return {
        id: ecriture.id,
        cells: {
          date: ecriture.dateEcriture,
          journal: ecriture.typeOperation.replace('_', ' '),
          reference: ecriture.numeroPiece,
          piece: `${ecriture.numeroPiece}-${ecriture.numeroLigne}`,
          libelle: ecriture.libelle,
          debit: ecriture.compteDebit ? ecriture.montant : 0,
          credit: ecriture.compteCredit ? ecriture.montant : 0,
          solde: runningBalance,
        },
        meta: {
          date: ecriture.dateEcriture,
          searchText: buildSearchText(
            ecriture.numeroPiece,
            ecriture.libelle,
            ecriture.compteDebit?.numero,
            ecriture.compteCredit?.numero,
          ),
        },
      };
    });

  return { availability: 'live', rows };
};

const buildJournalGeneral = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.ecritures.length === 0) {
    return emptyResult('Aucune écriture comptable disponible sur cet exercice.');
  }

  const rows: ReportRow[] = context.ecritures.map((ecriture) => ({
    id: ecriture.id,
    cells: {
      date: ecriture.dateEcriture,
      journal: ecriture.typeOperation.replace('_', ' '),
      reference: ecriture.numeroPiece,
      compte: [ecriture.compteDebit?.numero, ecriture.compteCredit?.numero].filter(Boolean).join(' / '),
      libelle: ecriture.libelle,
      debit: ecriture.compteDebit ? ecriture.montant : 0,
      credit: ecriture.compteCredit ? ecriture.montant : 0,
    },
    meta: {
      date: ecriture.dateEcriture,
      searchText: buildSearchText(ecriture.numeroPiece, ecriture.libelle),
    },
  }));

  return { availability: 'live', rows };
};

const buildFicheFournisseurComptable = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.factures.length === 0) {
    return emptyResult('Aucune facture fournisseur disponible sur cet exercice.');
  }

  const supplierMap = new Map<
    string,
    { fournisseur: string; reference: string; debit: number; credit: number }
  >();

  context.factures
    .filter((facture) => facture.statut !== 'annulee')
    .forEach((facture) => {
      const key = facture.fournisseur?.nom || 'Fournisseur non renseigné';
      const current = supplierMap.get(key) || {
        fournisseur: key,
        reference: facture.numero,
        debit: 0,
        credit: 0,
      };
      current.credit += facture.montantTTC;
      current.debit += facture.montantLiquide || 0;
      supplierMap.set(key, current);
    });

  const rows: ReportRow[] = Array.from(supplierMap.values()).map((entry) => ({
    id: entry.fournisseur,
    cells: {
      fournisseur: entry.fournisseur,
      reference: entry.reference,
      debit: entry.debit,
      credit: entry.credit,
      solde: entry.credit - entry.debit,
    },
    meta: {
      searchText: buildSearchText(entry.fournisseur, entry.reference),
    },
  }));

  return {
    availability: 'partial',
    rows,
    message:
      'La fiche fournisseur comptable est reconstituée à partir des factures et liquidations disponibles.',
  };
};

const buildJournalTresorerie = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.operationsTresorerie.length === 0) {
    return emptyResult('Aucune opération de trésorerie disponible sur cet exercice.');
  }

  let runningBalance = 0;
  const rows: ReportRow[] = [...context.operationsTresorerie]
    .sort((left, right) => `${left.dateOperation}-${left.numero}`.localeCompare(`${right.dateOperation}-${right.numero}`))
    .map((operation) => {
      const entree = operation.typeOperation === 'encaissement' ? operation.montant : 0;
      const sortie = operation.typeOperation === 'decaissement' ? operation.montant : 0;
      runningBalance += entree - sortie;
      return {
        id: operation.id,
        cells: {
          date: operation.dateOperation,
          reference: operation.numero,
          typeOperation: operation.typeOperation,
          compte: operation.compte ? `${operation.compte.code} - ${operation.compte.libelle}` : '—',
          libelle: operation.libelle,
          entree,
          sortie,
          solde: runningBalance,
        },
        meta: {
          date: operation.dateOperation,
          status: operation.statut,
          searchText: buildSearchText(operation.numero, operation.libelle, operation.compte?.libelle),
        },
      };
    });

  return { availability: 'live', rows };
};

const buildSituationComptes = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.comptesTresorerie.length === 0) {
    return emptyResult('Aucun compte de trésorerie disponible sur cet exercice.');
  }

  const rows: ReportRow[] = context.comptesTresorerie.map((compte) => {
    const entrees = context.operationsTresorerie
      .filter((operation) => operation.compteId === compte.id && operation.typeOperation === 'encaissement')
      .reduce((sum, operation) => sum + operation.montant, 0);
    const sorties = context.operationsTresorerie
      .filter((operation) => operation.compteId === compte.id && operation.typeOperation === 'decaissement')
      .reduce((sum, operation) => sum + operation.montant, 0);

    return {
      id: compte.id,
      cells: {
        compte: `${compte.code} - ${compte.libelle}`,
        banque: compte.banque || compte.type,
        soldeInitial: compte.soldeInitial,
        entrees,
        sorties,
        soldeFinal: compte.soldeActuel,
      },
      meta: {
        status: compte.statut,
        devise: compte.devise,
        searchText: buildSearchText(compte.code, compte.libelle, compte.banque),
      },
    };
  });

  return { availability: 'live', rows };
};

const buildPrevisionTresorerie = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.operationsTresorerie.length === 0) {
    return emptyResult('Aucune opération de trésorerie disponible pour projeter un solde.');
  }

  let projectedBalance = 0;
  const rows: ReportRow[] = [...context.operationsTresorerie]
    .sort((left, right) => `${left.dateOperation}-${left.numero}`.localeCompare(`${right.dateOperation}-${right.numero}`))
    .map((operation) => {
      const encaissementPrevu = operation.typeOperation === 'encaissement' ? operation.montant : 0;
      const decaissementPrevu = operation.typeOperation === 'decaissement' ? operation.montant : 0;
      projectedBalance += encaissementPrevu - decaissementPrevu;

      return {
        id: operation.id,
        cells: {
          datePrevue: operation.dateOperation,
          reference: operation.numero,
          nature: operation.categorie || operation.typeOperation,
          encaissementPrevu,
          decaissementPrevu,
          soldeProjete: projectedBalance,
        },
        meta: {
          date: operation.dateOperation,
          searchText: buildSearchText(operation.numero, operation.categorie, operation.libelle),
        },
      };
    });

  return {
    availability: 'partial',
    rows,
    message:
      'La projection s’appuie sur les opérations enregistrées. Les prévisions de trésorerie avancées restent à enrichir.',
  };
};

const buildRapprochementBancaire = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.rapprochementsBancaires.length === 0) {
    return emptyResult('Aucun rapprochement bancaire disponible sur cet exercice.');
  }

  const rows: ReportRow[] = context.rapprochementsBancaires.map((rapprochement) => ({
    id: rapprochement.id,
    cells: {
      referenceInterne: rapprochement.numero,
      referenceBanque: rapprochement.compte?.code || '—',
      date: `${rapprochement.dateDebut} → ${rapprochement.dateFin}`,
      montantInterne: rapprochement.soldeComptable,
      montantBanque: rapprochement.soldeReleve,
      ecart: rapprochement.ecart,
      statutRapprochement: rapprochement.statut,
    },
    meta: {
      date: rapprochement.dateFin,
      status: rapprochement.statut,
      searchText: buildSearchText(rapprochement.numero, rapprochement.compte?.libelle),
    },
  }));

  return { availability: 'live', rows };
};

const buildDSF = (context: ReportingDataContext): ReportingBuildResult => {
  const balance = buildBalanceComptable(context);
  if (balance.rows.length === 0) {
    return emptyResult('Aucune donnée comptable disponible pour préparer la DSF.');
  }

  const rows = balance.rows.map((row) => ({
    ...row,
    cells: {
      compte: row.cells.compte,
      libelle: row.cells.libelle,
      debit: row.cells.debit,
      credit: row.cells.credit,
      solde: row.cells.solde,
      rubriqueDSF: row.cells.rubrique,
    },
  }));

  return {
    availability: 'partial',
    rows,
    message:
      'La DSF reprend la balance comptable disponible. Les rubriques DSF restent à paramétrer dans le référentiel.',
  };
};

const buildCompteEmploiRessources = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.recettes.length === 0) {
    return emptyResult('Aucune ressource enregistrée pour calculer le compte d’emploi.');
  }

  const sourceMap = new Map<string, { budget: number; ressources: number; emplois: number }>();

  context.recettes
    .filter((recette) => recette.statut === 'validee')
    .forEach((recette) => {
      const key = recette.sourceRecette || 'Non renseignée';
      const current = sourceMap.get(key) || { budget: 0, ressources: 0, emplois: 0 };
      current.ressources += recette.montant;
      sourceMap.set(key, current);
    });

  const rows: ReportRow[] = Array.from(sourceMap.entries()).map(([source, data]) => ({
    id: source,
    cells: {
      sourceFinancement: source,
      budgetPrevu: data.budget,
      ressourcesRecues: data.ressources,
      emploisRealises: data.emplois,
      solde: data.ressources - data.emplois,
    },
    meta: {
      sourceFinancement: source,
      searchText: buildSearchText(source),
    },
  }));

  return {
    availability: 'partial',
    rows,
    message:
      'Le rapport est initialisé à partir des recettes. Le rapprochement complet ressources/emplois reste à compléter côté financement.',
  };
};

const buildRapportBailleur = (context: ReportingDataContext): ReportingBuildResult => {
  if (context.projets.length === 0) {
    return emptyResult('Aucun projet disponible pour produire un rapport bailleur.');
  }

  const rows: ReportRow[] = context.projets.map((projet) => {
    const budget = context.engagements
      .filter((engagement) => engagement.projetId === projet.id && engagement.statut !== 'annule')
      .reduce((sum, engagement) => sum + engagement.montant, 0);
    const depense = context.depenses
      .filter((item) => item.projetId === projet.id && item.statut !== 'annulee')
      .reduce((sum, item) => sum + item.montant, 0);

    return {
      id: projet.id,
      cells: {
        projet: `${projet.code} - ${projet.nom}`,
        activite: 'À parametrer',
        budget,
        depense,
        solde: budget - depense,
        justificatifs: context.factures.filter((facture) => facture.projetId === projet.id).length,
      },
      meta: {
        projectId: projet.id,
        bailleur: 'À parametrer',
        searchText: buildSearchText(projet.code, projet.nom),
      },
    };
  });

  return {
    availability: 'partial',
    rows,
    message:
      'Le rapport bailleur est disponible comme base projet. Les champs bailleur et activité restent à structurer.',
  };
};

export const reportCategories: ReportCategoryDefinition[] = [
  {
    id: 'budgetaire',
    label: 'Budgétaire',
    objective: 'Suivre l’autorisation budgétaire et sa consommation.',
  },
  {
    id: 'financier',
    label: 'Financier',
    objective: 'Vision consolidée des flux financiers.',
  },
  {
    id: 'comptable',
    label: 'Comptable',
    objective: 'Production comptable OHADA/SYCEBNL.',
  },
  {
    id: 'tresorerie',
    label: 'Trésorerie',
    objective: 'Suivi des mouvements monétaires.',
  },
  {
    id: 'reglementaire',
    label: 'Réglementaire',
    objective: 'Répondre aux obligations légales et bailleurs.',
  },
];

export const reportDefinitions: ReportDefinition[] = [
  {
    id: 'execution-budgetaire',
    categoryId: 'budgetaire',
    label: 'Exécution budgétaire',
    description: 'Suivi détaillé du budget, des virements et de la consommation par ligne budgétaire.',
    columns: [
      { id: 'codeStructure', label: 'Code structure' },
      { id: 'section', label: 'Section' },
      { id: 'programme', label: 'Programme' },
      { id: 'action', label: 'Action' },
      { id: 'ligneBudgetaire', label: 'Ligne budgétaire' },
      { id: 'libelleLigne', label: 'Libellé ligne' },
      { id: 'budgetInitial', label: 'Budget initial', kind: 'currency', align: 'right' },
      { id: 'virements', label: 'Virements (+/-)', kind: 'currency', align: 'right' },
      { id: 'budgetRevise', label: 'Budget révisé', kind: 'currency', align: 'right' },
      { id: 'reserve', label: 'Réservé', kind: 'currency', align: 'right' },
      { id: 'engage', label: 'Engagé', kind: 'currency', align: 'right' },
      { id: 'facture', label: 'Facturé', kind: 'currency', align: 'right' },
      { id: 'depense', label: 'Dépensé', kind: 'currency', align: 'right' },
      { id: 'paye', label: 'Payé', kind: 'currency', align: 'right' },
      { id: 'disponible', label: 'Disponible', kind: 'currency', align: 'right' },
      { id: 'tauxExecution', label: 'Taux exécution (%)', kind: 'percent', align: 'right' },
    ],
    outputTemplates: [
      { id: 'standard', label: 'Execution standard' },
      {
        id: 'synthese',
        label: 'Synthese budgetaire',
        columnIds: [
          'codeStructure',
          'libelleLigne',
          'budgetRevise',
          'engage',
          'paye',
          'disponible',
          'tauxExecution',
        ],
      },
    ],
    build: buildExecutionBudgetaire,
  },
  {
    id: 'credits-disponibles',
    categoryId: 'budgetaire',
    label: 'Crédits disponibles',
    description: 'Contrôle du disponible et détection des lignes sous seuil d’alerte.',
    columns: [
      { id: 'codeLigne', label: 'Code ligne' },
      { id: 'libelle', label: 'Libellé' },
      { id: 'budgetAutorise', label: 'Budget autorisé', kind: 'currency', align: 'right' },
      { id: 'reserve', label: 'Réservé', kind: 'currency', align: 'right' },
      { id: 'engage', label: 'Engagé', kind: 'currency', align: 'right' },
      { id: 'disponible', label: 'Disponible', kind: 'currency', align: 'right' },
      { id: 'seuilAlerte', label: 'Seuil alerte', kind: 'currency', align: 'right' },
      { id: 'statut', label: 'Statut', kind: 'status', align: 'center' },
    ],
    outputTemplates: currencyTemplates,
    build: buildCreditsDisponibles,
  },
  {
    id: 'etat-engagements',
    categoryId: 'budgetaire',
    label: 'Etat des engagements',
    description: 'Suivi des montants engagés, payés et soldes par engagement.',
    columns: [
      { id: 'referenceEngagement', label: 'Référence engagement' },
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'objet', label: 'Objet' },
      { id: 'fournisseur', label: 'Fournisseur' },
      { id: 'ligneBudgetaire', label: 'Ligne budgétaire' },
      { id: 'montantEngage', label: 'Montant engagé', kind: 'currency', align: 'right' },
      { id: 'montantPaye', label: 'Montant payé', kind: 'currency', align: 'right' },
      { id: 'soldeEngagement', label: 'Solde engagement', kind: 'currency', align: 'right' },
      { id: 'statut', label: 'Statut', kind: 'status', align: 'center' },
    ],
    outputTemplates: currencyTemplates,
    build: buildEtatEngagements,
  },
  {
    id: 'virements-budgetaires',
    categoryId: 'budgetaire',
    label: 'Virements budgétaires',
    description: 'Historique des mouvements de crédits entre lignes budgétaires.',
    columns: [
      { id: 'reference', label: 'Référence' },
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'ligneSource', label: 'Ligne source' },
      { id: 'ligneDestination', label: 'Ligne destination' },
      { id: 'montant', label: 'Montant', kind: 'currency', align: 'right' },
      { id: 'motif', label: 'Motif' },
      { id: 'validateur', label: 'Validateur' },
    ],
    outputTemplates: [{ id: 'standard', label: 'Journal des virements' }],
    build: buildVirementsBudgetaires,
  },
  {
    id: 'etat-depenses',
    categoryId: 'financier',
    label: 'Etat des dépenses',
    description: 'Vision consolidée des dépenses, bénéficiaires et sources de financement.',
    columns: [
      { id: 'referenceDepense', label: 'Référence dépense' },
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'nature', label: 'Nature' },
      { id: 'beneficiaire', label: 'Bénéficiaire' },
      { id: 'objet', label: 'Objet' },
      { id: 'montant', label: 'Montant', kind: 'currency', align: 'right' },
      { id: 'sourceFinancement', label: 'Source financement' },
      { id: 'statut', label: 'Statut', kind: 'status', align: 'center' },
    ],
    outputTemplates: currencyTemplates,
    build: buildEtatDepenses,
  },
  {
    id: 'etat-recettes',
    categoryId: 'financier',
    label: 'Etat des recettes',
    description: 'Suivi des recettes par source, montant et compte de trésorerie.',
    columns: [
      { id: 'referenceRecette', label: 'Référence recette' },
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'typeRecette', label: 'Type recette' },
      { id: 'source', label: 'Source' },
      { id: 'montant', label: 'Montant', kind: 'currency', align: 'right' },
      { id: 'projet', label: 'Projet' },
      { id: 'compteTresorerie', label: 'Compte trésorerie' },
    ],
    outputTemplates: currencyTemplates,
    build: buildEtatRecettes,
  },
  {
    id: 'utilisation-financements',
    categoryId: 'financier',
    label: 'Utilisation des financements',
    description: 'Consommation des financements par projet, avec taux de consommation.',
    columns: [
      { id: 'bailleur', label: 'Bailleur' },
      { id: 'projet', label: 'Projet' },
      { id: 'montantPrevu', label: 'Montant prévu', kind: 'currency', align: 'right' },
      { id: 'montantConsomme', label: 'Montant consommé', kind: 'currency', align: 'right' },
      { id: 'disponible', label: 'Disponible', kind: 'currency', align: 'right' },
      { id: 'tauxConsommation', label: 'Taux consommation', kind: 'percent', align: 'right' },
    ],
    outputTemplates: [{ id: 'standard', label: 'Suivi projet' }],
    build: buildUtilisationFinancements,
  },
  {
    id: 'dettes-fournisseurs',
    categoryId: 'financier',
    label: 'Etat des dettes fournisseurs',
    description: 'Suivi des soldes fournisseurs, des échéances et des retards.',
    columns: [
      { id: 'fournisseur', label: 'Fournisseur' },
      { id: 'referenceFacture', label: 'Référence facture' },
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'montantFacture', label: 'Montant facture', kind: 'currency', align: 'right' },
      { id: 'paye', label: 'Payé', kind: 'currency', align: 'right' },
      { id: 'solde', label: 'Solde', kind: 'currency', align: 'right' },
      { id: 'echeance', label: 'Échéance' },
      { id: 'retard', label: 'Retard', kind: 'number', align: 'right' },
    ],
    outputTemplates: [
      { id: 'standard', label: 'Dettes standard' },
      {
        id: 'echeances',
        label: 'Vue échéances',
        columnIds: ['fournisseur', 'referenceFacture', 'echeance', 'montantFacture', 'solde', 'retard'],
      },
    ],
    build: buildEtatDettesFournisseurs,
  },
  {
    id: 'balance-comptable',
    categoryId: 'comptable',
    label: 'Balance comptable',
    description: 'Balance agrégée des comptes, prête pour des sorties 6 ou 8 colonnes.',
    columns: [
      { id: 'compte', label: 'Compte' },
      { id: 'libelle', label: 'Libellé' },
      { id: 'debit', label: 'Débit', kind: 'currency', align: 'right' },
      { id: 'credit', label: 'Crédit', kind: 'currency', align: 'right' },
      { id: 'solde', label: 'Solde', kind: 'currency', align: 'right' },
      { id: 'classe', label: 'Classe' },
      { id: 'rubrique', label: 'Rubrique' },
    ],
    outputTemplates: [
      { id: 'balance-6', label: 'Balance 6 colonnes', columnIds: ['compte', 'libelle', 'debit', 'credit', 'solde'] },
      {
        id: 'balance-8',
        label: 'Balance 8 colonnes détaillée',
        columnIds: ['compte', 'libelle', 'debit', 'credit', 'solde', 'classe', 'rubrique'],
      },
      {
        id: 'balance-audit',
        label: 'Balance audit',
        columnIds: ['compte', 'libelle', 'classe', 'debit', 'credit', 'solde', 'rubrique'],
      },
    ],
    build: buildBalanceComptable,
  },
  {
    id: 'grand-livre',
    categoryId: 'comptable',
    label: 'Grand livre',
    description: 'Grand livre chronologique des écritures avec solde courant.',
    columns: [
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'journal', label: 'Journal' },
      { id: 'reference', label: 'Référence' },
      { id: 'piece', label: 'Pièce' },
      { id: 'libelle', label: 'Libellé' },
      { id: 'debit', label: 'Débit', kind: 'currency', align: 'right' },
      { id: 'credit', label: 'Crédit', kind: 'currency', align: 'right' },
      { id: 'solde', label: 'Solde', kind: 'currency', align: 'right' },
    ],
    outputTemplates: [{ id: 'detail', label: 'Grand livre détaillé' }],
    build: buildGrandLivre,
  },
  {
    id: 'journal-general',
    categoryId: 'comptable',
    label: 'Journal général',
    description: 'Journal comptable complet de toutes les pièces et écritures.',
    columns: [
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'journal', label: 'Journal' },
      { id: 'reference', label: 'Référence' },
      { id: 'compte', label: 'Compte' },
      { id: 'libelle', label: 'Libellé' },
      { id: 'debit', label: 'Débit', kind: 'currency', align: 'right' },
      { id: 'credit', label: 'Crédit', kind: 'currency', align: 'right' },
    ],
    outputTemplates: [{ id: 'journal-standard', label: 'Journal standard' }],
    build: buildJournalGeneral,
  },
  {
    id: 'fiche-fournisseur-comptable',
    categoryId: 'comptable',
    label: 'Fiche fournisseur comptable',
    description: 'Vue fournisseur reconstituée à partir des factures et montants liquidés.',
    columns: [
      { id: 'fournisseur', label: 'Fournisseur' },
      { id: 'reference', label: 'Référence' },
      { id: 'debit', label: 'Débit', kind: 'currency', align: 'right' },
      { id: 'credit', label: 'Crédit', kind: 'currency', align: 'right' },
      { id: 'solde', label: 'Solde', kind: 'currency', align: 'right' },
    ],
    outputTemplates: [{ id: 'fournisseur-standard', label: 'Fiche standard' }],
    build: buildFicheFournisseurComptable,
  },
  {
    id: 'journal-tresorerie',
    categoryId: 'tresorerie',
    label: 'Journal de trésorerie',
    description: 'Historique des encaissements, décaissements et soldes courants.',
    columns: [
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'reference', label: 'Référence' },
      { id: 'typeOperation', label: 'Type opération' },
      { id: 'compte', label: 'Compte' },
      { id: 'libelle', label: 'Libellé' },
      { id: 'entree', label: 'Entrée', kind: 'currency', align: 'right' },
      { id: 'sortie', label: 'Sortie', kind: 'currency', align: 'right' },
      { id: 'solde', label: 'Solde', kind: 'currency', align: 'right' },
    ],
    outputTemplates: [{ id: 'journal-standard', label: 'Journal standard' }],
    build: buildJournalTresorerie,
  },
  {
    id: 'situation-comptes',
    categoryId: 'tresorerie',
    label: 'Situation des comptes',
    description: 'Photographie des soldes et mouvements par compte de trésorerie.',
    columns: [
      { id: 'compte', label: 'Compte' },
      { id: 'banque', label: 'Banque' },
      { id: 'soldeInitial', label: 'Solde initial', kind: 'currency', align: 'right' },
      { id: 'entrees', label: 'Entrées', kind: 'currency', align: 'right' },
      { id: 'sorties', label: 'Sorties', kind: 'currency', align: 'right' },
      { id: 'soldeFinal', label: 'Solde final', kind: 'currency', align: 'right' },
    ],
    outputTemplates: [{ id: 'standard', label: 'Situation standard' }],
    build: buildSituationComptes,
  },
  {
    id: 'prevision-tresorerie',
    categoryId: 'tresorerie',
    label: 'Prévision trésorerie',
    description: 'Projection des encaissements, décaissements et soldes futurs.',
    columns: [
      { id: 'datePrevue', label: 'Date prévue', kind: 'date' },
      { id: 'reference', label: 'Référence' },
      { id: 'nature', label: 'Nature' },
      { id: 'encaissementPrevu', label: 'Encaissement prévu', kind: 'currency', align: 'right' },
      { id: 'decaissementPrevu', label: 'Décaissement prévu', kind: 'currency', align: 'right' },
      { id: 'soldeProjete', label: 'Solde projeté', kind: 'currency', align: 'right' },
    ],
    outputTemplates: [{ id: 'projection-standard', label: 'Projection standard' }],
    build: buildPrevisionTresorerie,
  },
  {
    id: 'rapprochement-bancaire',
    categoryId: 'tresorerie',
    label: 'Rapprochement bancaire',
    description: 'Suivi des écarts entre relevés bancaires et comptabilité interne.',
    columns: [
      { id: 'referenceInterne', label: 'Référence interne' },
      { id: 'referenceBanque', label: 'Référence banque' },
      { id: 'date', label: 'Date' },
      { id: 'montantInterne', label: 'Montant interne', kind: 'currency', align: 'right' },
      { id: 'montantBanque', label: 'Montant banque', kind: 'currency', align: 'right' },
      { id: 'ecart', label: 'Écart', kind: 'currency', align: 'right' },
      { id: 'statutRapprochement', label: 'Statut rapprochement', kind: 'status', align: 'center' },
    ],
    outputTemplates: [{ id: 'standard', label: 'Rapprochement standard' }],
    build: buildRapprochementBancaire,
  },
  {
    id: 'dsf',
    categoryId: 'reglementaire',
    label: 'DSF',
    description: 'Préparation de la DSF à partir de la balance et des rubriques réglementaires.',
    columns: [
      { id: 'compte', label: 'Compte' },
      { id: 'libelle', label: 'Libellé' },
      { id: 'debit', label: 'Débit', kind: 'currency', align: 'right' },
      { id: 'credit', label: 'Crédit', kind: 'currency', align: 'right' },
      { id: 'solde', label: 'Solde', kind: 'currency', align: 'right' },
      { id: 'rubriqueDSF', label: 'Rubrique DSF' },
    ],
    outputTemplates: [{ id: 'dsf-standard', label: 'DSF standard' }],
    build: buildDSF,
  },
  {
    id: 'compte-emploi-ressources',
    categoryId: 'reglementaire',
    label: 'Compte d’emploi des ressources',
    description: 'Lecture des ressources reçues et des emplois réalisés par source de financement.',
    columns: [
      { id: 'sourceFinancement', label: 'Source financement' },
      { id: 'budgetPrevu', label: 'Budget prévu', kind: 'currency', align: 'right' },
      { id: 'ressourcesRecues', label: 'Ressources reçues', kind: 'currency', align: 'right' },
      { id: 'emploisRealises', label: 'Emplois réalisés', kind: 'currency', align: 'right' },
      { id: 'solde', label: 'Solde', kind: 'currency', align: 'right' },
    ],
    outputTemplates: [{ id: 'cer-standard', label: 'CER standard' }],
    build: buildCompteEmploiRessources,
  },
  {
    id: 'rapport-bailleur',
    categoryId: 'reglementaire',
    label: 'Rapport bailleur',
    description: 'Pilotage projet/bailleur avec budget, dépenses, solde et justificatifs.',
    columns: [
      { id: 'projet', label: 'Projet' },
      { id: 'activite', label: 'Activité' },
      { id: 'budget', label: 'Budget', kind: 'currency', align: 'right' },
      { id: 'depense', label: 'Dépense', kind: 'currency', align: 'right' },
      { id: 'solde', label: 'Solde', kind: 'currency', align: 'right' },
      { id: 'justificatifs', label: 'Justificatifs', kind: 'number', align: 'right' },
    ],
    outputTemplates: [{ id: 'bailleur-standard', label: 'Rapport standard' }],
    build: buildRapportBailleur,
  },
  {
    id: 'immobilisations',
    categoryId: 'reglementaire',
    label: 'Etat des immobilisations',
    description: 'Inventaire réglementaire des immobilisations et des amortissements.',
    columns: [
      { id: 'codeImmobilisation', label: 'Code immobilisation' },
      { id: 'designation', label: 'Désignation' },
      { id: 'dateAcquisition', label: 'Date acquisition', kind: 'date' },
      { id: 'valeurAcquisition', label: 'Valeur acquisition', kind: 'currency', align: 'right' },
      { id: 'amortissement', label: 'Amortissement', kind: 'currency', align: 'right' },
      { id: 'valeurNette', label: 'Valeur nette', kind: 'currency', align: 'right' },
    ],
    outputTemplates: [{ id: 'immobilisations-standard', label: 'Etat standard' }],
    build: () =>
      emptyResult(
        'Le module immobilisations n’est pas encore structuré dans AGILYS. Le rapport est réservé pour une prochaine itération.',
      ),
  },
  {
    id: 'rapport-audit',
    categoryId: 'reglementaire',
    label: 'Rapport d’audit',
    description: 'Journal des actions utilisateurs et des changements de référence.',
    columns: [
      { id: 'date', label: 'Date', kind: 'date' },
      { id: 'utilisateur', label: 'Utilisateur' },
      { id: 'action', label: 'Action' },
      { id: 'module', label: 'Module' },
      { id: 'reference', label: 'Référence' },
      { id: 'ancienneValeur', label: 'Ancienne valeur' },
      { id: 'nouvelleValeur', label: 'Nouvelle valeur' },
    ],
    outputTemplates: [{ id: 'audit-standard', label: 'Journal d’audit' }],
    build: () =>
      emptyResult(
        'Le journal d’audit n’est pas encore exposé comme dataset métier. La structure du rapport est prête.',
      ),
  },
];

export const reportsByCategory = reportDefinitions.reduce<Record<string, ReportDefinition[]>>(
  (accumulator, definition) => {
    if (!accumulator[definition.categoryId]) {
      accumulator[definition.categoryId] = [];
    }
    accumulator[definition.categoryId].push(definition);
    return accumulator;
  },
  {},
);

export const getReportCategory = (categoryId: string) =>
  reportCategories.find((category) => category.id === categoryId);

export const getReportDefinition = (reportId: string | null | undefined) =>
  reportDefinitions.find((definition) => definition.id === reportId);

export const getDefaultReportForCategory = (categoryId: string) =>
  reportsByCategory[categoryId]?.[0];

export const getReportMetadataStamp = (context: ReportingDataContext) =>
  formatISO9075(new Date(), { representation: 'date' }) +
  ' · ' +
  (context.currentUser ? `${context.currentUser.prenom} ${context.currentUser.nom}` : 'Système');
