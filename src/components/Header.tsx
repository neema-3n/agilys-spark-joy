import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Building2, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import PublicCtaGroup from "@/components/public/PublicCtaGroup";

const publicNavLinks = [
  { to: "/", label: "Accueil" },
  { to: "/fonctionnalites", label: "Fonctionnalités" },
  { to: "/cas-clients", label: "Cas clients" },
  { to: "/contact", label: "Contact" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 mx-auto">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">AGILYS</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {publicNavLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden md:inline-flex"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <PublicCtaGroup
              surface="header-desktop"
              className="hidden md:flex items-center gap-2"
              primary={{
                label: "Se connecter",
                size: "sm",
                className: "shadow-primary",
              }}
              secondary={{
                label: "Nous contacter",
                variant: "ghost",
                size: "sm",
              }}
            />
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col gap-4 mt-8">
                  {publicNavLinks.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <PublicCtaGroup
                    surface="header-mobile"
                    className="mt-4 flex-col items-stretch gap-2"
                    primary={{
                      label: "Se connecter",
                      size: "sm",
                      className: "w-full",
                      onClick: () => setMobileMenuOpen(false),
                    }}
                    secondary={{
                      label: "Nous contacter",
                      variant: "outline",
                      size: "sm",
                      className: "w-full",
                      onClick: () => setMobileMenuOpen(false),
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                      setMobileMenuOpen(false);
                    }}
                    className="mt-2"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                    {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
