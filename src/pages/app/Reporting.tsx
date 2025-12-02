import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutionBudgetaireReport } from '@/components/reporting/ExecutionBudgetaireReport';
import { EtatsFinanciersReport } from '@/components/reporting/EtatsFinanciersReport';
import { DSFReport } from '@/components/reporting/DSFReport';
import { FileText, TrendingUp, DollarSign } from 'lucide-react';

const Reporting = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting"
        description="Exécution budgétaire, DSF et états financiers"
      />
      
      <div className="px-4 md:px-6">
        <Tabs defaultValue="execution" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          <TabsContent value="execution" className="space-y-6">
            <ExecutionBudgetaireReport />
          </TabsContent>

          <TabsContent value="dsf" className="space-y-6">
            <DSFReport />
          </TabsContent>

          <TabsContent value="etats" className="space-y-6">
            <EtatsFinanciersReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reporting;
