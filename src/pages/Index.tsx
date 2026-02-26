import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import CategoryFilter from "@/components/CategoryFilter";
import DocumentCard from "@/components/DocumentCard";
import { type DocumentCategory, type DocumentItem } from "@/lib/mock-data";
import { FileText } from "lucide-react";
import { documentService } from "@/services/api";

const Index = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "Todos">("Todos");
  const [docs, setDocs] = useState<DocumentItem[]>([]);

  useEffect(() => {
    documentService.list(true).then(setDocs);
  }, []);

  const filtered = useMemo(() => {
    return docs
      .filter((d) => category === "Todos" || d.category === category)
      .filter((d) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
  }, [search, category, docs]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <span>{filtered.length} documento{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <CategoryFilter selected={category} onSelect={setCategory} />

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">Nenhum documento encontrado</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Tente ajustar os filtros ou a busca</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Edson Fernando — EFN Engenharia Elétrica. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default Index;
