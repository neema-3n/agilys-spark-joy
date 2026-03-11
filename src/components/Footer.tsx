import { Building2 } from "lucide-react";
import { Link } from "@/lib/router";

const publicLinks = [
  { to: "/", label: "Accueil" },
  { to: "/fonctionnalites", label: "Fonctionnalités" },
  { to: "/cas-clients", label: "Cas clients" },
  { to: "/contact", label: "Contact" },
];

const legalLinks = [
  { to: "/mentions-legales", label: "Mentions légales" },
  { to: "/politique-confidentialite", label: "Politique de confidentialité" },
  { to: "/conditions-utilisation", label: "Conditions d'utilisation" },
];

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">AGILYS</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Solution SaaS de gestion budgétaire publique conforme aux normes 
              internationales SYSCOHADA, OHADA et DSF.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Navigation</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {publicLinks.map((item) => (
                <li key={item.to}>
                  <Link className="transition-colors hover:text-foreground" to={item.to}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {legalLinks.map((item) => (
                <li key={item.to}>
                  <Link className="transition-colors hover:text-foreground" to={item.to}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AGILYS. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
