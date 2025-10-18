import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { ExerciceProvider } from "@/contexts/ExerciceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import InitTestUsers from "./pages/auth/InitTestUsers";
import AppLayout from "./pages/app/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Budgets from "./pages/app/Budgets";
import StructureBudgetaire from "./pages/app/StructureBudgetaire";
import Engagements from "./pages/app/Engagements";
import Factures from "./pages/app/Factures";
import Tresorerie from "./pages/app/Tresorerie";
import Reporting from "./pages/app/Reporting";
import Parametres from "./pages/app/Parametres";
import Structure from "./pages/app/Structure";
import Fournisseurs from "./pages/app/Fournisseurs";
import Mandats from "./pages/app/Mandats";
import Paiements from "./pages/app/Paiements";
import PlanComptable from "./pages/app/PlanComptable";
import ControleInterne from "./pages/app/ControleInterne";
import Analyses from "./pages/app/Analyses";
import Previsions from "./pages/app/Previsions";
import Reservations from "./pages/app/Reservations";
import BonsCommande from "./pages/app/BonsCommande";
import Depenses from "./pages/app/Depenses";
import Enveloppes from "./pages/app/Enveloppes";
import Projets from "./pages/app/Projets";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClientProvider>
            <ExerciceProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/init-test-users" element={<InitTestUsers />} />
                <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="budgets" element={<Budgets />} />
                  <Route path="structure-budgetaire" element={<StructureBudgetaire />} />
                  <Route path="enveloppes" element={<Enveloppes />} />
                  <Route path="previsions" element={<Previsions />} />
                  <Route path="reservations" element={<Reservations />} />
                  <Route path="engagements" element={<Engagements />} />
                  <Route path="bons-commande" element={<BonsCommande />} />
                  <Route path="depenses" element={<Depenses />} />
                  <Route path="mandats" element={<Mandats />} />
                  <Route path="factures" element={<Factures />} />
                  <Route path="paiements" element={<Paiements />} />
                  <Route path="tresorerie" element={<Tresorerie />} />
                  <Route path="plan-comptable" element={<PlanComptable />} />
                  <Route path="controle-interne" element={<ControleInterne />} />
                  <Route path="projets" element={<Projets />} />
                  <Route path="analyses" element={<Analyses />} />
                  <Route path="reporting" element={<Reporting />} />
                  <Route path="structure" element={<Structure />} />
                  <Route path="fournisseurs" element={<Fournisseurs />} />
                  <Route path="parametres" element={<Parametres />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ExerciceProvider>
          </ClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
