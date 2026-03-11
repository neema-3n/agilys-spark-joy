"use client";

import Dashboard from "@/route-components/app/Dashboard";
import Budgets from "@/route-components/app/Budgets";
import Engagements from "@/route-components/app/Engagements";
import Factures from "@/route-components/app/Factures";
import Tresorerie from "@/route-components/app/Tresorerie";
import Reporting from "@/route-components/app/Reporting";
import Parametres from "@/route-components/app/Parametres";
import Structure from "@/route-components/app/Structure";
import Fournisseurs from "@/route-components/app/Fournisseurs";
import Mandats from "@/route-components/app/Mandats";
import Paiements from "@/route-components/app/Paiements";
import PlanComptable from "@/route-components/app/PlanComptable";
import ControleInterne from "@/route-components/app/ControleInterne";
import Analyses from "@/route-components/app/Analyses";
import Previsions from "@/route-components/app/Previsions";
import Reservations from "@/route-components/app/Reservations";
import BonsCommande from "@/route-components/app/BonsCommande";
import Depenses from "@/route-components/app/Depenses";
import Enveloppes from "@/route-components/app/Enveloppes";
import Projets from "@/route-components/app/Projets";
import JournalComptable from "@/route-components/app/JournalComptable";
import NotFound from "@/route-components/NotFound";
import { RouteParamsProvider } from "@/lib/router";

type AppRouteRendererProps = {
  slug?: string[];
};

const withParams = (Component: () => JSX.Element, params: Record<string, string | undefined> = {}) => {
  return (
    <RouteParamsProvider params={params}>
      <Component />
    </RouteParamsProvider>
  );
};

export default function AppRouteRenderer({ slug = [] }: AppRouteRendererProps) {
  const [section, detailId] = slug;

  if (slug.length === 0 || section === "dashboard") {
    return <Dashboard />;
  }

  switch (section) {
    case "budgets":
      return withParams(Budgets, { ligneId: detailId });
    case "enveloppes":
      return <Enveloppes />;
    case "previsions":
      return <Previsions />;
    case "reservations":
      return withParams(Reservations, { reservationId: detailId });
    case "engagements":
      return withParams(Engagements, { engagementId: detailId });
    case "bons-commande":
      return withParams(BonsCommande, { bonCommandeId: detailId });
    case "depenses":
      return withParams(Depenses, { depenseId: detailId });
    case "mandats":
      return <Mandats />;
    case "factures":
      return withParams(Factures, { factureId: detailId });
    case "paiements":
      return <Paiements />;
    case "tresorerie":
      return <Tresorerie />;
    case "plan-comptable":
      return <PlanComptable />;
    case "journal-comptable":
      return <JournalComptable />;
    case "controle-interne":
      return <ControleInterne />;
    case "projets":
      return <Projets />;
    case "analyses":
      return <Analyses />;
    case "reporting":
      return <Reporting />;
    case "structure":
      return <Structure />;
    case "fournisseurs":
      return withParams(Fournisseurs, { fournisseurId: detailId });
    case "parametres":
      return withParams(Parametres, { sectionId: detailId });
    default:
      return <NotFound />;
  }
}
