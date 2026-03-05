import PublicLayout from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CasClients = () => {
  return (
    <PublicLayout>
      <section className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground">Cas clients AGILYS</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          Des directions financières et ordonnateurs qui réduisent les retards de traitement
          et renforcent la conformité documentaire.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Collectivité territoriale</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Réduction des blocages de paiement grâce au suivi bout-en-bout des dossiers.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Institution publique</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Amélioration de la traçabilité des décisions et accélération des audits annuels.
            </p>
          </article>
        </div>
        <div className="mt-10">
          <Button asChild variant="outline">
            <Link to="/contact">Parler à l'équipe AGILYS</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default CasClients;
