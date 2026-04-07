import { useState, useEffect, useRef } from "react";
import { useGeoPrice } from "@/hooks/useGeoPrice";
import { Search, PenLine, ChevronRight, X, Hash, Check, Share2, Trash2, Edit2, ImagePlus, Archive, ChevronDown, Eye, Crown, Share, Image as ImageIcon, Link2, Copy, ExternalLink, Loader2 } from "lucide-react";
import AudioButton from "@/components/AudioButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { shareEntry } from "@/utils/journalStorage";
import { generateShareImage, renderShareImageToCanvas, type ShareImageTheme } from "@/utils/shareImage";
import BlogReflectionEditor from "@/components/BlogReflectionEditor";
import NotebookEditor from "@/components/NotebookEditor";
import { useAuth } from "@/hooks/useAuth";
import { useJournalEntries, useCreateEntry, useUpdateEntry, useDeleteEntry } from "@/hooks/useJournal";
import { useQuery } from "@tanstack/react-query";
import type { JournalEntry } from "@shared/schema";

function JournalUpgradePopup({ limit, onClose }: { limit: number; onClose: () => void }) {
  const { price: geo } = useGeoPrice();
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/stripe/products"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/products");
      return res.json();
    },
    staleTime: 60000,
  });
  const monthlyPrice = products.find((p: any) => p.recurring?.interval === "month");
  const yearlyPrice = products.find((p: any) => p.recurring?.interval === "year");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    const price = selectedPlan === "yearly" ? yearlyPrice : monthlyPrice;
    if (!price) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId: price.price_id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    setLoading(false);
  };

  const yearlyMonthly = yearlyPrice ? (parseFloat(yearlyPrice.unit_amount) / 100 / 12).toFixed(2).replace(".", ",") : "6,66";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4 border border-border shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <Crown size={24} className="text-amber-600" />
          </div>
          <h3 className="text-lg font-serif text-foreground">Limite Mensal Atingido</h3>
          <p className="text-sm text-muted-foreground">
            Você usou todas as suas {limit} reflexões gratuitas deste mês.
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setSelectedPlan("yearly")}
            className={`w-full p-3 rounded-xl border-2 transition-all text-left relative ${
              selectedPlan === "yearly" ? "border-amber-500 bg-amber-500/5" : "border-border"
            }`}
            data-testid="plan-yearly-journal"
          >
            <div className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-green-500 text-white text-[9px] font-bold">
              MELHOR VALOR
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">{geo.yearlyFormatted}</span>
              <span className="text-xs text-muted-foreground">/ano</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{geo.yearlyMonthlyFormatted}/mês</p>
          </button>

          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
              selectedPlan === "monthly" ? "border-amber-500 bg-amber-500/5" : "border-border"
            }`}
            data-testid="plan-monthly-journal"
          >
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">{geo.monthlyFormatted}</span>
              <span className="text-xs text-muted-foreground">/mês</span>
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubscribe}
            disabled={loading || (!monthlyPrice && !yearlyPrice)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-semibold text-center active:scale-[0.98] transition-transform disabled:opacity-50"
            data-testid="button-upgrade-journal"
          >
            {loading ? "Redirecionando..." : "Assinar Premium"}
          </button>
          {geo.currency !== "BRL" && (
            <p className="text-[10px] text-muted-foreground text-center">
              Valor aproximado. A cobrança é feita em BRL pelo Stripe.
            </p>
          )}
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-muted-foreground"
            data-testid="button-close-upgrade"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function extractCleanText(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.text === "string") return parsed.text;
  } catch {}
  return raw;
}

const analyzeTextForTags = (text: string) => {
  const cleanText = extractCleanText(text);
  const lowerText = cleanText.toLowerCase();
  const foundTags = new Set<string>();

  if (lowerText.match(/\b(or[ao]|orei|orando|intercess[aã]o|súplica|pedi a deus|clamei|clama)\b/)) foundTags.add("oração");
  if (lowerText.match(/\b(grat[oa]|gratid[aã]o|bênção|bençoado|bendito|agradeço|agradecer|louvei|louvo|louvor)\b/)) foundTags.add("gratidão");
  if (lowerText.match(/\b(devocional|cap[ií]tulo|livro|jun date|365 encontros|reflexão do dia|meditei|meditar)\b/)) foundTags.add("devocional");
  if (lowerText.match(/\b(f[eé]|confio|confiança|confiei|acredito|crer|acreditar|deus|senhor|jesus|espírito)\b/)) foundTags.add("fé");
  if (lowerText.match(/\b(paz|descanso|silen[cç]io|presença|comunhão|adoração|intimidade)\b/)) foundTags.add("paz");

  return Array.from(foundTags).slice(0, 3);
};

function getEntryTitle(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.text) {
      const rawText = parsed.text;
      const firstLine = rawText.split('\n')[0].trim();
      return firstLine.length > 60 ? firstLine.substring(0, 60) + "..." : firstLine || "Reflexão sem título";
    }
  } catch {}
  const firstLine = text.split('\n')[0].trim();
  return firstLine.length > 60 ? firstLine.substring(0, 60) + "..." : firstLine || "Reflexão sem título";
}

function getEntrySummary(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.text) {
      const rawText = parsed.text;
      const lines = rawText.split('\n').filter((l: string) => l.trim());
      const summary = lines.slice(0, 3).join(' ').trim();
      return summary.length > 120 ? summary.substring(0, 120) + "..." : summary;
    }
  } catch {}
  const lines = text.split('\n').filter((l: string) => l.trim());
  const summary = lines.slice(0, 3).join(' ').trim();
  return summary.length > 120 ? summary.substring(0, 120) + "..." : summary;
}

function hasImages(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    return parsed && ((parsed.images && parsed.images.length > 0) || parsed.banner);
  } catch {}
  return false;
}

function getFirstImage(text: string): string | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.banner) return parsed.banner;
    if (parsed?.images && parsed.images.length > 0) return parsed.images[0].src;
  } catch {}
  return null;
}

const SOURCE_CATEGORIES = [
  { key: "Todas",      label: "Todas",      icon: null },
  { key: "oração",     label: "Oração",     icon: null },
  { key: "devocional", label: "Devocional", icon: null },
  { key: "gratidão",   label: "Gratidão",   icon: null },
  { key: "fé",         label: "Fé",         icon: null },
  { key: "paz",        label: "Paz",        icon: null },
  { key: "reflexão",   label: "Reflexão",   icon: null },
];

const SPIRITUAL_TAGS = ["oração", "devocional", "gratidão", "fé", "paz", "reflexão"];

function getEntrySource(entry: { tags: string[] }): string {
  for (const tag of SPIRITUAL_TAGS) {
    if (entry.tags.includes(tag)) return tag;
  }
  return "reflexão";
}

function getSourceLabel(source: string): string {
  const cat = SOURCE_CATEGORIES.find(c => c.key === source);
  return cat?.label || source;
}

function getSourceColor(source: string): string {
  switch (source) {
    case "oração":     return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    case "devocional": return "bg-primary/10 text-primary border-primary/20";
    case "gratidão":   return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "fé":         return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "paz":        return "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800";
    default:           return "bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700";
  }
}

interface LocalJournalEntry {
  id: number | string;
  date: string;
  text: string;
  tags: string[];
  mood?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  userId?: string;
  timestamp?: number;
}

function ShareLinkButton({ entryId, existingSlug }: { entryId: number; existingSlug?: string | null }) {
  const [slug, setSlug] = useState<string | null>(existingSlug || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = slug ? `${window.location.origin}/shared/${slug}` : null;

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/${entryId}/share`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.slug) setSlug(data.slug);
    } catch {}
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.share({ title: "Reflexão — 365 Encontros com Deus Pai", url: shareUrl });
    } catch {}
  };

  const handleRemoveLink = async () => {
    try {
      await fetch(`/api/journal/${entryId}/share`, { method: "DELETE", credentials: "include" });
      setSlug(null);
    } catch {}
  };

  if (!slug) {
    return (
      <Button
        size="sm"
        onClick={handleGenerateLink}
        disabled={loading}
        className="w-full bg-secondary text-secondary-foreground border border-border/50"
        data-testid="button-generate-share-link"
      >
        {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Link2 size={14} className="mr-1" />}
        Criar link público (blog)
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 bg-secondary/50 rounded-lg p-2 border border-border/30">
        <Link2 size={14} className="text-primary flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate flex-1">{shareUrl}</span>
        <button onClick={handleCopy} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Copiar" data-testid="button-copy-share-link">
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-muted-foreground" />}
        </button>
        {typeof navigator !== "undefined" && navigator.share && (
          <button onClick={handleNativeShare} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Compartilhar" data-testid="button-native-share-link">
            <ExternalLink size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>
      <button onClick={handleRemoveLink} className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors" data-testid="button-remove-share-link">
        Remover link público
      </button>
    </div>
  );
}

function ImageShareDrawer({ text, theme, onThemeChange, onClose }: { text: string; theme: ShareImageTheme; onThemeChange: (t: ShareImageTheme) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderShareImageToCanvas(canvasRef.current, { text, theme, type: "reflection" });
    }
  }, [text, theme]);

  return (
    <div className="fixed inset-x-0 top-0 bottom-[64px] sm:bottom-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border/50 rounded-t-3xl sm:rounded-3xl p-6 pt-8 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500 max-h-full overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 rounded-full">
          <X size={18} />
        </button>
        <h3 className="text-xl font-serif text-foreground mb-4">Compartilhar Reflexão</h3>
        <canvas ref={canvasRef} width={540} height={540} className="w-full aspect-square rounded-2xl border border-border/30 shadow-inner mb-6" />
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Tema da imagem</span>
          <div className="flex rounded-full border border-border overflow-hidden">
            <button onClick={() => onThemeChange("dark")} className={`px-4 py-1.5 text-xs font-medium transition-colors ${theme === "dark" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              Escuro
            </button>
            <button onClick={() => onThemeChange("light")} className={`px-4 py-1.5 text-xs font-medium transition-colors ${theme === "light" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              Claro
            </button>
          </div>
        </div>
        <Button
          onClick={() => generateShareImage({ text, theme, type: "reflection" })}
          className="w-full bg-primary text-primary-foreground rounded-xl h-14 font-medium shadow-md transition-all"
          data-testid="button-share-journal-image"
        >
          <Share className="mr-2" size={20} />
          Compartilhar Imagem
        </Button>
      </div>
    </div>
  );
}

export default function Journal() {
  const { user } = useAuth();
  const isPremium = user?.hasPremium || user?.role === "admin";
  const { data: apiEntries = [], isLoading } = useJournalEntries();
  const createEntryMut = useCreateEntry();
  const updateEntryMut = useUpdateEntry();
  const deleteEntryMut = useDeleteEntry();
  const [journalLimit, setJournalLimit] = useState<{ count: number; limit: number | null; remaining: number | null } | null>(null);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  useEffect(() => {
    if (!isPremium) {
      fetch("/api/journal/limit", { credentials: "include" })
        .then(r => r.json())
        .then(data => setJournalLimit(data))
        .catch(() => {});
    }
  }, [isPremium, apiEntries.length]);

  const [activeTag, setActiveTag] = useState("Todas");
  const [isWriting, setIsWriting] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  useEffect(() => {
    if (isWriting) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${scrollY}px`;
      return () => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
        document.body.style.top = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isWriting]);
  const [entryText, setEntryText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showBlogEditor, setShowBlogEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LocalJournalEntry | null>(null);
  const [showNotebook, setShowNotebook] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [showShare, setShowShare] = useState<string | number | null>(null);
  const [showImageShare, setShowImageShare] = useState(false);
  const [imageShareText, setImageShareText] = useState("");
  const [imageTheme, setImageTheme] = useState<ShareImageTheme>(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
  const imagePreviewRef = useRef<HTMLCanvasElement>(null);
  const [viewingEntry, setViewingEntry] = useState<LocalJournalEntry | null>(null);
  const [archivedIds, setArchivedIds] = useState<Set<number | string>>(() => {
    try {
      const stored = localStorage.getItem("365encontros-archived-entries");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [showArchived, setShowArchived] = useState(false);

  const entries: LocalJournalEntry[] = apiEntries.map(e => ({
    ...e,
    date: e.date || new Date(e.createdAt).toLocaleDateString("pt-BR"),
  }));

  useEffect(() => {
    if (entryText.length > 15) {
      const tags = analyzeTextForTags(entryText);
      setSuggestedTags(tags.filter(t => !selectedTags.includes(t)));
    } else {
      setSuggestedTags([]);
    }
  }, [entryText, selectedTags]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = async () => {
    if (!entryText.trim()) return;
    
    let finalTags = selectedTags;
    if (selectedTags.length === 0 && suggestedTags.length > 0) {
      finalTags = [suggestedTags[0]];
      setSelectedTags(finalTags);
    }

    try {
      if (isEditing) {
        await updateEntryMut.mutateAsync({ id: isEditing, text: entryText, tags: finalTags });
        setIsEditing(null);
      } else {
        await createEntryMut.mutateAsync({ text: entryText, tags: finalTags });
      }
    } catch {}

    setIsSaved(true);
    setTimeout(() => {
      setIsWriting(false);
      setEntryText("");
      setSelectedTags([]);
      setIsSaved(false);
    }, 1500);
  };

  const handleEdit = (entry: LocalJournalEntry) => {
    setViewingEntry(null);
    let textToEdit = entry.text;
    try {
      const parsed = JSON.parse(entry.text);
      if (parsed && parsed.text !== undefined) {
        setEditingEntry({
          ...entry,
          text: entry.text,
        });
        setIsEditing(entry.id as number);
        setShowBlogEditor(true);
        return;
      }
    } catch {}
    setIsEditing(entry.id as number);
    setEntryText(textToEdit);
    setSelectedTags(entry.tags);
    setIsWriting(true);
  };

  const handleDelete = async (id: number | string) => {
    if (confirm("Tem certeza que deseja deletar esta entrada?")) {
      try {
        await deleteEntryMut.mutateAsync(id as number);
        setViewingEntry(null);
      } catch {}
    }
  };

  const handleArchive = (id: number | string) => {
    setArchivedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem("365encontros-archived-entries", JSON.stringify(Array.from(next)));
      return next;
    });
    setViewingEntry(null);
  };

  const handleShare = async (entry: LocalJournalEntry, platform: string) => {
    const plainText = getEntrySummary(entry.text);
    if (platform === "native" && navigator.share) {
      try {
        await navigator.share({
          title: "365 Encontros — Diário",
          text: `"${plainText}"\n\n— 365 Encontros com Deus Pai`,
        });
        setShowShare(null);
        return;
      } catch {}
    }
    const shareData = { id: String(entry.id), date: entry.date, text: plainText, tags: entry.tags, timestamp: Date.now() };
    const url = shareEntry(shareData, platform);
    if (platform === "instagram") {
      const text = `"${plainText}"\n\n— 365 Encontros com Deus Pai (@jundate)`;
      navigator.clipboard.writeText(text);
      alert("Texto copiado! Cole no Instagram direto.");
    } else {
      window.open(url, "_blank");
    }
    setShowShare(null);
  };

  const handleOpenEntry = (entry: LocalJournalEntry) => {
    setViewingEntry(entry);
  };

  const filteredEntries = activeTag === "Todas"
    ? entries
    : entries.filter(e => getEntrySource(e) === activeTag);
  const visibleEntries = showArchived 
    ? filteredEntries.filter(e => archivedIds.has(e.id))
    : filteredEntries.filter(e => !archivedIds.has(e.id));

  const renderEntryContent = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.text !== undefined) {
        const allImages: any[] = parsed.images || [];
        const wrappedImages = allImages.filter((img: any) => img.textWrap);
        const freeImages = allImages.filter((img: any) => !img.textWrap);
        const contentMinHeight = allImages.length > 0
          ? Math.max(200, ...allImages.map((img: any) => (img.y || 0) + (img.height || 200) + 24))
          : undefined;

        return (
          <div className="space-y-5">
            {parsed.banner && (
              <img src={parsed.banner} alt="" className="w-full rounded-2xl object-cover" style={{ maxHeight: 320 }} />
            )}
            {parsed.title && (
              <h2 className="text-2xl font-serif font-semibold text-foreground leading-tight">{parsed.title}</h2>
            )}
            <div className="relative overflow-hidden" style={{ minHeight: contentMinHeight }}>
              {wrappedImages.map((img: any, i: number) => {
                const side = (img.x || 0) < 150 ? 'left' : 'right';
                return (
                  <img
                    key={`wrap-${i}`}
                    src={img.src}
                    alt=""
                    className="rounded-xl"
                    style={{
                      float: side,
                      width: `${img.width || 200}px`,
                      height: `${img.height || 200}px`,
                      objectFit: (img.fit as any) || 'cover',
                      margin: side === 'left' ? '0 16px 12px 0' : '0 0 12px 16px',
                      marginTop: `${Math.max(0, (img.y || 0))}px`,
                      transform: img.rotation ? `rotate(${img.rotation}deg)` : undefined,
                      maxWidth: '60%',
                    }}
                  />
                );
              })}
              <div className="text-foreground text-[17px] leading-relaxed font-serif whitespace-pre-wrap break-words" style={{ position: 'relative', zIndex: 1 }}>
                {parsed.text}
              </div>
              {freeImages.map((img: any, i: number) => (
                <img
                  key={`free-${i}`}
                  src={img.src}
                  alt=""
                  className="absolute rounded-xl"
                  style={{
                    left: `${img.x || 0}px`,
                    top: `${img.y || 0}px`,
                    width: `${img.width || 200}px`,
                    height: `${img.height || 200}px`,
                    objectFit: (img.fit as any) || 'cover',
                    transform: img.rotation ? `rotate(${img.rotation}deg)` : undefined,
                    zIndex: img.zIndex || 10,
                  }}
                />
              ))}
              {parsed.drawing && (
                <img src={parsed.drawing} alt="" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'fill', zIndex: 2 }} />
              )}
            </div>
          </div>
        );
      }
    } catch {}
    return (
      <div className="text-foreground text-[17px] leading-relaxed font-serif whitespace-pre-wrap break-words">
        {text}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background animate-in fade-in duration-500 pb-24 w-full overflow-x-hidden" style={{ touchAction: 'pan-y', maxWidth: '100vw' }}>
      <div className="pl-4 pr-4 md:px-10 pt-1 pb-4 space-y-4 sticky bg-background/90 backdrop-blur-xl z-20 w-full max-w-[100vw] box-border" style={{ top: "var(--safe-top, 0px)" }}>
        {!isPremium && journalLimit && journalLimit.remaining !== null && (
          <div className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${
            journalLimit.remaining <= 3
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              : "bg-muted text-muted-foreground"
          }`} data-testid="journal-limit-banner">
            <PenLine size={12} />
            {journalLimit.remaining > 0
              ? `${journalLimit.remaining} reflexão${journalLimit.remaining !== 1 ? "ões" : ""} gratuita${journalLimit.remaining !== 1 ? "s" : ""} restante${journalLimit.remaining !== 1 ? "s" : ""} este mês`
              : "Limite mensal atingido — assine o premium para continuar"}
          </div>
        )}
        <div className="flex justify-between items-center gap-2 min-w-0 pr-24 md:pr-0">
          <h1 className="text-3xl font-serif text-foreground shrink-0">Diário</h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                showArchived 
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" 
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-toggle-archived"
            >
              <Archive size={11} className="inline mr-0.5" />
              {showArchived ? "Arquivadas" : "Arquivo"}
            </button>
            <span className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
              {visibleEntries.length} {visibleEntries.length === 1 ? "entrada" : "entradas"}
            </span>
          </div>
        </div>

        {!isWriting && !viewingEntry && (
          <div className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex space-x-2 pb-1 w-max">
              {SOURCE_CATEGORIES.map(cat => {
                const count = cat.key === "Todas" ? entries.length : entries.filter(e => getEntrySource(e) === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveTag(cat.key)}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm transition-all duration-300 flex items-center gap-1.5 ${
                      activeTag === cat.key
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "bg-border/50 border border-border text-foreground/60 hover:text-foreground/80"
                    }`}
                    data-testid={`filter-${cat.key}`}
                  >
                    {cat.icon && <span className="text-xs">{cat.icon}</span>}
                    <span>{cat.label}</span>
                    <span className={`text-[10px] ${activeTag === cat.key ? "opacity-80" : "opacity-50"}`}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 md:px-10 space-y-4 w-full max-w-[100vw] box-border">
        {viewingEntry ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setViewingEntry(null)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ChevronDown size={16} className="rotate-90" /> Voltar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(viewingEntry)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Editar"
                  data-testid="button-edit-entry"
                >
                  <Edit2 size={16} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleArchive(viewingEntry.id)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title={archivedIds.has(viewingEntry.id) ? "Desarquivar" : "Arquivar"}
                  data-testid="button-archive-entry"
                >
                  <Archive size={16} className={archivedIds.has(viewingEntry.id) ? "text-amber-500" : "text-muted-foreground"} />
                </button>
                <button
                  onClick={() => setShowShare(viewingEntry.id)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Compartilhar"
                  data-testid="button-share-entry"
                >
                  <Share2 size={16} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(viewingEntry.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Deletar"
                  data-testid="button-delete-entry"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                {viewingEntry.date}
              </span>
              
              {renderEntryContent(viewingEntry.text)}

              <div className="flex flex-wrap gap-2 pt-2">
                <span className={`text-[10px] px-3 py-1.5 rounded-full border font-bold uppercase tracking-tighter ${getSourceColor(getEntrySource(viewingEntry))}`}>
                  {getSourceLabel(getEntrySource(viewingEntry))}
                </span>
                {viewingEntry.tags.filter(t => !SPIRITUAL_TAGS.includes(t)).map(tag => (
                  <span key={tag} className="text-[10px] px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground font-bold uppercase tracking-tighter max-w-[160px] truncate">
                    #{tag}
                  </span>
                ))}
              </div>

              {showShare === viewingEntry.id && (
                <div className="space-y-2 animate-in slide-in-from-bottom">
                  <ShareLinkButton entryId={viewingEntry.id as number} existingSlug={(viewingEntry as any).shareSlug} />
                  <div className="flex gap-2">
                    {typeof navigator !== "undefined" && navigator.share && (
                      <Button size="sm" onClick={() => handleShare(viewingEntry, "native")} className="flex-1 bg-foreground hover:bg-foreground/90 text-background" data-testid="button-share-native">
                        <Share2 size={14} className="mr-1" />
                        Texto
                      </Button>
                    )}
                    <Button size="sm" onClick={() => {
                      const plain = getEntrySummary(viewingEntry.text);
                      const excerpt = plain.length > 200 ? plain.slice(0, 200) + "…" : plain;
                      setImageShareText(excerpt);
                      setShowImageShare(true);
                      setShowShare(null);
                    }} className="flex-1 bg-primary text-primary-foreground" data-testid="button-share-image">
                      <ImageIcon size={14} className="mr-1" />
                      Imagem
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : isWriting && !showNotebook ? (
          null
        ) : (
          <>
          <div className="space-y-4 animate-in fade-in duration-700">
            {visibleEntries.length > 0 ? (
              visibleEntries.map(entry => {
                const title = getEntryTitle(entry.text);
                const summary = getEntrySummary(entry.text);
                const thumbnail = getFirstImage(entry.text);
                const isArchived = archivedIds.has(entry.id);
                
                return (
                  <div 
                    key={entry.id} 
                    className="group p-5 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.99]"
                    onClick={() => handleOpenEntry(entry)}
                    data-testid={`journal-entry-${entry.id}`}
                  >
                    <div className="flex gap-4">
                      {thumbnail && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted">
                          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                            {entry.date}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} className="text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleArchive(entry.id)}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                              title={isArchived ? "Desarquivar" : "Arquivar"}
                            >
                              <Archive size={14} className={isArchived ? "text-amber-500" : "text-muted-foreground"} />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Deletar"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                        
                        <h3 className="text-base font-serif text-foreground font-medium leading-snug mb-1 line-clamp-1">
                          {title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {summary}
                        </p>
                        
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className={`text-[9px] px-2 py-1 rounded-full border font-bold uppercase tracking-tighter ${getSourceColor(getEntrySource(entry))}`}>
                            {getSourceLabel(getEntrySource(entry))}
                          </span>
                          {entry.tags.filter(t => !SPIRITUAL_TAGS.includes(t)).map(tag => (
                            <span key={tag} className="text-[9px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-bold uppercase tracking-tighter max-w-[120px] truncate">
                              #{tag}
                            </span>
                          ))}
                          {hasImages(entry.text) && (
                            <span className="text-[9px] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tighter">
                              <ImagePlus size={9} className="inline mr-0.5" /> fotos
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground/50 shrink-0 mt-3" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="mt-8 p-10 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="p-4 rounded-full bg-muted">
                  <PenLine size={32} className="text-muted-foreground" />
                </div>
                <p className="font-serif text-lg text-muted-foreground italic">
                  {showArchived 
                    ? "Nenhuma reflexão arquivada ainda." 
                    : "Este é o seu espaço com Deus.\nO que está no seu coração hoje?"}
                </p>
              </div>
            )}
          </div>
          </>
        )}

      {isWriting && !showNotebook && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col overflow-hidden pt-safe" style={{ touchAction: 'none' }}
          onTouchMove={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('textarea')) e.preventDefault();
          }}
        >
          <div className="shrink-0 flex justify-between items-center px-6 pt-5 pb-4 border-b border-border/40">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              {isEditing ? "Editar" : "Nova"} Reflexão
            </h2>
            <Button 
              onClick={() => {
                setIsWriting(false);
                setIsEditing(null);
                setEntryText("");
                setSelectedTags([]);
              }}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </Button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 px-6 py-4 space-y-4">
            <div className="relative flex-1 min-h-0">
              <Textarea 
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="O que está no seu coração? Partilhe com Deus aqui..."
                className="h-full w-full bg-card/50 border-border/80 focus:border-primary/50 focus:ring-primary/20 rounded-3xl p-6 pr-12 text-lg font-serif leading-relaxed resize-none shadow-inner"
                style={{ touchAction: 'pan-y' }}
                autoFocus
              />
              <div className="absolute top-4 right-4">
                <AudioButton 
                  onText={(text) => setEntryText(prev => prev ? prev.trimEnd() + " " + text : text)}
                  size={20}
                />
              </div>
              {isSaved && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-3xl z-10 animate-in fade-in">
                  <div className="bg-primary text-primary-foreground p-4 rounded-full shadow-xl scale-110">
                    <Check size={32} />
                  </div>
                </div>
              )}
            </div>

            {(suggestedTags.length > 0 || selectedTags.length > 0) && (
              <div className="shrink-0 space-y-2 overflow-hidden">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Hash size={12} /> Temas Identificados
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-2 transition-all max-w-full"
                    >
                      <span className="truncate">{tag}</span> <X size={12} className="opacity-70 shrink-0" />
                    </button>
                  ))}
                  {suggestedTags.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="text-xs px-4 py-2 rounded-full bg-secondary text-secondary-foreground border border-dashed border-primary/30 font-medium hover:bg-primary/10 transition-all animate-in zoom-in max-w-full"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-border/40 bg-background">
            <Button 
              onClick={() => {
                if (entryText.trim()) {
                  setEditingEntry({ 
                    id: isEditing || 0, 
                    text: entryText, 
                    tags: selectedTags, 
                    date: "", 
                    timestamp: Date.now() 
                  });
                } else {
                  setEditingEntry({ 
                    id: 0, 
                    text: "", 
                    tags: [], 
                    date: "", 
                    timestamp: Date.now() 
                  });
                }
                setIsWriting(false);
                setShowBlogEditor(true);
              }}
              className="flex-1 bg-primary text-primary-foreground rounded-full h-14 font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
            >
              Abrir Editor Completo
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!entryText.trim() || isSaved}
              variant="outline"
              className="rounded-full h-14 px-6 font-medium"
            >
              {isSaved ? "Guardado!" : "Salvar Rápido"}
            </Button>
          </div>
        </div>
      )}

      {showNotebook && (
        <NotebookEditor
          initialContent={entryText}
          onClose={() => setShowNotebook(false)}
          onSave={(content) => {
            setEntryText(content);
            setShowNotebook(false);
          }}
        />
      )}

      {showBlogEditor && editingEntry && (
        <BlogReflectionEditor
          initialTitle={getEntryTitle(editingEntry.text)}
          initialText={(() => {
            try {
              const parsed = JSON.parse(editingEntry.text);
              if (parsed && parsed.text !== undefined) return parsed.text;
            } catch {}
            return editingEntry.text;
          })()}
          initialImages={(() => {
            try {
              const parsed = JSON.parse(editingEntry.text);
              if (parsed && parsed.images) return parsed.images;
            } catch {}
            return undefined;
          })()}
          initialBanner={(() => {
            try {
              const parsed = JSON.parse(editingEntry.text);
              if (parsed && parsed.banner) return parsed.banner;
            } catch {}
            return undefined;
          })()}
          initialDrawing={(() => {
            try {
              const parsed = JSON.parse(editingEntry.text);
              if (parsed && parsed.drawing) return parsed.drawing;
            } catch {}
            return undefined;
          })()}
          topic={editingEntry.text}
          showTitleEdit={true}
          origin="Do Diário"
          onClose={() => {
            setShowBlogEditor(false);
            setEditingEntry(null);
          }}
          onSave={async (title, content, tags) => {
            const finalTags = tags.length > 0 ? tags : editingEntry.tags;
            if (isEditing) {
              await updateEntryMut.mutateAsync({ id: isEditing, text: content, tags: finalTags });
            } else {
              await createEntryMut.mutateAsync({ text: content, tags: finalTags });
            }
            setIsWriting(false);
            setEntryText("");
            setSelectedTags([]);
            setIsEditing(null);
            setShowBlogEditor(false);
            setEditingEntry(null);
          }}
        />
      )}

      {showUpgradePopup && (
        <JournalUpgradePopup
          limit={journalLimit?.limit || 15}
          onClose={() => setShowUpgradePopup(false)}
        />
      )}

      {!isWriting && !viewingEntry && (
        <div className="fixed bottom-24 right-6 z-40 animate-in zoom-in slide-in-from-bottom-4 duration-500">
          <Button 
            onClick={() => {
              if (!isPremium && journalLimit && journalLimit.remaining !== null && journalLimit.remaining <= 0) {
                setShowUpgradePopup(true);
                return;
              }
              setIsWriting(true);
            }}
            size="icon" 
            className="rounded-full bg-primary text-primary-foreground w-14 h-14 shadow-2xl hover:shadow-primary/20 active:scale-95 transition-all border-4 border-background"
          >
            <PenLine size={24} />
          </Button>
        </div>
      )}

      {showImageShare && (
        <ImageShareDrawer
          text={imageShareText}
          theme={imageTheme}
          onThemeChange={setImageTheme}
          onClose={() => setShowImageShare(false)}
        />
      )}
      </div>
    </div>
  );
}
