import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportingExecutionTresorerieReport } from '@/components/reporting-execution-tresorerie/ReportingExecutionTresorerieReport';
import { EtatsFinanciersReport } from '@/components/reporting/EtatsFinanciersReport';
import { DSFReport } from '@/components/reporting/DSFReport';
import { ReportingComptableReport } from '@/components/reporting-comptable/ReportingComptableReport';
import { ReportingFournisseursReport } from '@/components/reporting-fournisseurs/ReportingFournisseursReport';
import { ReportingAnalytiqueReport } from '@/components/reporting-analytique/ReportingAnalytiqueReport';
import { FileText, TrendingUp, DollarSign, BookOpen, HandCoins, Grid3X3 } from 'lucide-react';

const Reporting = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting"
        description="Exécution budgétaire, DSF, états financiers, reporting comptable, fournisseurs et analytique avancé"
      />
      
      <div className="px-4 md:px-6">
        <Tabs defaultValue="execution" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="execution" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Exécution Budgétaire</span>
              <span className="sm:hidden">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="dsf" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">DSF</span>
              <span className="sm:hidden">DSF</span>
            </TabsTrigger>
            <TabsTrigger value="etats" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">États Financiers</span>
              <span className="sm:hidden">États</span>
            </TabsTrigger>
            <TabsTrigger value="comptable" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Reporting Comptable</span>
              <span className="sm:hidden">Compta</span>
            </TabsTrigger>
            <TabsTrigger value="fournisseurs" className="flex items-center gap-2">
              <HandCoins className="h-4 w-4" />
              <span className="hidden sm:inline">Dettes & Avances</span>
              <span className="sm:hidden">Fournisseurs</span>
            </TabsTrigger>
            <TabsTrigger value="analytique" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytique Avancé</span>
              <span className="sm:hidden">Analytique</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="execution" className="space-y-6">
            <ReportingExecutionTresorerieReport />
          </TabsContent>

          <TabsContent value="dsf" className="space-y-6">
            <DSFReport />
          </TabsContent>

          <TabsContent value="etats" className="space-y-6">
            <EtatsFinanciersReport />
          </TabsContent>

          <TabsContent value="comptable" className="space-y-6">
            <ReportingComptableReport />
          </TabsContent>

          <TabsContent value="fournisseurs" className="space-y-6">
            <ReportingFournisseursReport />
          </TabsContent>

          <TabsContent value="analytique" className="space-y-6">
            <ReportingAnalytiqueReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reporting;
