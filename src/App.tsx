import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { ExerciceProvider } from "@/contexts/ExerciceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const NotFound = lazy(() => import("./pages/NotFound"));

// Auth pages
const Login = lazy(() => import("./pages/auth/Login"));
const InitTestUsers = lazy(() => import("./pages/auth/InitTestUsers"));

// App layout and main pages
const AppLayout = lazy(() => import("./pages/app/AppLayoutTailAdmin"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));

// Budget & Finance pages
const Budgets = lazy(() => import("./pages/app/Budgets"));
const Engagements = lazy(() => import("./pages/app/Engagements"));
const Depenses = lazy(() => import("./pages/app/Depenses"));
const Factures = lazy(() => import("./pages/app/Factures"));
const BonsCommande = lazy(() => import("./pages/app/BonsCommande"));
const Paiements = lazy(() => import("./pages/app/Paiements"));
const TresorerieComptes = lazy(() => import("./pages/app/TresorerieComptes"));
const TresorerieRecettes = lazy(() => import("./pages/app/TresorerieRecettes"));
const TresorerieOperations = lazy(() => import("./pages/app/TresorerieOperations"));
const TresorerieRapprochements = lazy(() => import("./pages/app/TresorerieRapprochements"));
const Previsions = lazy(() => import("./pages/app/Previsions"));
const Reservations = lazy(() => import("./pages/app/Reservations"));
const Enveloppes = lazy(() => import("./pages/app/Enveloppes"));

// Administration pages
const Fournisseurs = lazy(() => import("./pages/app/Fournisseurs"));
const Projets = lazy(() => import("./pages/app/Projets"));
const Structure = lazy(() => import("./pages/app/Structure"));
const Parametres = lazy(() => import("./pages/app/Parametres"));
const PlanComptable = lazy(() => import("./pages/app/PlanComptable"));

// Reporting & Analysis pages
const Reporting = lazy(() => import("./pages/app/Reporting"));
const Analyses = lazy(() => import("./pages/app/Analyses"));
const JournalComptable = lazy(() => import("./pages/app/JournalComptable"));
const JournalTresorerie = lazy(() => import("./pages/app/JournalTresorerie"));
const ControleInterne = lazy(() => import("./pages/app/ControleInterne"));

// Legacy pages (to be reviewed)
const Mandats = lazy(() => import("./pages/app/Mandats"));

const queryClient = new QueryClient();

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
  </div>
);

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
                {/* Root entrypoint */}
                <Route path="/" element={<Navigate to="/auth/login" replace />} />

                {/* Auth routes */}
                <Route path="/auth/login" element={<Suspense fallback={<FullScreenLoader />}><Login /></Suspense>} />
                <Route path="/auth/init-test-users" element={<Suspense fallback={<FullScreenLoader />}><InitTestUsers /></Suspense>} />

                {/* Protected app routes */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<FullScreenLoader />}>
                        <AppLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<Dashboard />} />

                  {/* Budget & Finance */}
                  <Route path="budgets">
                    <Route index element={<Budgets />} />
                    <Route path="create" element={<Budgets />} />
                    <Route path=":ligneId/edit" element={<Budgets />} />
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
                    <Route path="create" element={<Engagements />} />
                    <Route path=":engagementId/edit" element={<Engagements />} />
                    <Route path=":engagementId" element={<Engagements />} />
                  </Route>
                  <Route path="bons-commande">
                    <Route index element={<BonsCommande />} />
                    <Route path="create" element={<BonsCommande />} />
                    <Route path=":bonCommandeId/edit" element={<BonsCommande />} />
                    <Route path=":bonCommandeId" element={<BonsCommande />} />
                  </Route>
                  <Route path="depenses">
                    <Route index element={<Depenses />} />
                    <Route path="create" element={<Depenses />} />
                    <Route path=":depenseId/edit" element={<Depenses />} />
                    <Route path=":depenseId" element={<Depenses />} />
                  </Route>
                  <Route path="factures">
                    <Route index element={<Factures />} />
                    <Route path="create" element={<Factures />} />
                    <Route path=":factureId/edit" element={<Factures />} />
                    <Route path=":factureId" element={<Factures />} />
                  </Route>
                  <Route path="paiements">
                    <Route index element={<Paiements />} />
                    <Route path="create" element={<Paiements />} />
                    <Route path=":paiementId" element={<Paiements />} />
                  </Route>
                  <Route path="tresorerie">
                    <Route index element={<Navigate to="comptes" replace />} />
                    <Route path="comptes" element={<TresorerieComptes />} />
                    <Route path="recettes" element={<TresorerieRecettes />} />
                    <Route path="operations" element={<TresorerieOperations />} />
                    <Route path="rapprochements" element={<TresorerieRapprochements />} />
                  </Route>

                  {/* Administration */}
                  <Route path="fournisseurs">
                    <Route index element={<Fournisseurs />} />
                    <Route path="create" element={<Fournisseurs />} />
                    <Route path=":fournisseurId/edit" element={<Fournisseurs />} />
                    <Route path=":fournisseurId" element={<Fournisseurs />} />
                  </Route>
                  <Route path="projets" element={<Projets />} />
                  <Route path="structure" element={<Structure />} />
                  <Route path="parametres">
                    <Route index element={<Parametres />} />
                    <Route path=":sectionId" element={<Parametres />} />
                  </Route>
                  <Route path="plan-comptable" element={<PlanComptable />} />

                  {/* Reporting & Analysis */}
                  <Route path="reporting">
                    <Route index element={<Navigate to="budgetaire" replace />} />
                    <Route path=":reportType" element={<Reporting />} />
                  </Route>
                  <Route path="analyses" element={<Analyses />} />
                  <Route path="journal-comptable" element={<JournalComptable />} />
                  <Route path="journal-tresorerie" element={<JournalTresorerie />} />
                  <Route path="controle-interne" element={<ControleInterne />} />

                  {/* Legacy routes (to be reviewed) */}
                  <Route path="mandats" element={<Mandats />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<Suspense fallback={<FullScreenLoader />}><NotFound /></Suspense>} />
              </Routes>
            </TooltipProvider>
          </ExerciceProvider>
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
