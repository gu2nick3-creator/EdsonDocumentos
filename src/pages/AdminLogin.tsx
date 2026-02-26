import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import logoEfn from "@/assets/logo-efn.png";
import { toast } from "sonner";
import { authService } from "@/services/api";

const AdminLogin = () => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.login(user, pass);
      navigate("/admin/dashboard");
    } catch {
      toast.error("Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src={logoEfn} alt="EFN" className="h-20 w-20 mx-auto rounded-xl object-cover mb-4" />
          <h2 className="text-2xl font-heading font-bold text-gold-gradient">Acesso Administrativo</h2>
          <p className="text-sm text-muted-foreground mt-1">Área restrita</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            placeholder="Usuário"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="bg-card border-border focus:border-primary"
          />
          <Input
            type="password"
            placeholder="Senha"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="bg-card border-border focus:border-primary"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-gold-light font-semibold"
          >
            <Lock className="h-4 w-4 mr-2" />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
