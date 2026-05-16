import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Building2, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 mx-auto">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">AGILYS</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#modules" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Modules
            </a>
            <a href="#dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
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
            <Link to="/auth/login">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                Connexion
              </Button>
            </Link>
            <Button size="sm" className="shadow-primary">
              Essai Gratuit
            </Button>
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col gap-4 mt-8">
                  <a 
                    href="#features" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Fonctionnalités
                  </a>
                  <a 
                    href="#modules" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Modules
                  </a>
                  <a 
                    href="#dashboard" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Dashboard
                  </a>
                  <a 
                    href="#contact" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Contact
                  </a>
                  <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full mt-4">Connexion</Button>
                  </Link>
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
