import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { type DocumentItem, type DocumentCategory, categories as defaultCategories } from "@/lib/mock-data";
import { authService, categoryService, documentService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LayoutDashboard, Plus, LogOut, FileText, Eye, EyeOff, Pencil, Trash2, Upload, FolderOpen, Cloud, KeyRound, FolderPlus,
} from "lucide-react";
import logoEfn from "@/assets/logo-efn.png";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [cats, setCats] = useState<DocumentCategory[]>(defaultCategories);

  // criar "pasta" (categoria)
  const [newCat, setNewCat] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // redefinir senha
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/admin");
      return;
    }
    documentService.list(false).then(setDocs).catch(() => setDocs([]));
    categoryService
      .list()
      .then((rows) => {
        const names = rows.map((r) => r.name).filter(Boolean);
        setCats(names.length ? names : defaultCategories);
      })
      .catch(() => setCats(defaultCategories));
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate("/admin");
  };

  const handleCreateCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    setCreatingCat(true);
    try {
      const created = await categoryService.create(name);
      const updated = Array.from(new Set([created.name, ...cats])).filter(Boolean);
      setCats(updated);
      setNewCat("");
      toast.success("Pasta criada");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível criar a pasta");
    } finally {
      setCreatingCat(false);
    }
  };

  const handleResetPassword = async () => {
    const p = newPassword.trim();
    if (p.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setResetting(true);
    try {
      await authService.resetPassword(p);
      toast.success("Senha redefinida");
      setNewPassword("");
      setResetOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível redefinir a senha");
    } finally {
      setResetting(false);
    }
  };

  const togglePublic = async (id: string) => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    await documentService.toggleVisibility(id, !doc.isPublic);
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isPublic: !d.isPublic } : d))
    );
    toast.success("Status atualizado");
  };

  const removeDoc = async (id: string) => {
    await documentService.remove(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success("Documento removido");
  };

  const totalDocs = docs.length;
  const publicDocs = docs.filter((d) => d.isPublic).length;
  const catCounts = cats.map((c) => ({
    name: c,
    count: docs.filter((d) => d.category === c).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoEfn} alt="EFN" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-heading font-bold text-primary text-lg">Painel Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-border hover:border-primary hover:text-primary">
                  <KeyRound className="h-4 w-4 mr-1" /> Redefinir senha
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-heading text-foreground flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" /> Redefinir senha do painel
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Usuário do painel: <span className="text-foreground font-medium">admin</span>
                  </p>
                  <Input
                    type="password"
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-muted border-border focus:border-primary"
                  />
                  <Button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="w-full bg-primary text-primary-foreground hover:bg-gold-light"
                  >
                    {resetting ? "Salvando..." : "Salvar nova senha"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={handleLogout} className="border-border hover:border-primary hover:text-primary">
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Dashboard Stats */}
        <section>
          <h2 className="text-xl font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" /> Dashboard
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total" value={totalDocs} />
            <StatCard label="Públicos" value={publicDocs} />
            <StatCard label="Privados" value={totalDocs - publicDocs} />
            <StatCard label="Categorias" value={cats.length} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {catCounts.map((c) => (
              <Badge key={c.name} variant="outline" className="border-primary/30 text-primary">
                {c.name}: {c.count}
              </Badge>
            ))}
          </div>
        </section>

        {/* Pastas (Categorias) */}
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-heading font-bold text-foreground mb-3 flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" /> Pastas
          </h2>
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="Nome da nova pasta (categoria)"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="bg-muted border-border focus:border-primary"
            />
            <Button
              type="button"
              onClick={handleCreateCategory}
              disabled={creatingCat || !newCat.trim()}
              className="bg-primary text-primary-foreground hover:bg-gold-light"
            >
              <Plus className="h-4 w-4 mr-1" /> {creatingCat ? "Criando..." : "Criar pasta"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {cats.map((c) => (
              <Badge key={c} variant="outline" className="border-primary/30 text-primary">
                {c}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            As pastas são as categorias que aparecem na página principal.
          </p>
        </section>

        {/* Actions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" /> Documentos
            </h2>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-gold-light">
                  <Plus className="h-4 w-4 mr-1" /> Novo Documento
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading text-foreground flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" /> Enviar para Nuvem
                  </DialogTitle>
                </DialogHeader>
                <AddDocumentForm
                  categories={cats}
                  onAddDocs={(newDocs) => {
                    setDocs((prev) => [...newDocs, ...prev]);
                    setAddOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Document Table */}
          <div className="space-y-3">
            {docs.map((doc) => (
              <div key={doc.id} className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.category} • {doc.fileSize} • {new Date(doc.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    {doc.isPublic ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    <Switch
                      checked={doc.isPublic}
                      onCheckedChange={() => togglePublic(doc.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <span title="Na nuvem"><Cloud className="h-3.5 w-3.5 text-primary/50" /></span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => removeDoc(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-card border border-border rounded-lg p-4 text-center">
    <p className="text-2xl font-heading font-bold text-primary">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const AddDocumentForm = ({
  onAddDocs,
  categories,
}: {
  onAddDocs: (docs: DocumentItem[]) => void;
  categories: DocumentCategory[];
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>(categories?.[0] || "Projetos");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // pode ser 1 arquivo ou uma pasta (vários arquivos)
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ i: number; total: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // evita tela branca quando a lista de categorias muda
  useEffect(() => {
    if (!categories?.length) return;
    if (!categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const prettySize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (!Number.isFinite(mb)) return "—";
    if (mb < 1) return `${Math.max(0.1, mb).toFixed(1)} MB`;
    return `${mb.toFixed(1)} MB`;
  };

  const pickSingleFile = () => fileInputRef.current?.click();
  const pickFolder = () => folderInputRef.current?.click();

  const labelSelected = () => {
    if (!files.length) return "Clique para selecionar arquivo";
    if (files.length === 1) return `${files[0].name} (${prettySize(files[0].size)})`;
    // se veio de pasta, geralmente tem webkitRelativePath no 1º arquivo
    const rel = (files[0] as any).webkitRelativePath as string | undefined;
    const folderName = rel ? rel.split("/")[0] : "Pasta";
    return `${folderName} (${files.length} arquivos)`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) {
      toast.error("Selecione um arquivo ou uma pasta do seu PC");
      return;
    }

    setIsSubmitting(true);
    setProgress({ i: 0, total: files.length });

    const createdDocs: DocumentItem[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress({ i: i + 1, total: files.length });

        // se for só 1 arquivo, permite nome customizado
        const finalName =
          files.length === 1
            ? (name.trim() || (f as any).webkitRelativePath || f.name)
            : ((f as any).webkitRelativePath || f.name);

        try {
          const created = await documentService.create({
            name: finalName,
            category,
            description: description.trim(),
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            isPublic,
            file: f,
          });
          createdDocs.push(created);
        } catch (err: any) {
          errors.push(`${finalName}: ${err?.message || "falha"}`);
        }
      }

      if (createdDocs.length) {
        onAddDocs(createdDocs);
      }

      if (errors.length) {
        toast.error(`Alguns uploads falharam (${errors.length}).`);
      } else {
        toast.success(files.length === 1 ? "Documento enviado" : `Pasta enviada (${createdDocs.length} arquivos)`);
      }

      // reset
      setName("");
      setDescription("");
      setTags("");
      setIsPublic(true);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    } finally {
      setProgress(null);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <Input
        placeholder={files.length > 1 ? "Nome (opcional para pasta)" : "Nome do arquivo"}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-muted border-border focus:border-primary"
      />

      <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
        <SelectTrigger className="bg-muted border-border">
          <SelectValue placeholder="Selecione a pasta" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {(categories?.length ? categories : defaultCategories).map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Textarea
        placeholder="Descrição detalhada"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-muted border-border focus:border-primary"
      />
      <Input
        placeholder="Tags (separadas por vírgula)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="bg-muted border-border focus:border-primary"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Visibilidade</span>
          <div className="flex items-center gap-1.5">
            {isPublic ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
            <Switch checked={isPublic} onCheckedChange={(v) => setIsPublic(Boolean(v))} className="data-[state=checked]:bg-primary" />
          </div>
          <span className="text-xs text-muted-foreground">{isPublic ? "Público" : "Privado"}</span>
        </div>
        {progress && (
          <span className="text-xs text-muted-foreground">Enviando {progress.i}/{progress.total}...</span>
        )}
      </div>

      {/* Seleção de arquivo/pasta */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={pickSingleFile}
          className="w-full text-left flex items-center gap-2 p-3 bg-muted rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 transition-colors"
        >
          <Upload className="h-4 w-4 text-primary" />
          <span className="truncate">{labelSelected()}</span>
        </button>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={pickSingleFile} className="flex-1 border-border hover:border-primary hover:text-primary">
            <Upload className="h-4 w-4 mr-1" /> Arquivo
          </Button>
          <Button type="button" variant="outline" onClick={pickFolder} className="flex-1 border-border hover:border-primary hover:text-primary">
            <FolderOpen className="h-4 w-4 mr-1" /> Pasta
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFiles(f ? [f] : []);
          }}
        />

        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          multiple
          // webkitdirectory não é tipado no React, mas funciona nos navegadores baseados em Chromium
          {...({ webkitdirectory: "true" } as any)}
          onChange={(e) => {
            const list = Array.from(e.target.files || []);
            setFiles(list);
          }}
        />

        <p className="text-[11px] text-muted-foreground">
          Dica: clique em <span className="text-foreground font-medium">Pasta</span> para enviar uma pasta inteira (vários arquivos de uma vez).
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground hover:bg-gold-light font-semibold disabled:opacity-70"
      >
        <Cloud className="h-4 w-4 mr-2" /> {isSubmitting ? "Enviando..." : "Enviar para Nuvem"}
      </Button>
    </form>
  );
};

export default AdminDashboard;
