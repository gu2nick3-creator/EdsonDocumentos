import logoEfn from "@/assets/logo-efn.png";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={logoEfn} alt="EFN Engenharia Elétrica" className="h-12 w-12 rounded-lg object-cover" />
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold text-gold-gradient">
              Edson Fernando Documentos
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Central de Arquivos Profissionais — Engenharia Elétrica
            </p>
          </div>
        </div>

        <Link
          to="/admin"
          title="Acessar painel administrativo"
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border bg-card hover:border-primary/60 hover:text-primary transition-colors"
        >
          <Shield className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
