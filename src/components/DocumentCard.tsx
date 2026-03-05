import { FileText, Image, Table2, FileArchive, File, Download, Eye, Cloud } from "lucide-react";
import { type DocumentItem, type FileType } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { documentService } from "@/services/api";
import { toast } from "sonner";

const fileIcons: Record<FileType, JSX.Element> = {
  pdf: <FileText className="h-8 w-8 text-primary" />,
  image: <Image className="h-8 w-8 text-primary" />,
  spreadsheet: <Table2 className="h-8 w-8 text-primary" />,
  doc: <FileText className="h-8 w-8 text-primary" />,
  dwg: <File className="h-8 w-8 text-primary" />,
  zip: <FileArchive className="h-8 w-8 text-primary" />,
  other: <File className="h-8 w-8 text-primary" />,
};

const DocumentCard = ({ doc }: { doc: DocumentItem }) => {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  const safeDesc = String((doc as any).description ?? "");
  const safeTags: string[] = Array.isArray((doc as any).tags) ? (doc as any).tags : [];
  const safeFileType: FileType = (doc.fileType in fileIcons ? doc.fileType : "other") as FileType;

  const fetchFileBlob = async (): Promise<Blob> => {
    const url = documentService.getDownloadUrl(doc.id);
    const token = sessionStorage.getItem("efn-token");

    const res = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Falha ao baixar arquivo (${res.status})`);
    }

    return res.blob();
  };

  const safeFilename = (name: string) => {
    return (name || "arquivo").replace(/[\\/:*?"<>|]+/g, "-").trim();
  };

  const inferMimeFromDoc = (): string | null => {
    if (doc.mimeType) return String(doc.mimeType);
    switch (safeFileType) {
      case "pdf":
        return "application/pdf";
      case "image":
        return "image/*";
      case "spreadsheet":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case "doc":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "zip":
        return "application/zip";
      default:
        return null;
    }
  };

  const handleDownload = async () => {
    try {
      setBusy("download");
      const blob = await fetchFileBlob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = safeFilename((doc.originalFilename as any) || doc.name);
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível baixar o arquivo");
    } finally {
      setBusy(null);
    }
  };

  const handleView = async () => {
    // Para PDF/imagem abre em nova aba; para outros, baixa.
    const mime = String((doc as any).mimeType || "").toLowerCase();
    const canInline = ["pdf", "image"].includes(safeFileType) || mime.startsWith("image/") || mime.includes("pdf");
    if (!canInline) {
      await handleDownload();
      return;
    }

    let win: Window | null = null;

    try {
      setBusy("view");
      // abre a aba ANTES do await para evitar bloqueio de pop-up
      win = window.open("", "_blank", "noopener,noreferrer");

      let blob = await fetchFileBlob();
      const t = (blob.type || "").toLowerCase();
      if (!t || t === "application/octet-stream") {
        const inferred = inferMimeFromDoc();
        if (inferred && inferred !== "image/*") {
          blob = new Blob([blob], { type: inferred });
        }
      }

      const blobUrl = URL.createObjectURL(blob);

      if (win) {
        win.location.href = blobUrl;
      } else {
        const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
        if (!opened) toast.error("Pop-up bloqueado. Permita pop-ups para visualizar.");
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err: any) {
      if (win) {
        try {
          win.close();
        } catch {}
      }
      toast.error(err?.message || "Não foi possível visualizar o arquivo");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="group bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-gold animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 bg-muted rounded-lg">{fileIcons[safeFileType]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading font-semibold text-foreground truncate">{doc.name}</h3>
            <span title="Arquivo na nuvem">
              <Cloud className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              {doc.category}
            </Badge>
            <span className="text-xs text-muted-foreground">{doc.fileSize}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</span>
          </div>
          <p className={`text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>{safeDesc}</p>
          {safeDesc.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:text-gold-light mt-1 transition-colors"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}
          {safeTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {safeTags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
        <Button
          size="sm"
          variant="outline"
          onClick={handleView}
          disabled={busy !== null}
          className="flex-1 border-border hover:border-primary hover:text-primary"
        >
          <Eye className="h-4 w-4 mr-1" /> Visualizar
        </Button>
        <Button
          size="sm"
          onClick={handleDownload}
          disabled={busy !== null}
          className="flex-1 bg-primary text-primary-foreground hover:bg-gold-light"
        >
          <Download className="h-4 w-4 mr-1" /> Baixar
        </Button>
      </div>
    </div>
  );
};

export default DocumentCard;
