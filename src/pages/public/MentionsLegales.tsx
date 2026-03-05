import PublicLayout from "@/components/public/PublicLayout";

const MentionsLegales = () => {
  return (
    <PublicLayout>
      <section className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground">Mentions légales</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Informations d'éditeur, hébergement et responsabilités légales applicables à la vitrine AGILYS.
        </p>
      </section>
    </PublicLayout>
  );
};

export default MentionsLegales;
