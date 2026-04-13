import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PenLine, ChevronRight, Quote, CheckCircle2, BarChart2, BookOpen,
} from "lucide-react";
import PremiumPaywall from "@/components/PremiumPaywall";
import { useAuth } from "@/hooks/useAuth";
import { useCreateEntry } from "@/hooks/useJournal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { reflectionPhrases } from "@/data/reflectionPhrases";
import { apiRequest } from "@/lib/queryClient";

/* ─────── Moods ─────── */
const CHECK_IN_MOODS = [
  { id: "grato",       label: "Grato",       emoji: "🙏", color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",   response: "A gratidão abre o coração para ver as bênçãos que já existem. Hoje, perceba o amor de Deus nas pequenas coisas." },
  { id: "alegre",      label: "Alegre",      emoji: "✨", color: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300", response: "A alegria do Senhor é a tua força! Partilha esse bem com quem está ao teu redor hoje." },
  { id: "em_paz",      label: "Em paz",      emoji: "🕊️", color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",         response: "A paz de Deus guarda o coração e a mente. Que essa paz te acompanhe por todo o dia." },
  { id: "esperancoso", label: "Esperançoso", emoji: "🌱", color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",   response: "A esperança em Deus nunca decepciona. O melhor ainda está por vir na tua história." },
  { id: "ansioso",     label: "Ansioso",     emoji: "🌊", color: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300", response: "Não te inquietes com nada — apresenta tudo a Deus em oração. Ele cuida de ti." },
  { id: "triste",      label: "Triste",      emoji: "🤍", color: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300",   response: "Deus está perto dos quebrantados de coração. Não estás só — Ele te vê e te sustenta." },
  { id: "cansado",     label: "Cansado",     emoji: "🌙", color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300", response: "Vem a Mim, todos os que estão cansados — diz Jesus. Hoje, recarrega na presença d'Ele." },
  { id: "buscando",    label: "À procura",   emoji: "🔍", color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300", response: "Quem busca, encontra. Continua a buscar a Deus — Ele se revelará a ti." },
];

/* ─────── Daily phrase (fixed per day, never reloads) ─────── */
function getTodayPhrase() {
  const today = new Date().toISOString().split("T")[0];
  const key = `365encontros-phrase-${today}`;
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    const idx = Number(saved);
    return reflectionPhrases[idx % reflectionPhrases.length];
  }
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const idx = dayOfYear % reflectionPhrases.length;
  localStorage.setItem(key, String(idx));
  return reflectionPhrases[idx];
}

/* ─────── Types ─────── */
type DailyChapter = {
  id: number; order: number; title: string; tag: string | null;
  excerpt: string | null; isPreview: boolean; pageType: string; pdfPage: number | null;
};
type MoodCheckin = { id: number; mood: string; entry: string | null; createdAt: string; };


/* ─────── Daily Check-in (DB) — múltiplos por dia ─────── */
const COOLDOWN_MS = 15 * 60 * 1000;

function useCooldownSeconds(todayCheckins: MoodCheckin[]) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (todayCheckins.length === 0) { setRemaining(0); return; }
    const last = new Date(todayCheckins[0].createdAt).getTime();
    const calc = () => {
      const diff = COOLDOWN_MS - (Date.now() - last);
      setRemaining(diff > 0 ? Math.ceil(diff / 1000) : 0);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [todayCheckins]);

  return remaining;
}

function DailyCheckIn() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const { data: todayCheckins = [], status } = useQuery<MoodCheckin[]>({
    queryKey: ["/api/checkins/today"],
    queryFn: async () => {
      const r = await fetch("/api/checkins/today", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const cooldownSeconds = useCooldownSeconds(todayCheckins);
  const isInCooldown = cooldownSeconds > 0;

  const saveMutation = useMutation({
    mutationFn: async ({ mood, entry }: { mood: string; entry: string }) =>
      (await apiRequest("POST", "/api/checkins", {
        mood, entry, tags: [],
        date: new Date().toLocaleDateString("pt-BR"),
      })).json(),
    onSuccess: (_, { mood }) => {
      setJustSaved(mood);
      setSelected(null);
      setNoteText("");
      qc.invalidateQueries({ queryKey: ["/api/checkins/today"] });
      qc.invalidateQueries({ queryKey: ["/api/checkins/month"] });
      setTimeout(() => setJustSaved(null), 3500);
    },
  });

  const hasDoneCheckin = todayCheckins.length > 0;

  if (status === "pending") return null;

  const justSavedObj = CHECK_IN_MOODS.find(m => m.id === justSaved);

  return (
    <div className="bg-card/80 border border-border/60 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm" data-testid="card-daily-checkin">
      <div className="border-b border-border/50 px-5 py-3 flex items-center gap-2">
        <CheckCircle2 size={14} className={`shrink-0 ${hasDoneCheckin ? "text-green-500" : "text-muted-foreground"}`} />
        <span className="text-xs font-serif font-bold text-foreground uppercase tracking-widest">O Meu Coração Hoje</span>
        {hasDoneCheckin && (
          <span className="ml-auto text-[10px] text-muted-foreground">{todayCheckins.length} {todayCheckins.length === 1 ? "momento" : "momentos"}</span>
        )}
      </div>

      {/* Seletor de humor — sempre visível */}
      <div className="px-5 py-4 space-y-4">
        {justSavedObj ? (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
            <span className="text-2xl">{justSavedObj.emoji}</span>
            <p className="text-sm font-serif text-foreground/90 leading-relaxed italic">"{justSavedObj.response}"</p>
          </div>
        ) : isInCooldown ? (
          <div className="flex items-center gap-3 bg-muted/60 border border-border/40 rounded-xl px-4 py-3">
            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Momento registado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Próximo check-in disponível em{" "}
                <span className="font-semibold tabular-nums">
                  {Math.floor(cooldownSeconds / 60)}:{String(cooldownSeconds % 60).padStart(2, "0")}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {hasDoneCheckin ? "Como o teu coração está agora?" : "Como o teu coração está diante do Senhor hoje?"}
          </p>
        )}
        <div className={`grid grid-cols-4 gap-2 transition-opacity ${isInCooldown ? "opacity-40 pointer-events-none" : ""}`}>
          {CHECK_IN_MOODS.map(mood => (
            <button
              key={mood.id}
              onClick={() => {
                setSelected(mood.id === selected ? null : mood.id);
                setNoteText("");
              }}
              data-testid={`button-checkin-${mood.id}`}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all hover-elevate ${
                selected === mood.id ? mood.color + " ring-2 ring-primary/30 scale-105" : "bg-background/50 border-border/40 text-foreground/60"
              }`}
            >
              <span className="text-xl leading-none">{mood.emoji}</span>
              <span className="text-[10px] font-medium leading-tight">{mood.label}</span>
            </button>
          ))}
        </div>

        {/* Textarea opcional — aparece ao selecionar um humor */}
        {selected && !isInCooldown && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Escreve o que estás a sentir... (opcional)"
              rows={3}
              className="w-full bg-background/60 border border-border/50 rounded-xl px-4 py-3 text-sm font-serif leading-relaxed text-foreground placeholder:text-muted-foreground/70 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
              data-testid="textarea-checkin-note"
            />
          </div>
        )}

        <button
          onClick={() => selected && !isInCooldown && saveMutation.mutate({ mood: selected, entry: noteText.trim() })}
          disabled={!selected || saveMutation.isPending || isInCooldown}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
          data-testid="button-confirm-checkin"
        >
          {saveMutation.isPending ? "A entregar..." : "Entregar o meu coração ao Pai"}
        </button>
      </div>

      {/* Rodapé — resumo do dia + link para relatório */}
      <div className="border-t border-border/40 px-5 py-3 flex items-center justify-between">
        {hasDoneCheckin ? (
          <div className="flex items-center gap-2">
            <span className="flex gap-0.5">
              {todayCheckins.slice(0, 5).map(c => {
                const mObj = CHECK_IN_MOODS.find(m => m.id === c.mood);
                return <span key={c.id} className="text-sm leading-none">{mObj?.emoji ?? "•"}</span>;
              })}
            </span>
            <p className="text-[11px] text-muted-foreground">
              {todayCheckins.length} {todayCheckins.length === 1 ? "momento" : "momentos"} hoje
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Nenhum momento registado hoje</p>
        )}
        <button
          onClick={() => navigate("/checkins/report")}
          className="flex items-center gap-1 text-[11px] font-medium text-primary"
          data-testid="button-view-monthly-report"
        >
          <BarChart2 size={11} /> Relatório
        </button>
      </div>
    </div>
  );
}

/* ─────── Daily Phrase ─────── */
function DailyPhrase() {
  const [phrase] = useState(() => getTodayPhrase());
  return (
    <div className="bg-card/80 border border-border/60 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm" data-testid="card-daily-phrase">
      <div className="border-b border-border/50 px-5 py-3 flex items-center gap-2">
        <Quote size={14} className="text-muted-foreground shrink-0" />
        <span className="text-xs font-serif font-bold text-foreground uppercase tracking-widest">Palavra do Dia</span>
      </div>
      <div className="px-5 py-5">
        <p className="font-serif text-base leading-relaxed text-foreground italic">"{phrase.text}"</p>
        {phrase.reference && <p className="mt-3 text-xs font-medium text-primary/80">— {phrase.reference}</p>}
      </div>
    </div>
  );
}

/* ─────── Home ─────── */
export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const createEntry = useCreateEntry();
  const [journalText, setJournalText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  const { greeting, userName } = useMemo(() => {
    const brDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hour = brDate.getHours();
    const name = user?.name || "";
    const nameStr = name ? `, ${name.split(" ")[0]}` : "";
    let g = "Bom dia";
    if (hour >= 12 && hour < 18) g = "Boa tarde";
    else if (hour >= 18 || hour < 5) g = "Boa noite";
    return { greeting: g, userName: nameStr };
  }, [user]);

  const { data: purchaseStatus } = useQuery<{ purchased: boolean }>({
    queryKey: ["/api/book/purchase-status"],
    queryFn: async () => (await fetch("/api/book/purchase-status", { credentials: "include" })).json(),
  });

  const purchased = purchaseStatus?.purchased ?? false;
  const isAdmin = user?.role === "admin";
  const hasPremium = (user as any)?.hasPremium ?? false;
  const hasAccess = purchased || isAdmin || hasPremium;

  const { data: todayData, isLoading: isLoadingChapter } = useQuery<{ chapter: DailyChapter | null; dayOfYear: number }>({
    queryKey: ["/api/book/today"],
    queryFn: async () => (await fetch("/api/book/today", { credentials: "include" })).json(),
    enabled: hasAccess,
  });

  const { data: entries = [] } = useQuery<any[]>({
    queryKey: ["/api/journal"],
    queryFn: async () => {
      const r = await fetch("/api/journal", { credentials: "include" });
      return r.ok ? r.json() : [];
    },
  });

  const computedDayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dayOfYear = todayData?.dayOfYear ?? computedDayOfYear;
  const chapter = todayData?.chapter ?? null;

  const handleSaveJournal = async () => {
    if (!journalText.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await createEntry.mutateAsync({ text: JSON.stringify({ text: journalText }), tags: [], date: new Date().toISOString().split("T")[0] });
      setIsSaved(true);
      setJournalText("");
      setTimeout(() => setIsSaved(false), 2000);
    } catch {}
    setIsSaving(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-serif text-lg">365 Encontros</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-4">

      {/* Header */}
      <div className="pt-0 pb-5 relative">
        <p className="relative text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.2em]">{todayCapitalized}</p>
        <h1 className="relative font-serif text-2xl font-bold text-foreground mt-1">{greeting}{userName}</h1>
        <p className="relative text-sm text-muted-foreground mt-1">
          <span className="text-primary font-semibold">✦</span> Encontro #{dayOfYear} com Deus Pai
        </p>
      </div>

      {/* Devotional Paywall — shown when no access */}
      {!hasAccess && (
        <div className="bg-card/80 border border-border/60 rounded-xl overflow-hidden shadow-sm" data-testid="card-devotional-paywall">
          <div className="bg-primary/8 border-b border-border/50 px-5 py-3 flex items-center gap-2">
            <span className="text-primary text-sm shrink-0">✦</span>
            <span className="text-xs font-sans font-semibold text-primary uppercase tracking-[0.15em]">Devocional de Hoje</span>
          </div>
          <PremiumPaywall
            icon={<BookOpen className="w-7 h-7 text-primary" />}
            title="Devocional Diário"
            description="Acede ao encontro diário com o Pai — versículo, reflexão e oração guiada para cada dia do ano."
            features={[
              "365 encontros diários com Deus Pai",
              "Versículo, reflexão e oração guiada",
              "Biblioteca com mais livros espirituais",
              "Comunidade de fé",
            ]}
          />
        </div>
      )}

      {/* Devotional — only for users with access, always first */}
      {hasAccess && (
        <div className="bg-card/80 border border-border/60 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm" data-testid="card-daily-devotional">
          <div className="bg-primary/8 border-b border-border/50 px-5 py-3 flex items-center gap-2">
            <span className="text-primary text-sm shrink-0">✦</span>
            <span className="text-xs font-sans font-semibold text-primary uppercase tracking-[0.15em]">Devocional de Hoje</span>
            <span className="ml-auto text-xs text-muted-foreground">Dia {dayOfYear} de 365</span>
          </div>
          <div className="px-5 py-5">
            {isLoadingChapter ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-4/5" />
              </div>
            ) : chapter ? (
              <>
                <h2 className="font-serif text-xl font-bold text-foreground mb-2">{chapter.title}</h2>
                {chapter.tag && <p className="text-xs text-primary font-medium mb-3 italic">"{chapter.tag}"</p>}
                {chapter.excerpt && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{chapter.excerpt}</p>}
                <button onClick={() => navigate("/book?open=today")} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary" data-testid="button-read-devotional">
                  Ler devocional completo <ChevronRight size={14} />
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-1">Ainda não há encontro registado para hoje.</p>
                <button onClick={() => navigate("/book")} className="text-sm font-medium text-primary flex items-center gap-1 mx-auto" data-testid="button-explore-devotional">
                  Buscar o Senhor hoje <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-in */}
      <DailyCheckIn />

      {/* Phrase */}
      <DailyPhrase />

      {/* Journal */}
      <div className="bg-card/80 border border-border/60 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm" data-testid="card-journal-section">
        <div className="border-b border-border/50 px-5 py-3 flex items-center gap-2">
          <PenLine size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-serif font-bold text-foreground uppercase tracking-widest">Diário com o Senhor</span>
          {entries.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entrada" : "entradas"}</span>
          )}
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">O que o Senhor falou ao teu coração hoje?</p>
          <textarea
            value={journalText}
            onChange={e => setJournalText(e.target.value)}
            placeholder="Regista a Palavra que recebeste, uma oração ou o que sentiste na presença d'Ele..."
            className="w-full min-h-[90px] bg-background/50 border border-border/50 rounded-xl p-4 text-sm font-serif leading-relaxed text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all shadow-inner"
            data-testid="textarea-journal-home"
          />
          <div className="flex items-center justify-between">
            {isSaved ? (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Amém! Registado.</span>
            ) : (
              <button onClick={() => navigate("/journal")} className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="button-open-journal">
                Abrir o meu diário →
              </button>
            )}
            <button
              onClick={handleSaveJournal}
              disabled={!journalText.trim() || isSaving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-medium disabled:opacity-40"
              data-testid="button-save-journal"
            >
              {isSaving ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
