"use client";

import CasClients from "@/route-components/public/CasClients";
import ConditionsUtilisation from "@/route-components/public/ConditionsUtilisation";
import Contact from "@/route-components/public/Contact";
import Fonctionnalites from "@/route-components/public/Fonctionnalites";
import MentionsLegales from "@/route-components/public/MentionsLegales";
import PolitiqueConfidentialite from "@/route-components/public/PolitiqueConfidentialite";
import NotFound from "@/route-components/NotFound";

type PublicRouteRendererProps = {
  slug: string;
};

export default function PublicRouteRenderer({ slug }: PublicRouteRendererProps) {
  switch (slug) {
    case "fonctionnalites":
      return <Fonctionnalites />;
    case "cas-clients":
      return <CasClients />;
    case "contact":
      return <Contact />;
    case "mentions-legales":
      return <MentionsLegales />;
    case "politique-confidentialite":
      return <PolitiqueConfidentialite />;
    case "conditions-utilisation":
      return <ConditionsUtilisation />;
    default:
      return <NotFound />;
  }
}
