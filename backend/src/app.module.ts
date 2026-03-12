import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AnalysesFinancieresModule } from './analyses-financieres/analyses-financieres.module';
import { BudgetReferentielsModule } from './budget-referentiels/budget-referentiels.module';
import { BonsCommandeModule } from './bons-commande/bons-commande.module';
import { PostgresModule } from './common/postgres.module';
import { CashRiskModule } from './cash-risk/cash-risk.module';
import { ComptesModule } from './comptes/comptes.module';
import { ComptesTresorerieModule } from './comptes-tresorerie/comptes-tresorerie.module';
import { DepensesModule } from './depenses/depenses.module';
import { EngagementsModule } from './engagements/engagements.module';
import { EcrituresComptablesModule } from './ecritures-comptables/ecritures-comptables.module';
import { ExerciceClotureModule } from './exercice-cloture/exercice-cloture.module';
import { ReferentielsModule } from './referentiels/referentiels.module';
import { ReglesComptablesModule } from './regles-comptables/regles-comptables.module';
import { FacturesModule } from './factures/factures.module';
import { FournisseursModule } from './fournisseurs/fournisseurs.module';
import { OperationsTresorerieModule } from './operations-tresorerie/operations-tresorerie.module';
import { PaiementsModule } from './paiements/paiements.module';
import { PrevisionsModule } from './previsions/previsions.module';
import { ProjetsModule } from './projets/projets.module';
import { RecettesModule } from './recettes/recettes.module';
import { RapprochementsBancairesModule } from './rapprochements-bancaires/rapprochements-bancaires.module';
import { TresorerieModule } from './tresorerie/tresorerie.module';
import { ReservationsModule } from './reservations/reservations.module';
import { StructuresModule } from './structures/structures.module';
import { TenantPoliciesModule } from './tenant-policies/tenant-policies.module';
import { WorkflowExceptionsModule } from './workflow-exceptions/workflow-exceptions.module';
import { ControleInterneModule } from './controle-interne/controle-interne.module';
import { IntegrationLegacyModule } from './integration-legacy/integration-legacy.module';
import { OfflineSyncModule } from './offline-sync/offline-sync.module';
import { ReportingComptableModule } from './reporting-comptable/reporting-comptable.module';
import { ReportingFournisseursModule } from './reporting-fournisseurs/reporting-fournisseurs.module';
import { ReportingExecutionTresorerieModule } from './reporting-execution-tresorerie/reporting-execution-tresorerie.module';
import { ReportingAnalytiqueModule } from './reporting-analytique/reporting-analytique.module';
import { DossierDepenseUnifieModule } from './dossier-depense-unifie/dossier-depense-unifie.module';
import { DsfReportingModule } from './dsf-reporting/dsf-reporting.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    PostgresModule,
    AuthModule,
    AnalysesFinancieresModule,
    CashRiskModule,
    WorkflowExceptionsModule,
    BudgetReferentielsModule,
    BonsCommandeModule,
    ComptesModule,
    ComptesTresorerieModule,
    DepensesModule,
    EngagementsModule,
    EcrituresComptablesModule,
    ExerciceClotureModule,
    ReferentielsModule,
    ReglesComptablesModule,
    FacturesModule,
    FournisseursModule,
    OperationsTresorerieModule,
    PaiementsModule,
    PrevisionsModule,
    ProjetsModule,
    RecettesModule,
    RapprochementsBancairesModule,
    TresorerieModule,
    ReservationsModule,
    StructuresModule,
    TenantPoliciesModule,
    ControleInterneModule,
    IntegrationLegacyModule,
    OfflineSyncModule,
    HealthModule,
    ReportingComptableModule,
    ReportingFournisseursModule,
    ReportingExecutionTresorerieModule,
    ReportingAnalytiqueModule,
    DossierDepenseUnifieModule,
    DsfReportingModule
  ]
})
export class AppModule {}
