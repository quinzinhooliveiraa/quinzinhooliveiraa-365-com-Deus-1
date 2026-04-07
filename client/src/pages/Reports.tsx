import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  FileText,
  Star,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Lightbulb,
  Quote,
  Download,
  Image as ImageIcon,
  X,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface ReportData {
  titulo: string;
  resumo: string;
  pontosFortes: string[];
  pontosAtencao: string[];
  oQueMelhorou: string;
  oQuePodeMelhorar: string;
  dicaPratica: string;
  fraseMotivacional: string;
}

interface SavedReport {
  id: number;
  journeyId: string;
  journeyTitle: string;
  report: ReportData;
  entriesCount: number;
  completedDays: number;
  totalDays: number;
  createdAt: string;
}

const JOURNEY_COLORS: Record<string, { from: string; to: string }> = {
  autoconhecimento: { from: "#7c3aed", to: "#a855f7" },
  "detox-digital": { from: "#0ea5e9", to: "#38bdf8" },
  profissao: { from: "#f59e0b", to: "#fbbf24" },
  relacionamentos: { from: "#ec4899", to: "#f472b6" },
  ansiedade: { from: "#10b981", to: "#34d399" },
  habitos: { from: "#f97316", to: "#fb923c" },
};

function getJourneyColors(journeyId: string) {
  return JOURNEY_COLORS[journeyId] || { from: "#6366f1", to: "#818cf8" };
}

function ReportDetail({ report, onClose }: { report: SavedReport; onClose: () => void }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const colors = getJourneyColors(report.journeyId);

  const exportAsPNG = async () => {
    if (!reportRef.current) return;
    setExporting("png");
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `relatorio-${report.journeyTitle.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {}
    setExporting(null);
  };

  const exportAsPDF = async () => {
    if (!reportRef.current) return;
    setExporting("pdf");
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = 210;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      const pdf = new jsPDF("p", "mm", [pdfWidth, Math.max(pdfHeight, 297)]);
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`relatorio-${report.journeyTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch {}
    setExporting(null);
  };

  const r = report.report;
  const dateStr = new Date(report.createdAt).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-in fade-in duration-300">
      <div className="sticky z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between" style={{ top: "var(--safe-top, 0px)" }}>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" data-testid="button-close-report-detail">
          <X size={20} />
        </button>
        <div className="flex gap-2">
          <button
            onClick={exportAsPNG}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            data-testid="button-export-png"
          >
            {exporting === "png" ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
            PNG
          </button>
          <button
            onClick={exportAsPDF}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            data-testid="button-export-pdf"
          >
            {exporting === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PDF
          </button>
        </div>
      </div>

      <div ref={reportRef} style={{ background: "#ffffff", color: "#1a1a1a" }}>
        <div style={{ padding: "32px 24px", background: `linear-gradient(135deg, ${colors.from}20, ${colors.to}10)` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "16px", margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
            }}>
              <FileText size={28} color="white" />
            </div>
            <p style={{ fontSize: "10px", letterSpacing: "0.2em", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px", color: colors.from }}>
              Relatório da Jornada
            </p>
            <h1 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "4px" }}>{r.titulo}</h1>
            <p style={{ fontSize: "12px", color: "#666" }}>{report.journeyTitle} — {dateStr}</p>
            <p style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
              {report.completedDays}/{report.totalDays} dias • {report.entriesCount} reflexões escritas
            </p>
          </div>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ padding: "16px", borderRadius: "16px", background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "14px", lineHeight: "1.6" }}>{r.resumo}</p>
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Star size={18} color="#16a34a" />
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#15803d" }}>Seus Pontos Fortes</h3>
            </div>
            {r.pontosFortes.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: "#22c55e" }}>✓</span>
                <span>{p}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", background: "#fffbeb", border: "1px solid #fde68a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <AlertCircle size={18} color="#d97706" />
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#b45309" }}>Pontos de Atenção</h3>
            </div>
            {r.pontosAtencao.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: "#f59e0b" }}>!</span>
                <span>{p}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <TrendingUp size={18} color="#2563eb" />
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1d4ed8" }}>O Que Melhorou</h3>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.6" }}>{r.oQueMelhorou}</p>
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Sparkles size={18} color="#7c3aed" />
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#6d28d9" }}>O Que Pode Melhorar</h3>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.6" }}>{r.oQuePodeMelhorar}</p>
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", background: "#f0f9ff", border: "1px solid #bae6fd" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Lightbulb size={18} color="#0284c7" />
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0369a1" }}>Dica Prática</h3>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.6", fontWeight: "500" }}>{r.dicaPratica}</p>
          </div>

          <div style={{ padding: "20px", borderRadius: "16px", textAlign: "center", background: `linear-gradient(135deg, ${colors.from}10, ${colors.to}08)` }}>
            <Quote size={20} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            <p style={{ fontSize: "15px", fontStyle: "italic", lineHeight: "1.6" }}>
              "{r.fraseMotivacional}"
            </p>
          </div>

          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <p style={{ fontSize: "10px", color: "#999", letterSpacing: "0.1em" }}>365 Encontros com Deus Pai</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [, setLocation] = useLocation();
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);

  const { data: reports = [], isLoading } = useQuery<SavedReport[]>({
    queryKey: ["/api/journey/reports"],
    queryFn: async () => {
      const res = await fetch("/api/journey/reports", { credentials: "include" });
      return res.json();
    },
  });

  if (selectedReport) {
    return <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />;
  }

  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-500" data-testid="page-reports">
      <div className="p-4">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-serif mb-2" data-testid="text-reports-title">
            Meus Relatórios
          </h1>
          <p className="text-muted-foreground text-sm">
            Seus relatórios de jornadas completadas ficam guardados aqui.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Nenhum relatório ainda.</p>
            <p className="text-xs mt-1 opacity-70">
              Complete uma jornada para gerar seu primeiro relatório!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const colors = getJourneyColors(report.journeyId);
              const dateStr = new Date(report.createdAt).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="w-full p-4 rounded-2xl bg-card border border-border hover:shadow-md transition-all text-left active:scale-[0.99] group"
                  data-testid={`report-card-${report.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                    >
                      <FileText size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {report.report.titulo}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{report.journeyTitle}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar size={10} /> {dateStr}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {report.completedDays}/{report.totalDays} dias
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
