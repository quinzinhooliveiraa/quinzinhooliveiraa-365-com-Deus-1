import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, ArrowLeft, TrendingUp, Calendar, Sparkles } from "lucide-react";
import { format, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Moods (em sync com Home.tsx) ─── */
const CHECK_IN_MOODS = [
  { id: "grato",       label: "Grato",       emoji: "🙏", color: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
  { id: "alegre",      label: "Alegre",      emoji: "✨", color: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700" },
  { id: "em_paz",      label: "Em paz",      emoji: "🕊️", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700" },
  { id: "esperancoso", label: "Esperançoso", emoji: "🌱", color: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700" },
  { id: "ansioso",     label: "Ansioso",     emoji: "🌊", color: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700" },
  { id: "triste",      label: "Triste",      emoji: "🤍", color: "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600" },
  { id: "cansado",     label: "Cansado",     emoji: "🌙", color: "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700" },
  { id: "buscando",    label: "À procura",   emoji: "🔍", color: "bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700" },
];

type MoodCheckin = { id: number; mood: string; entry: string | null; createdAt: string; date: string; };

const MONTH_NAMES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default function CheckinReport() {
  const [, navigate] = useLocation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12, hora local do utilizador

  const { data: checkins = [], status } = useQuery<MoodCheckin[]>({
    queryKey: ["/api/checkins/month", year, month],
    queryFn: async () => {
      const r = await fetch(`/api/checkins/month?year=${year}&month=${month}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 0,
  });

  /* navegação de mês */
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  /* agrupa por dia usando o campo date do servidor (evita problemas de fuso horário) */
  const byDay = useMemo(() => {
    const map: Record<string, MoodCheckin[]> = {};
    checkins.forEach(c => {
      const day = c.date || new Date(c.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
      if (!map[day]) map[day] = [];
      map[day].push(c);
    });
    return map;
  }, [checkins]);

  const dayKeys = Object.keys(byDay).sort((a, b) => {
    const [da, ma, ya] = a.split("/").map(Number);
    const [db, mb, yb] = b.split("/").map(Number);
    return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
  });

  /* estatísticas */
  const stats = useMemo(() => {
    if (!checkins.length) return null;
    const freq: Record<string, number> = {};
    checkins.forEach(c => { freq[c.mood] = (freq[c.mood] || 0) + 1; });
    const topMoodId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    const topMood = CHECK_IN_MOODS.find(m => m.id === topMoodId);
    const activeDays = dayKeys.length;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    return { total: checkins.length, topMood, topMoodCount: freq[topMoodId], activeDays, daysInMonth };
  }, [checkins, dayKeys, year, month]);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky z-20 bg-background border-b border-border/60 px-4 py-3 flex items-center gap-3" style={{ top: "var(--safe-top, 0px)" }}>
        <button onClick={() => navigate("/")} className="p-1.5 rounded-xl hover-elevate" data-testid="button-back-report">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-serif font-bold text-foreground">Relatório do Coração</h1>
          <p className="text-[10px] text-muted-foreground">Os teus momentos com Deus Pai</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Navegação de mês */}
        <div className="flex items-center justify-between bg-card/80 border border-border/60 rounded-xl px-4 py-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover-elevate" data-testid="button-prev-month">
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{MONTH_NAMES_PT[month - 1]}</p>
            <p className="text-xs text-muted-foreground">{year}</p>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover-elevate disabled:opacity-30"
            data-testid="button-next-month"
          >
            <ChevronRight size={18} className="text-foreground" />
          </button>
        </div>

        {/* Estatísticas do mês */}
        {status !== "pending" && stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card/80 border border-border/60 rounded-xl p-3 text-center" data-testid="stat-total">
              <TrendingUp size={14} className="text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">check-ins</p>
            </div>
            <div className="bg-card/80 border border-border/60 rounded-xl p-3 text-center" data-testid="stat-days">
              <Calendar size={14} className="text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{stats.activeDays}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">dias ativos</p>
            </div>
            <div className="bg-card/80 border border-border/60 rounded-xl p-3 text-center" data-testid="stat-top-mood">
              <Sparkles size={14} className="text-primary mx-auto mb-1" />
              <p className="text-xl leading-none mb-0.5">{stats.topMood?.emoji ?? "—"}</p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">{stats.topMood?.label ?? "—"}</p>
            </div>
          </div>
        )}

        {/* Mini calendário — presença visual */}
        {status !== "pending" && checkins.length > 0 && (
          <div className="bg-card/80 border border-border/60 rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Presença no mês</p>
            <MiniCalendar year={year} month={month} byDay={byDay} today={now} />
          </div>
        )}

        {/* Lista por dia */}
        {status === "pending" ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card/80 border border-border/60 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-muted rounded w-1/3 mb-3" />
                <div className="space-y-2">
                  <div className="h-10 bg-muted rounded-xl" />
                  <div className="h-10 bg-muted rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : dayKeys.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">🤍</p>
            <p className="text-base font-serif text-foreground">Nenhum momento registado</p>
            <p className="text-sm text-muted-foreground">Ainda não fizeste check-in neste mês.<br/>Cada momento com Deus conta.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
              data-testid="button-go-checkin"
            >
              Fazer check-in agora
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {dayKeys.map(dayKey => {
              const dayCheckins = byDay[dayKey];
              const [d, m2, y2] = dayKey.split("/").map(Number);
              const dateObj = new Date(y2, m2 - 1, d);
              const isToday = dateObj.toDateString() === now.toDateString();
              const weekday = format(dateObj, "EEEE", { locale: ptBR });
              const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);

              return (
                <div key={dayKey} className="bg-card/80 border border-border/60 rounded-xl overflow-hidden" data-testid={`day-block-${dayKey}`}>
                  {/* Cabeçalho do dia */}
                  <div className="px-4 py-3 border-b border-border/40 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex flex-col items-center justify-center shrink-0 ${isToday ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <span className="text-sm font-bold leading-none">{d}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{weekdayCap}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dayCheckins.length} {dayCheckins.length === 1 ? "momento" : "momentos"} com Deus
                      </p>
                    </div>
                    {isToday && (
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        hoje
                      </span>
                    )}
                  </div>

                  {/* Linha do tempo do dia */}
                  <div className="px-4 py-3 space-y-0">
                    {[...dayCheckins].reverse().map((c, idx) => {
                      const mObj = CHECK_IN_MOODS.find(m => m.id === c.mood);
                      const time = new Date(c.createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
                      const isLast = idx === dayCheckins.length - 1;
                      return (
                        <div key={c.id} className="flex gap-3" data-testid={`checkin-entry-${c.id}`}>
                          {/* timeline */}
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary/70 shrink-0 mt-2.5" />
                            {!isLast && <div className="w-px flex-1 bg-border/60 mt-1 mb-1" />}
                          </div>
                          <div className={`flex flex-col gap-1.5 flex-1 min-w-0 ${!isLast ? "pb-3" : "pb-1"}`}>
                            <div className="flex items-center gap-3">
                              <span className={`text-lg leading-none shrink-0 w-8 h-8 flex items-center justify-center rounded-full border ${mObj?.color ?? "bg-muted border-border"}`}>
                                {mObj?.emoji ?? "•"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{mObj?.label ?? c.mood}</p>
                                <p className="text-[11px] text-muted-foreground">{time}</p>
                              </div>
                            </div>
                            {c.entry && c.entry.trim() && (
                              <div className="ml-11 rounded-xl bg-muted/60 border border-border/50 px-3 py-2.5">
                                <p className="text-xs text-muted-foreground font-medium mb-1">O que escrevi</p>
                                <p className="text-sm font-serif leading-relaxed text-foreground italic">"{c.entry}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Mini calendário de presença ── */
function MiniCalendar({ year, month, byDay, today }: {
  year: number; month: number;
  byDay: Record<string, MoodCheckin[]>; today: Date;
}) {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Dom
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-first

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const hasDayCheckin = (d: number) => {
    const key = `${String(d).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
    return !!byDay[key];
  };
  const countDayCheckins = (d: number) => {
    const key = `${String(d).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
    return byDay[key]?.length ?? 0;
  };

  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === d;

  return (
    <div>
      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d => (
          <p key={d} className="text-[9px] text-muted-foreground text-center font-semibold uppercase tracking-wide">{d}</p>
        ))}
      </div>
      {/* Células */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const checked = hasDayCheckin(d);
          const count = countDayCheckins(d);
          const todayCell = isToday(d);
          return (
            <div
              key={i}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-medium transition-all ${
                todayCell
                  ? "bg-primary text-primary-foreground font-bold"
                  : checked
                    ? "bg-primary/20 text-primary dark:bg-primary/30"
                    : "text-foreground/40"
              }`}
              data-testid={`cal-day-${d}`}
            >
              <span>{d}</span>
              {checked && !todayCell && count > 1 && (
                <span className="text-[7px] leading-none opacity-70">{count}×</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
