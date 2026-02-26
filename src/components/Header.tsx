import logoEfn from "@/assets/logo-efn.png";

const Header = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
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
    </header>
  );
};

export default Header;
