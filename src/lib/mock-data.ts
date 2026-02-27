export type DocumentCategory = "Projetos" | "CREA" | "Documentos Técnicos" | "Certificados" | "Outros";

export type FileType = "pdf" | "image" | "spreadsheet" | "doc" | "dwg" | "zip" | "other";

export interface DocumentItem {
  id: string;
  name: string;
  category: DocumentCategory;
  description: string;
  tags: string[];
  fileType: FileType;
  fileSize: string;
  createdAt: string;
  isPublic: boolean;
  cloudUrl?: string;
}

export const categories: DocumentCategory[] = [
  "Projetos",
  "CREA",
  "Documentos Técnicos",
  "Certificados",
  "Outros",
];

export const mockDocuments: DocumentItem[] = [
  {
    id: "1",
    name: "Projeto Elétrico - Residência Vila Nova",
    category: "Projetos",
    description: "Projeto elétrico completo para residência de 250m² no condomínio Vila Nova, incluindo quadro de distribuição, circuitos e memorial descritivo.",
    tags: ["residencial", "baixa tensão", "2024"],
    fileType: "pdf",
    fileSize: "12.4 MB",
    createdAt: "2024-11-15",
    isPublic: true,
  },
  {
    id: "2",
    name: "ART - Projeto Industrial Galpão Central",
    category: "CREA",
    description: "Anotação de Responsabilidade Técnica referente ao projeto de instalações elétricas do Galpão Central Industrial.",
    tags: ["ART", "industrial", "2024"],
    fileType: "pdf",
    fileSize: "2.1 MB",
    createdAt: "2024-10-20",
    isPublic: true,
  },
  {
    id: "3",
    name: "Laudo Técnico SPDA - Edifício Comercial",
    category: "Documentos Técnicos",
    description: "Laudo de inspeção do Sistema de Proteção contra Descargas Atmosféricas conforme NBR 5419.",
    tags: ["SPDA", "laudo", "NBR 5419"],
    fileType: "pdf",
    fileSize: "8.7 MB",
    createdAt: "2024-09-05",
    isPublic: true,
  },
  {
    id: "4",
    name: "Certificado NR-10 Reciclagem",
    category: "Certificados",
    description: "Certificado de reciclagem em Segurança em Instalações e Serviços em Eletricidade - NR-10.",
    tags: ["NR-10", "segurança", "certificação"],
    fileType: "pdf",
    fileSize: "1.3 MB",
    createdAt: "2024-08-12",
    isPublic: true,
  },
  {
    id: "5",
    name: "Planilha de Dimensionamento - Cabos",
    category: "Documentos Técnicos",
    description: "Planilha de cálculo para dimensionamento de condutores elétricos conforme NBR 5410.",
    tags: ["dimensionamento", "NBR 5410", "planilha"],
    fileType: "spreadsheet",
    fileSize: "4.5 MB",
    createdAt: "2024-07-30",
    isPublic: true,
  },
  {
    id: "6",
    name: "Planta Baixa - Subestação 13.8kV",
    category: "Projetos",
    description: "Desenho técnico da planta baixa da subestação abaixadora 13.8kV/380V com capacidade de 500kVA.",
    tags: ["subestação", "alta tensão", "DWG"],
    fileType: "dwg",
    fileSize: "18.2 MB",
    createdAt: "2024-06-18",
    isPublic: true,
  },
];
