import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { ExerciceProvider } from "@/contexts/ExerciceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/auth/Login"));
const InitTestUsers = lazy(() => import("./pages/auth/InitTestUsers"));
const AppLayout = lazy(() => import("./pages/app/AppLayout"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Budgets = lazy(() => import("./pages/app/Budgets"));
const Engagements = lazy(() => import("./pages/app/Engagements"));
const Factures = lazy(() => import("./pages/app/Factures"));
const Tresorerie = lazy(() => import("./pages/app/Tresorerie"));
const Reporting = lazy(() => import("./pages/app/Reporting"));
const Parametres = lazy(() => import("./pages/app/Parametres"));
const Structure = lazy(() => import("./pages/app/Structure"));
const Fournisseurs = lazy(() => import("./pages/app/Fournisseurs"));
const Mandats = lazy(() => import("./pages/app/Mandats"));
const Paiements = lazy(() => import("./pages/app/Paiements"));
const PlanComptable = lazy(() => import("./pages/app/PlanComptable"));
const ControleInterne = lazy(() => import("./pages/app/ControleInterne"));
const Analyses = lazy(() => import("./pages/app/Analyses"));
const Previsions = lazy(() => import("./pages/app/Previsions"));
const Reservations = lazy(() => import("./pages/app/Reservations"));
const BonsCommande = lazy(() => import("./pages/app/BonsCommande"));
const Depenses = lazy(() => import("./pages/app/Depenses"));
const Enveloppes = lazy(() => import("./pages/app/Enveloppes"));
const Projets = lazy(() => import("./pages/app/Projets"));
const JournalComptable = lazy(() => import("./pages/app/JournalComptable"));

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
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                  </div>
                }
              >
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
                    <Route path="journal-comptable" element={<JournalComptable />} />
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
              </Suspense>
            </TooltipProvider>
          </ExerciceProvider>
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
