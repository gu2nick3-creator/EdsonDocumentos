import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { type DocumentItem, type DocumentCategory, categories } from "@/lib/mock-data";
import { authService, documentService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LayoutDashboard, Plus, LogOut, FileText, Eye, EyeOff, Pencil, Trash2, Upload, FolderOpen, Cloud,
} from "lucide-react";
import logoEfn from "@/assets/logo-efn.png";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/admin");
      return;
    }
    documentService.list(false).then(setDocs);
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate("/admin");
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
  const catCounts = categories.map((c) => ({
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
          <Button variant="outline" size="sm" onClick={handleLogout} className="border-border hover:border-primary hover:text-primary">
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
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
            <StatCard label="Categorias" value={categories.length} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {catCounts.map((c) => (
              <Badge key={c.name} variant="outline" className="border-primary/30 text-primary">
                {c.name}: {c.count}
              </Badge>
            ))}
          </div>
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
                  onAdd={(doc) => {
                    setDocs((prev) => [doc, ...prev]);
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

const AddDocumentForm = ({ onAdd }: { onAdd: (doc: DocumentItem) => void }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("Projetos");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const prettySize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (!Number.isFinite(mb)) return "—";
    if (mb < 1) return `${Math.max(0.1, mb).toFixed(1)} MB`;
    return `${mb.toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || file?.name || "";
    if (!finalName) {
      toast.error("Informe o nome do arquivo");
      return;
    }
    if (!file) {
      toast.error("Selecione um arquivo do seu PC");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await documentService.create({
        name: finalName,
        category,
        description: description.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        isPublic,
        file,
      });

      onAdd(created);
      toast.success("Documento enviado");

      // reset
      setName("");
      setCategory("Projetos");
      setDescription("");
      setTags("");
      setIsPublic(true);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar documento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <Input placeholder="Nome do arquivo" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted border-border focus:border-primary" />
      <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
        <SelectTrigger className="bg-muted border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {categories.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea placeholder="Descrição detalhada" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted border-border focus:border-primary" />
      <Input placeholder="Tags (separadas por vírgula)" value={tags} onChange={(e) => setTags(e.target.value)} className="bg-muted border-border focus:border-primary" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Visibilidade</span>
          <div className="flex items-center gap-1.5">
            {isPublic ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
            <Switch
              checked={isPublic}
              onCheckedChange={(v) => setIsPublic(Boolean(v))}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <span className="text-xs text-muted-foreground">{isPublic ? "Público" : "Privado"}</span>
        </div>
      </div>

      {/* File picker */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full text-left flex items-center gap-2 p-3 bg-muted rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 transition-colors"
      >
        <Upload className="h-4 w-4 text-primary" />
        <span className="truncate">
          {file ? `${file.name} (${prettySize(file.size)})` : "Clique para selecionar arquivo"}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

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
