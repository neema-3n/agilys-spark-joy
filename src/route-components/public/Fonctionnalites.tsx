import PublicLayout from "@/components/public/PublicLayout";
import PublicCtaGroup from "@/components/public/PublicCtaGroup";
import { useTrackPublicPageView } from "@/hooks/useTrackPublicPageView";
import { usePublicSeo } from "@/hooks/usePublicSeo";

const Fonctionnalites = () => {
  useTrackPublicPageView("/fonctionnalites");
  usePublicSeo({
    title: "Fonctionnalites AGILYS | Vitrine",
    description:
      "Explorez les fonctionnalites AGILYS pour piloter budgets, engagements, factures et paiements avec tracabilite complete.",
    path: "/fonctionnalites",
  });

  return (
    <PublicLayout>
      <section className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground">Fonctionnalités AGILYS</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          Une plateforme unifiée pour planifier, exécuter et auditer la chaîne de dépense
          publique avec des parcours guidés par rôle.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Pilotage budgétaire</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Référentiels, allocations, réallocations et suivi des écarts en continu.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Exécution sécurisée</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Engagements, bons de commande, factures et paiements avec contrôle intégré.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Traçabilité & audit</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Historisation des décisions et preuves prêtes pour la revue interne/externe.
            </p>
          </article>
        </div>
        <PublicCtaGroup
          surface="page-fonctionnalites"
          className="mt-10 flex-col sm:flex-row items-start"
          primary={{ label: "Se connecter", size: "default" }}
          secondary={{ label: "Nous contacter", variant: "outline", size: "default" }}
        />
      </section>
    </PublicLayout>
  );
};

export default Fonctionnalites;
