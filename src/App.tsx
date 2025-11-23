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
    <BrowserRouter>
      <AuthProvider>
        <ClientProvider>
          <ExerciceProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/init-test-users" element={<InitTestUsers />} />
                <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="budgets">
                    <Route index element={<Budgets />} />
                    <Route path=":ligneId" element={<Budgets />} />
                  </Route>
                  <Route path="enveloppes" element={<Enveloppes />} />
                  <Route path="previsions" element={<Previsions />} />
                  <Route path="reservations">
                    <Route index element={<Reservations />} />
                    <Route path=":reservationId" element={<Reservations />} />
                  </Route>
                  <Route path="engagements">
                    <Route index element={<Engagements />} />
                    <Route path=":engagementId" element={<Engagements />} />
                  </Route>
                  <Route path="bons-commande">
                    <Route index element={<BonsCommande />} />
                    <Route path=":bonCommandeId" element={<BonsCommande />} />
                  </Route>
                  <Route path="depenses">
                    <Route index element={<Depenses />} />
                    <Route path=":depenseId" element={<Depenses />} />
                  </Route>
                  <Route path="mandats" element={<Mandats />} />
                  <Route path="factures">
                    <Route index element={<Factures />} />
                    <Route path=":factureId" element={<Factures />} />
                  </Route>
                  <Route path="paiements" element={<Paiements />} />
                  <Route path="tresorerie" element={<Tresorerie />} />
                  <Route path="plan-comptable" element={<PlanComptable />} />
                  <Route path="controle-interne" element={<ControleInterne />} />
                  <Route path="projets" element={<Projets />} />
                  <Route path="analyses" element={<Analyses />} />
                  <Route path="reporting" element={<Reporting />} />
                  <Route path="structure" element={<Structure />} />
                  <Route path="fournisseurs">
                    <Route index element={<Fournisseurs />} />
                    <Route path=":fournisseurId" element={<Fournisseurs />} />
                  </Route>
                  <Route path="parametres">
                    <Route index element={<Parametres />} />
                    <Route path=":sectionId" element={<Parametres />} />
                  </Route>
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </ExerciceProvider>
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
