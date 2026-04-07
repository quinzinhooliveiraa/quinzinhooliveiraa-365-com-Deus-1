import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  BookOpen,
  PenLine,
  Brain,
  Target,
  Eye,
  Flame,
  Clock,
  Trophy,
  ChevronDown,
  ChevronUp,
  Crown,
  ArrowUpRight,
  Smartphone,
  Calendar,
  Play,
  RotateCcw,
  AlertTriangle,
  LockKeyhole,
  Sparkles,
  Star,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Quote,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { JOURNEYS, type JourneyData, type JourneyDay } from "./Journey";
import { apiRequest } from "@/lib/queryClient";

interface JourneyReport {
  titulo: string;
  resumo: string;
  pontosFortes: string[];
  pontosAtencao: string[];
  oQueMelhorou: string;
  oQuePodeMelhorar: string;
  dicaPratica: string;
  fraseMotivacional: string;
}

function JourneyReportView({ report, journeyTitle, onClose, gradientFrom, gradientTo }: {
  report: JourneyReport;
  journeyTitle: string;
  onClose: () => void;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-in fade-in duration-500">
      <div className="min-h-screen pb-24">
        <div className="relative pt-12 pb-8 px-6" style={{ background: `linear-gradient(135deg, ${gradientFrom}30, ${gradientTo}15)` }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm"
            data-testid="button-close-report"
          >
            <X size={20} />
          </button>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}>
              <FileText size={28} className="text-white" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1" style={{ color: gradientFrom }}>
              Relatório da Jornada
            </p>
            <h1 className="text-xl font-serif text-foreground mb-1" data-testid="text-report-title">
              {report.titulo}
            </h1>
            <p className="text-xs text-muted-foreground">{journeyTitle}</p>
          </div>
        </div>

        <div className="px-6 space-y-5 mt-6">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-sm text-foreground leading-relaxed" data-testid="text-report-summary">
              {report.resumo}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Star size={18} className="text-green-600" />
              <h3 className="text-sm font-bold text-green-700 dark:text-green-400">Seus Pontos Fortes</h3>
            </div>
            <ul className="space-y-2">
              {report.pontosFortes.map((ponto, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  <span>{ponto}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-amber-600" />
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">Pontos de Atenção</h3>
            </div>
            <ul className="space-y-2">
              {report.pontosAtencao.map((ponto, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                  <span>{ponto}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">O Que Melhorou</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{report.oQueMelhorou}</p>
          </div>

          <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-violet-600" />
              <h3 className="text-sm font-bold text-violet-700 dark:text-violet-400">O Que Pode Melhorar</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{report.oQuePodeMelhorar}</p>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={18} className="text-primary" />
              <h3 className="text-sm font-bold text-primary">Dica Prática</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed font-medium">{report.dicaPratica}</p>
          </div>

          <div className="p-5 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${gradientFrom}15, ${gradientTo}10)` }}>
            <Quote size={20} className="mx-auto mb-2 opacity-40" />
            <p className="text-base font-serif text-foreground italic leading-relaxed">
              "{report.fraseMotivacional}"
            </p>
          </div>

          <div className="flex justify-center pt-2 pb-4">
            <a
              href="/reports"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
              data-testid="link-view-reports"
            >
              <FileText size={14} />
              Ver todos os relatórios salvos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  reflexao: { icon: Brain, label: "Reflexão", color: "text-violet-500 bg-violet-500/10" },
  acao: { icon: Target, label: "Prática", color: "text-blue-500 bg-blue-500/10" },
  escrita: { icon: PenLine, label: "Escrita", color: "text-amber-500 bg-amber-500/10" },
  meditacao: { icon: Eye, label: "Meditação", color: "text-emerald-500 bg-emerald-500/10" },
  desafio: { icon: Flame, label: "Desafio", color: "text-red-500 bg-red-500/10" },
  leitura: { icon: BookOpen, label: "Leitura", color: "text-cyan-500 bg-cyan-500/10" },
  app: { icon: Smartphone, label: "No App", color: "text-primary bg-primary/10" },
};

function JourneyStartConfirm({ journey, onStart }: { journey: JourneyData; onStart: () => void }) {
  return (
    <div className="min-h-screen bg-background pb-24 animate-in fade-in duration-500" data-testid="journey-start-confirm">
      <div
        className="relative pt-14 pb-8 px-6"
        style={{
          background: `linear-gradient(135deg, ${journey.gradientFrom}20, ${journey.gradientTo}10)`,
        }}
      >
        <Link href="/journey" className="inline-block p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors" data-testid="button-back-start">
          <ChevronLeft size={24} className="text-foreground" />
        </Link>
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1" style={{ color: journey.gradientFrom }}>
            {journey.subtitle}
          </p>
          <h1 className="text-2xl font-serif text-foreground">{journey.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{journey.description}</p>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${journey.gradientFrom}, ${journey.gradientTo})` }}
            >
              <Calendar size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{journey.totalDays} dias de transformação</p>
              <p className="text-[11px] text-muted-foreground">5-20 min por dia</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Reflexão", "Escrita", "Meditação", "Desafios", "Prática"].map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Pronto para começar? Cada dia traz uma nova atividade pensada para te ajudar a crescer.
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pt-6 bg-gradient-to-t from-background via-background to-transparent" style={{ paddingBottom: 'calc(5rem + var(--safe-bottom))' }}>
        <button
          onClick={onStart}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${journey.gradientFrom}, ${journey.gradientTo})` }}
          data-testid="button-start-journey"
        >
          <Play size={16} />
          Começar Jornada
        </button>
      </div>
    </div>
  );
}

export default function JourneyDetail() {
  const [, params] = useRoute("/journey/:id");
  const journeyId = params?.id || "";
  const journey = JOURNEYS.find((j) => j.id === journeyId);
  const { user } = useAuth();
  const isPremium = user?.hasPremium || user?.role === "admin";
  const [, navigate] = useLocation();

  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [completedTimestamps, setCompletedTimestamps] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [animatingDay, setAnimatingDay] = useState<string | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [restartInput, setRestartInput] = useState("");
  const [restarting, setRestarting] = useState(false);
  const [writingDayId, setWritingDayId] = useState<string | null>(null);
  const [writingText, setWritingText] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);
  const [report, setReport] = useState<JourneyReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!journeyId) return;
    fetch("/api/journey/progress", { credentials: "include" })
      .then((r) => r.json())
      .then((data: any[]) => {
        const p = data.find((d) => d.journeyId === journeyId);
        if (p) {
          setCompletedDays(p.completedDays);
          try {
            const ts = JSON.parse(p.completedTimestamps || "{}");
            setCompletedTimestamps(ts);
          } catch {}
        } else {
          setShowStartConfirm(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [journeyId]);

  const generateReport = async (forcePaid = false) => {
    if (!journey) return;
    setLoadingReport(true);
    setReportError("");
    try {
      const dayDescs = journey.days.map(d => `Dia ${d.day}: ${d.title} (${d.type})`).join("\n");
      const res = await fetch("/api/journey/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          journeyId: journey.id,
          journeyTitle: journey.title,
          totalDays: journey.totalDays,
          completedDays: completedDays.length,
          dayDescriptions: dayDescs,
          forcePaid,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
        setShowReport(true);
      } else if (res.status === 402) {
        setShowPaymentPopup(true);
      } else {
        const err = await res.json().catch(() => ({}));
        setReportError(err.message || "Erro ao gerar relatório. Tente novamente.");
      }
    } catch {
      setReportError("Erro de conexão. Verifique sua internet e tente novamente.");
    }
    setLoadingReport(false);
  };

  const handleReportCheckout = async () => {
    if (!journey) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/journey/report-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ journeyId: journey.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setReportError("Erro ao iniciar pagamento.");
      }
    } catch {
      setReportError("Erro de conexão.");
    }
    setCheckoutLoading(false);
  };

  useEffect(() => {
    if (!journeyId || loading || completedDays.length === 0) return;
    if (journey && completedDays.length >= journey.totalDays) {
      fetch("/api/journey/reports", { credentials: "include" })
        .then(r => r.json())
        .then((reports: any[]) => {
          const existing = reports.find((r: any) => r.journeyId === journeyId);
          if (existing) {
            try {
              setReport(JSON.parse(existing.reportData));
            } catch {}
          }
        })
        .catch(() => {});

      const params = new URLSearchParams(window.location.search);
      if (params.get("report_paid") === "true") {
        window.history.replaceState({}, "", window.location.pathname);
        generateReport(true);
      }
    }
  }, [journeyId, loading, completedDays.length]);

  useEffect(() => {
    if (!journey || loading) return;
    const firstIncomplete = journey.days.findIndex((d) => !completedDays.includes(d.id));
    if (firstIncomplete >= 0) {
      setExpandedWeek(Math.floor(firstIncomplete / 7));
    } else {
      setExpandedWeek(Math.floor((journey.days.length - 1) / 7));
    }
  }, [journey, loading, completedDays.length === 0]);

  if (!journey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Jornada não encontrada</p>
          <Link href="/journey" className="text-primary text-sm font-medium">
            Voltar às jornadas
          </Link>
        </div>
      </div>
    );
  }

  const handleStartJourney = async () => {
    try {
      await fetch("/api/journey/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ journeyId }),
      });
      setShowStartConfirm(false);
      setCompletedDays([]);
    } catch {}
  };

  const handleRestartJourney = async () => {
    if (restartInput.toLowerCase().trim() !== "recomeçar") return;
    setRestarting(true);
    try {
      const res = await fetch("/api/journey/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ journeyId }),
      });
      if (res.ok) {
        setCompletedDays([]);
        setShowRestartDialog(false);
        setRestartInput("");
        setExpandedWeek(0);
      }
    } catch {}
    setRestarting(false);
  };

  if (showStartConfirm && !loading) {
    return <JourneyStartConfirm journey={journey} onStart={handleStartJourney} />;
  }

  const progress = Math.round((completedDays.length / journey.totalDays) * 100);
  const isCompleted = completedDays.length >= journey.totalDays;

  const toggleDay = async (dayId: string) => {
    if (!isPremium) return;
    const isCompleting = !completedDays.includes(dayId);
    setAnimatingDay(dayId);
    setSaveError("");

    try {
      const endpoint = isCompleting ? "/api/journey/complete-day" : "/api/journey/uncomplete-day";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ journeyId, dayId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedDays(data.completedDays);
        try {
          const ts = JSON.parse(data.completedTimestamps || "{}");
          setCompletedTimestamps(ts);
        } catch {}
      } else {
        const err = await res.json().catch(() => ({ message: "Erro ao salvar" }));
        setSaveError(err.message || "Erro ao salvar progresso");
      }
    } catch {
      setSaveError("Erro de conexão. Verifique sua internet.");
    }
    setTimeout(() => setAnimatingDay(null), 300);
  };

  const weeks: JourneyDay[][] = [];
  for (let i = 0; i < journey.days.length; i += 7) {
    weeks.push(journey.days.slice(i, i + 7));
  }

  const isAdmin = user?.role === "admin";
  const nextDayIndex = journey.days.findIndex((d) => !completedDays.includes(d.id));

  const isDayAccessible = (day: JourneyDay): boolean => {
    if (isAdmin) return true;
    if (completedDays.includes(day.id)) return true;
    const dayIdx = journey.days.findIndex((d) => d.id === day.id);
    if (dayIdx !== nextDayIndex) return false;
    if (dayIdx === 0) return true;
    const prevDay = journey.days[dayIdx - 1];
    const prevCompletedAt = completedTimestamps[prevDay.id];
    if (!prevCompletedAt) return true;
    const completedDate = new Date(prevCompletedAt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return completedDate < todayStart;
  };

  const isDayLockedUntilTomorrow = (day: JourneyDay): boolean => {
    if (isAdmin) return false;
    if (completedDays.includes(day.id)) return false;
    const dayIdx = journey.days.findIndex((d) => d.id === day.id);
    if (dayIdx !== nextDayIndex || dayIdx === 0) return false;
    const prevDay = journey.days[dayIdx - 1];
    const prevCompletedAt = completedTimestamps[prevDay.id];
    if (!prevCompletedAt) return false;
    const completedDate = new Date(prevCompletedAt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return completedDate >= todayStart;
  };

  const handleSaveWriting = async (day: JourneyDay) => {
    if (!writingText.trim()) return;
    setSavingEntry(true);
    setSaveError("");
    try {
      await apiRequest("POST", "/api/journal", {
        text: writingText,
        tags: ["jornada", journey.title.toLowerCase()],
        date: new Date().toISOString().split("T")[0],
      });
      await toggleDay(day.id);
      setWritingDayId(null);
      setWritingText("");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("JOURNAL_LIMIT")) {
        setSaveError("Limite mensal de entradas atingido.");
      } else {
        setSaveError("Erro ao salvar. Tente novamente.");
      }
    }
    setSavingEntry(false);
  };

  const streakCount = (() => {
    let streak = 0;
    for (let i = journey.days.length - 1; i >= 0; i--) {
      if (completedDays.includes(journey.days[i].id)) streak++;
      else break;
    }
    return streak;
  })();

  return (
    <div className="min-h-screen bg-background pb-24 animate-in slide-in-from-right duration-500 overflow-x-hidden" data-testid="page-journey-detail">
      {showRestartDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowRestartDialog(false); setRestartInput(""); }} />
          <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm border border-border shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-serif text-foreground text-center mb-2">Recomeçar Jornada?</h3>
            <p className="text-sm text-muted-foreground text-center mb-1">
              Todo o seu progresso nesta jornada será apagado. Você terá que completar todos os {journey?.totalDays} dias novamente.
            </p>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Esta ação <span className="font-bold text-red-500">não pode ser desfeita</span>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Digite <span className="font-bold text-foreground">recomeçar</span> para confirmar:
                </label>
                <input
                  value={restartInput}
                  onChange={(e) => setRestartInput(e.target.value)}
                  placeholder="recomeçar"
                  className="w-full p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  data-testid="input-restart-confirm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowRestartDialog(false); setRestartInput(""); }}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground active:scale-95 transition-all"
                  data-testid="button-cancel-restart"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRestartJourney}
                  disabled={restartInput.toLowerCase().trim() !== "recomeçar" || restarting}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  data-testid="button-confirm-restart"
                >
                  <RotateCcw size={14} />
                  {restarting ? "Recomeçando..." : "Recomeçar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="relative pt-14 pb-6 px-6"
        style={{
          background: `linear-gradient(135deg, ${journey.gradientFrom}15, ${journey.gradientTo}08)`,
        }}
      >
        <div className="flex items-center justify-between">
          <Link href="/journey" className="inline-block p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors" data-testid="button-back-journey">
            <ChevronLeft size={24} className="text-foreground" />
          </Link>
          {completedDays.length > 0 && (
            <button
              onClick={() => setShowRestartDialog(true)}
              className="p-2 rounded-full hover:bg-muted/50 transition-colors"
              data-testid="button-open-restart"
            >
              <RotateCcw size={18} className="text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1" style={{ color: journey.gradientFrom }}>
                {journey.subtitle}
              </p>
              <h1 className="text-2xl font-serif text-foreground" data-testid="text-journey-detail-title">
                {journey.title}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">{journey.description}</p>
            </div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${journey.gradientFrom}, ${journey.gradientTo})` }}
            >
              {isCompleted ? (
                <Trophy size={24} className="text-white" />
              ) : (
                <span className="text-white text-lg font-bold">{progress}%</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground font-medium">{completedDays.length} de {journey.totalDays} dias</span>
            {streakCount > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <Flame size={12} />
                <span className="font-semibold">{streakCount} dias seguidos</span>
              </div>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {!isPremium && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Conteúdo Premium</span>
          </div>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            Assine o plano premium (R$9,90/mês) para completar desafios e acompanhar seu progresso.
          </p>
        </div>
      )}

      {saveError && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium" data-testid="text-save-error">{saveError}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-6 mt-6 space-y-3">
          {!isCompleted && isPremium && (() => {
            const nextDay = journey.days.find((d) => !completedDays.includes(d.id));
            if (!nextDay) return null;
            const accessible = isDayAccessible(nextDay);
            const lockedTomorrow = isDayLockedUntilTomorrow(nextDay);
            if (!accessible && lockedTomorrow) {
              return (
                <div className="p-4 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 space-y-2 mb-2" data-testid="today-locked">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-amber-600" />
                    <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-amber-600 dark:text-amber-400">Próxima atividade amanhã</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Bom trabalho hoje! Volte amanhã para o Dia {nextDay.day}: <span className="font-medium text-foreground">{nextDay.title}</span>
                  </p>
                </div>
              );
            }
            if (!accessible) return null;
            const config = TYPE_CONFIG[nextDay.type] || TYPE_CONFIG.reflexao;
            const TypeIcon = config.icon;
            return (
              <div
                className="p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-3 mb-2"
                data-testid="today-activity"
              >
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-primary" />
                  <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-primary">Atividade de Hoje</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                    <TypeIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground">DIA {nextDay.day}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{nextDay.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{nextDay.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {(nextDay.type === "escrita" || nextDay.type === "reflexao") && writingDayId !== nextDay.id ? (
                        <button
                          onClick={() => { setWritingDayId(nextDay.id); setWritingText(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold active:scale-95 transition-all"
                          data-testid="button-write-today"
                        >
                          <PenLine size={12} />
                          Escrever Reflexão
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleDay(nextDay.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold active:scale-95 transition-all"
                          data-testid="button-complete-today"
                        >
                          <CheckCircle2 size={12} />
                          Marcar como feito
                        </button>
                      )}
                      {nextDay.appLink && (
                        <button
                          onClick={() => navigate(nextDay.appLink!)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-primary/30 text-primary text-[11px] font-semibold hover:bg-primary/10 transition-colors"
                          data-testid="button-today-applink"
                        >
                          <ArrowUpRight size={11} />
                          Ir para o app
                        </button>
                      )}
                    </div>
                    {writingDayId === nextDay.id && (
                      <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200" data-testid="writing-editor-today">
                        <Textarea
                          value={writingText}
                          onChange={(e) => setWritingText(e.target.value)}
                          placeholder={nextDay.type === "escrita" ? "Escreva seus pensamentos aqui..." : "Anote sua reflexão..."}
                          className="min-h-[120px] text-sm resize-none rounded-xl border-primary/20 focus:border-primary/40"
                          autoFocus
                          data-testid="textarea-writing"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveWriting(nextDay)}
                            disabled={!writingText.trim() || savingEntry}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600 text-white text-[11px] font-semibold active:scale-95 transition-all disabled:opacity-50"
                            data-testid="button-save-writing"
                          >
                            <CheckCircle2 size={12} />
                            {savingEntry ? "Salvando..." : "Salvar e Completar"}
                          </button>
                          <button
                            onClick={() => { setWritingDayId(null); setWritingText(""); }}
                            className="px-3 py-1.5 rounded-full border border-border text-[11px] font-medium text-muted-foreground"
                            data-testid="button-cancel-writing"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {isCompleted && (
            <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 text-center space-y-3 mb-4 animate-in fade-in duration-500">
              <Trophy size={32} className="text-green-500 mx-auto" />
              <h3 className="font-serif text-lg text-green-700 dark:text-green-400">Jornada Concluída!</h3>
              <p className="text-xs text-green-600/80 dark:text-green-400/80">
                Parabéns! Você completou todos os {journey.totalDays} dias. Sua evolução é real.
              </p>
              <button
                onClick={() => {
                  if (report) {
                    setShowReport(true);
                    return;
                  }
                  generateReport();
                }}
                disabled={loadingReport}
                className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg active:scale-[0.97] transition-transform disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${journey.gradientFrom}, ${journey.gradientTo})` }}
                data-testid="button-generate-report"
              >
                {loadingReport ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Gerando relatório...</span>
                  </>
                ) : report ? (
                  <>
                    <FileText size={16} />
                    <span>Ver Meu Relatório</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Gerar Meu Relatório</span>
                  </>
                )}
              </button>
              {reportError && (
                <p className="text-xs text-red-500 text-center mt-2" data-testid="text-report-error">{reportError}</p>
              )}
            </div>
          )}

          {showPaymentPopup && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPaymentPopup(false)} />
              <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm border border-border shadow-2xl animate-in zoom-in-95 duration-300">
                <button
                  onClick={() => setShowPaymentPopup(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
                  data-testid="button-close-payment"
                >
                  <X size={16} />
                </button>
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${journey.gradientFrom}20, ${journey.gradientTo}15)` }}>
                    <Brain size={28} style={{ color: journey.gradientFrom }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-foreground">Relatório com IA</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Receba uma análise personalizada da sua jornada feita por inteligência artificial
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                    <p className="text-[10px] text-green-600 font-medium">Seu primeiro relatório já foi usado ✓</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-left text-xs text-muted-foreground">
                      <Star size={12} className="text-amber-500 shrink-0" />
                      <span>Pontos fortes e de atenção personalizados</span>
                    </div>
                    <div className="flex items-center gap-2 text-left text-xs text-muted-foreground">
                      <TrendingUp size={12} className="text-blue-500 shrink-0" />
                      <span>Análise do que melhorou e pode melhorar</span>
                    </div>
                    <div className="flex items-center gap-2 text-left text-xs text-muted-foreground">
                      <Lightbulb size={12} className="text-violet-500 shrink-0" />
                      <span>Dica prática e frase motivacional</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-2xl font-bold text-foreground">R$ 2,90</p>
                    <p className="text-[10px] text-muted-foreground">pagamento único por relatório</p>
                  </div>
                  <button
                    onClick={handleReportCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold shadow-lg active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${journey.gradientFrom}, ${journey.gradientTo})` }}
                    data-testid="button-pay-report"
                  >
                    {checkoutLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Gerar Relatório
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showReport && report && (
            <JourneyReportView
              report={report}
              journeyTitle={journey.title}
              onClose={() => setShowReport(false)}
              gradientFrom={journey.gradientFrom}
              gradientTo={journey.gradientTo}
            />
          )}

          {weeks.map((week, weekIndex) => {
            const weekCompleted = week.filter((d) => completedDays.includes(d.id)).length;
            const weekHasAccessible = week.some((d) => isDayAccessible(d));
            const isExpanded = expandedWeek === weekIndex;
            const weekLabel = weekIndex < 4 ? `Semana ${weekIndex + 1}` : `Dias ${weekIndex * 7 + 1}-${Math.min((weekIndex + 1) * 7, journey.totalDays)}`;

            return (
              <div key={weekIndex} className="rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : weekIndex)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  data-testid={`button-week-${weekIndex}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                      weekCompleted === week.length
                        ? "bg-green-500/10 text-green-600"
                        : weekHasAccessible
                        ? weekCompleted > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        : "bg-muted text-muted-foreground/40"
                    }`}>
                      {weekCompleted === week.length ? (
                        <CheckCircle2 size={16} />
                      ) : !weekHasAccessible && !isAdmin ? (
                        <LockKeyhole size={14} />
                      ) : (
                        `${weekCompleted}/${week.length}`
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-foreground">{weekLabel}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {weekCompleted === week.length ? "Completa" : `${weekCompleted} de ${week.length} completos`}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border/50 animate-in slide-in-from-top-2 duration-200">
                    {week.map((day) => {
                      const isDone = completedDays.includes(day.id);
                      const accessible = isDayAccessible(day);
                      const config = TYPE_CONFIG[day.type] || TYPE_CONFIG.reflexao;
                      const TypeIcon = config.icon;
                      const isAnimating = animatingDay === day.id;

                      const lockedTomorrow = isDayLockedUntilTomorrow(day);
                      if (!accessible && !isDone) {
                        return (
                          <div
                            key={day.id}
                            className="p-4 flex items-center gap-3 opacity-40"
                            data-testid={`day-${day.id}`}
                          >
                            <LockKeyhole size={18} className="text-muted-foreground/40 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold text-muted-foreground">DIA {day.day}</span>
                              <p className="text-xs text-muted-foreground/60 italic">
                                {lockedTomorrow ? "Disponível amanhã — descanse e reflita" : "Complete o dia anterior para desbloquear"}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={day.id}
                          className={`p-4 flex items-start gap-3 transition-all ${isAnimating ? "scale-[0.98] opacity-70" : ""}`}
                          data-testid={`day-${day.id}`}
                        >
                          <button
                            onClick={() => toggleDay(day.id)}
                            disabled={!isPremium}
                            className={`mt-0.5 shrink-0 transition-all ${isPremium ? "active:scale-90" : "opacity-50"}`}
                            data-testid={`button-toggle-day-${day.id}`}
                          >
                            {isDone ? (
                              <CheckCircle2 size={22} className="text-green-500" />
                            ) : (
                              <Circle size={22} className="text-muted-foreground/30" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold text-muted-foreground">DIA {day.day}</span>
                              <div className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 ${config.color}`}>
                                <TypeIcon size={9} />
                                {config.label}
                              </div>
                            </div>
                            <h4 className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {day.title}
                            </h4>
                            <p className={`text-[11px] mt-0.5 ${isDone ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                              {day.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1">
                                <Clock size={10} className="text-muted-foreground/50" />
                                <span className="text-[10px] text-muted-foreground/50">{day.duration}</span>
                              </div>
                              {day.appLink && !isDone && isPremium && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(day.appLink!);
                                  }}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors"
                                  data-testid={`button-applink-${day.id}`}
                                >
                                  <ArrowUpRight size={10} />
                                  Abrir no app
                                </button>
                              )}
                              {!isDone && isPremium && (day.type === "escrita" || day.type === "reflexao") && writingDayId !== day.id && accessible && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setWritingDayId(day.id); setWritingText(""); }}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold hover:bg-amber-500/20 transition-colors"
                                  data-testid={`button-write-${day.id}`}
                                >
                                  <PenLine size={10} />
                                  Escrever
                                </button>
                              )}
                            </div>
                            {writingDayId === day.id && (
                              <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200" data-testid={`writing-editor-${day.id}`}>
                                <Textarea
                                  value={writingText}
                                  onChange={(e) => setWritingText(e.target.value)}
                                  placeholder={day.type === "escrita" ? "Escreva seus pensamentos aqui..." : "Anote sua reflexão..."}
                                  className="min-h-[100px] text-sm resize-none rounded-xl border-primary/20 focus:border-primary/40"
                                  autoFocus
                                  data-testid={`textarea-writing-${day.id}`}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveWriting(day)}
                                    disabled={!writingText.trim() || savingEntry}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600 text-white text-[11px] font-semibold active:scale-95 transition-all disabled:opacity-50"
                                    data-testid={`button-save-writing-${day.id}`}
                                  >
                                    <CheckCircle2 size={12} />
                                    {savingEntry ? "Salvando..." : "Salvar e Completar"}
                                  </button>
                                  <button
                                    onClick={() => { setWritingDayId(null); setWritingText(""); }}
                                    className="px-3 py-1.5 rounded-full border border-border text-[11px] font-medium text-muted-foreground"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
