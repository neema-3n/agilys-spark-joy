import PublicLayout from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Contact = () => {
  return (
    <PublicLayout>
      <section className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground">Contact AGILYS</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Parlons de vos contraintes métier et de vos objectifs de migration budgétaire.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Email</h2>
            <p className="mt-2 text-sm text-muted-foreground">contact@agilys.local</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Téléphone</h2>
            <p className="mt-2 text-sm text-muted-foreground">+237 6XX XX XX XX</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Disponibilité</h2>
            <p className="mt-2 text-sm text-muted-foreground">Lundi à vendredi, 8h-18h</p>
          </article>
        </div>
        <div className="mt-10">
          <Button asChild>
            <Link to="/auth/login">Se connecter</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Contact;
