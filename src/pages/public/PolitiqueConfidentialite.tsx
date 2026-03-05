import PublicLayout from "@/components/public/PublicLayout";

const PolitiqueConfidentialite = () => {
  return (
    <PublicLayout>
      <section className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground">Politique de confidentialité</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Cette page présente le cadre de traitement des données personnelles et les engagements de protection d'AGILYS.
        </p>
      </section>
    </PublicLayout>
  );
};

export default PolitiqueConfidentialite;
