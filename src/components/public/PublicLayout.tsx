import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type PublicLayoutProps = {
  children: ReactNode;
};

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="min-h-screen">
      <Header />
      {children}
      <Footer />
    </div>
  );
};

export default PublicLayout;
