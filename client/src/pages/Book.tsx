import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Bookmark, LockKeyhole, BookOpen, X, ChevronLeft, ChevronRight,
  ShoppingBag, ExternalLink, Instagram, CheckCircle2, List, BookMarked, AlignLeft,
  Highlighter, Trash2, Star, ImageDown, Search, Lightbulb, Library, Crown, Play
} from "lucide-react";
import bookCover from "@/assets/images/book-cover-oficial.png";
import authorImg from "../assets/author.webp";
import BookPurchaseModal from "@/components/BookPurchaseModal";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

type Chapter = {
  id: number;
  order: number;
  title: string;
  tag: string | null;
  excerpt: string | null;
  isPreview: boolean;
  pageType: string;
  pdfPage: number | null;
  imageUrl: string | null;
};

/**
 * Converts raw PDF-imported text into clean paragraphs.
 * Handles two formats:
 *  1. Paragraphs separated by \n\n (some chapters)
 *  2. Only single \n line-wraps, paragraphs detected by sentence-end + capital-start
 */
function splitByFrases(text: string): string[] {
  // Split a continuous string into readable paragraphs.
  // A paragraph break occurs when a sentence ends with . ! ? and the next
  // sentence starts with an uppercase letter, provided the current chunk is
  // long enough (≥ 60 chars) to avoid splitting very short items.
  const result: string[] = [];
  let buf = "";
  let i = 0;
  while (i < text.length) {
    buf += text[i];
    if (/[.!?]/.test(text[i]) && i + 1 < text.length) {
      let j = i + 1;
      while (j < text.length && text[j] === " ") j++;
      const nextChar = text[j];
      if (nextChar && /[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ"—]/.test(nextChar) && buf.trim().length >= 60) {
        result.push(buf.trim());
        buf = "";
        i = j;
        continue;
      }
    }
    i++;
  }
  if (buf.trim()) result.push(buf.trim());
  return result.filter(p => p.length > 0);
}

function processContent(raw: string): string[] {
  if (!raw.trim()) return [];

  if (raw.includes("\n\n")) {
    // Format 1: explicit paragraph breaks
    return raw
      .split(/\n\n+/)
      .map(block => {
        const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        // Preserve bullet lists as \n-separated items
        if (lines.length > 0 && lines.every(l => l.startsWith("- "))) return lines.join("\n");
        return lines.join(" ");
      })
      .filter(p => p.trim().length > 0);
  }

  if (!raw.includes("\n")) {
    // Format 3: single long string (PDF extracted without newlines) — split by sentences
    return splitByFrases(raw);
  }

  // Format 2: only single \n — join PDF-wrapped lines into paragraphs
  // Check sentence boundaries BEFORE joining to avoid merging paragraphs
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const paragraphs: string[] = [];
  let current = "";

  for (const line of lines) {
    if (!current) {
      current = line;
      continue;
    }
    // If the accumulated text ends a sentence AND new line starts a new one → paragraph break
    const prevEndsPhrase = /[.!?]["»"']?$/.test(current.trimEnd());
    const currStartsCap  = /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ""—]/.test(line.trimStart());
    if (prevEndsPhrase && currStartsCap) {
      paragraphs.push(current.trim());
      current = line;
    } else {
      current = current + " " + line;
    }
  }

  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs.filter(p => p.length > 0);
}

function parseChapterSections(paras: string[]): {
  body: string[];
  dica: { instruction: string; quote: string } | null;
  oracao: string[];
} {
  const dicaIdx = paras.findIndex(p => /\bdica do dia\b/i.test(p));
  const oracaoIdx = paras.findIndex(p => /momento de ora/i.test(p));
  const bodyEnd = dicaIdx >= 0 ? dicaIdx : (oracaoIdx >= 0 ? oracaoIdx : paras.length);
  const body = paras.slice(0, bodyEnd);

  let dica: { instruction: string; quote: string } | null = null;
  if (dicaIdx >= 0) {
    const end = oracaoIdx >= 0 ? oracaoIdx : paras.length;
    const dicaText = paras.slice(dicaIdx, end).join(" ");
    const quoteMatch = dicaText.match(/[""«]([^""»]+)[""»]/);
    let instruction = dicaText
      .replace(/\bdica do dia\b/gi, "")
      .replace(/diga em sil[eê]ncio[:\s]*/gi, "")
      .replace(/[""«][^""»]+[""»]/g, "")
      .trim();
    const quote = quoteMatch?.[1]?.trim() || "";
    if (quote || instruction) dica = { instruction, quote };
  }

  const oracaoRaw = oracaoIdx >= 0 ? paras.slice(oracaoIdx) : [];
  const oracao = oracaoRaw
    .map(p => p.replace(/^momento de ora[çc][aã]o\s*/gi, "").trim())
    .filter(p => p.length > 0);

  return { body, dica, oracao };
}

type LibPageBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "para"; text: string; idx: number }
  | { type: "bullet"; items: string[]; startIdx: number }
  | { type: "dica"; instruction: string; quote: string }
  | { type: "oracao"; lines: string[] };

function parseLibPageContent(paras: string[]): LibPageBlock[] {
  const blocks: LibPageBlock[] = [];
  let paraIdx = 0;

  // Detect Dica/Oração using same logic
  const dicaIdx = paras.findIndex(p => /\bdica do dia\b/i.test(p));
  const oracaoIdx = paras.findIndex(p => /momento de ora/i.test(p));

  const i_dica = dicaIdx >= 0 ? dicaIdx : paras.length;
  const i_oracao = oracaoIdx >= 0 ? oracaoIdx : paras.length;
  const bodyEnd = Math.min(i_dica, i_oracao);
  const bodyParas = paras.slice(0, bodyEnd);

  for (let i = 0; i < bodyParas.length; i++) {
    const p = bodyParas[i];

    // Markdown headings
    if (p.startsWith("### ")) {
      blocks.push({ type: "h3", text: p.slice(4).trim() });
      continue;
    }
    if (p.startsWith("## ")) {
      blocks.push({ type: "h2", text: p.slice(3).trim() });
      continue;
    }
    if (p.startsWith("# ")) {
      blocks.push({ type: "h1", text: p.slice(2).trim() });
      continue;
    }

    // Title detection: first paragraph, short, no period at end, all-caps or title-case
    const isFirst = i === 0;
    const isShort = p.length <= 80;
    const noFinalPunct = !/[.!?]$/.test(p.trim());
    const isAllCaps = p === p.toUpperCase() && /[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/.test(p);
    const isTitle = isFirst && isShort && noFinalPunct && (isAllCaps || p.length <= 50);

    if (isTitle) {
      blocks.push({ type: "h1", text: p.trim() });
      continue;
    }

    // Subtitle: short + all caps + not first
    if (!isFirst && isShort && noFinalPunct && isAllCaps && p.length >= 3) {
      blocks.push({ type: "h2", text: p.trim() });
      continue;
    }

    // Bullet list paragraph
    if (p.includes("\n") && p.split("\n").every(l => l.trimStart().startsWith("- "))) {
      const startIdx = paraIdx;
      const items = p.split("\n").map(l => l.replace(/^-\s+/, "").trim()).filter(l => l.length > 0);
      blocks.push({ type: "bullet", items, startIdx });
      paraIdx += items.length;
      continue;
    }

    blocks.push({ type: "para", text: p, idx: paraIdx++ });
  }

  // Dica section
  if (dicaIdx >= 0) {
    const end = oracaoIdx >= 0 ? oracaoIdx : paras.length;
    const dicaText = paras.slice(dicaIdx, end).join(" ");
    const quoteMatch = dicaText.match(/[""«]([^""»]+)[""»]/);
    const instruction = dicaText
      .replace(/\bdica do dia\b/gi, "")
      .replace(/diga em sil[eê]ncio[:\s]*/gi, "")
      .replace(/[""«][^""»]+[""»]/g, "")
      .trim();
    const quote = quoteMatch?.[1]?.trim() || "";
    if (quote || instruction) blocks.push({ type: "dica", instruction, quote });
  }

  // Oração section
  if (oracaoIdx >= 0) {
    const lines = paras.slice(oracaoIdx)
      .map(p => p.replace(/^momento de ora[çc][aã]o\s*/gi, "").trim())
      .filter(p => p.length > 0);
    if (lines.length > 0) blocks.push({ type: "oracao", lines });
  }

  return blocks;
}

function chapterDate(order: number): { day: number; month: string } {
  const d = new Date(2025, 0, order);
  const month = d.toLocaleString("pt-BR", { month: "short" }).toUpperCase().replace(".", "");
  return { day: d.getDate(), month };
}

function getMonthFullName(order: number): string {
  const d = new Date(2025, 0, order);
  return d.toLocaleString("pt-BR", { month: "long" });
}

/** Returns the month name if chapter[idx] is the first chapter of a new calendar month (compared to chapter[idx-1]). */
function chapterStartsNewMonth(chapters: Chapter[], idx: number): string | null {
  if (idx === 0) return null;
  const prev = chapters[idx - 1];
  const curr = chapters[idx];
  if (!prev || !curr) return null;
  if (prev.pageType !== "chapter" && prev.pageType !== "chapter") return null;
  if (curr.pageType !== "chapter") return null;
  const prevM = new Date(2025, 0, prev.order).getMonth();
  const currM = new Date(2025, 0, curr.order).getMonth();
  if (prevM === currM) return null;
  return getMonthFullName(curr.order);
}

function MonthSeparatorPage({ monthName, animClass }: { monthName: string; animClass: string }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center select-none ${animClass}`}
      style={{ background: "var(--bk-bg)" }}
    >
      <div className="flex flex-col items-center gap-5 px-8 text-center">
        <div className="h-px w-24 opacity-25" style={{ background: "var(--bk-accent)" }} />
        <p className="text-[9px] uppercase tracking-[0.32em] font-semibold opacity-50" style={{ color: "var(--bk-accent)" }}>
          365 Encontros com Deus Pai
        </p>
        <h1
          className="bk-serif font-black bk-ink leading-none"
          style={{ fontSize: "clamp(2.2rem, 10vw, 3.5rem)", letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          {monthName}
        </h1>
        <div className="h-px w-24 opacity-25" style={{ background: "var(--bk-accent)" }} />
      </div>
    </div>
  );
}

type BookHighlight = {
  id: number;
  userId: string;
  chapterId: number;
  subPage: number;
  paraIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  createdAt: string;
};

type PendingHL = {
  paraIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  rect: DOMRect;
};

const HL_COLORS = {
  yellow:  { bg: "rgba(255,236,90,0.55)",   dark: "rgba(255,236,90,0.3)",   label: "Amarelo" },
  green:   { bg: "rgba(120,210,130,0.55)",  dark: "rgba(120,210,130,0.3)",  label: "Verde" },
  pink:    { bg: "rgba(255,160,180,0.55)",  dark: "rgba(255,160,180,0.3)",  label: "Rosa" },
  blue:    { bg: "rgba(100,190,240,0.55)",  dark: "rgba(100,190,240,0.3)",  label: "Azul" },
  orange:  { bg: "rgba(255,180,80,0.55)",   dark: "rgba(255,180,80,0.3)",   label: "Laranja" },
  purple:  { bg: "rgba(190,130,240,0.55)",  dark: "rgba(190,130,240,0.3)",  label: "Roxo" },
  teal:    { bg: "rgba(80,210,200,0.55)",   dark: "rgba(80,210,200,0.3)",   label: "Ciano" },
  red:     { bg: "rgba(255,110,110,0.55)",  dark: "rgba(255,110,110,0.3)",  label: "Vermelho" },
} as const;

type HLColor = keyof typeof HL_COLORS;

type PurchaseStatus = {
  purchased: boolean;
  purchasedAt: string | null;
  pricesCents: number;
};

function formatPrice(cents: number) {
  return `R$\u00a0${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/* ─────────────────────────────────────────────────────────────────
   BOOK STYLES (injected once)
───────────────────────────────────────────────────────────────── */
const BOOK_STYLES = `
  :root {
    --bk-bg: #fafaf8;
    --bk-ink: #111111;
    --bk-muted: #666666;
    --bk-sep: #e0e0dc;
    --bk-accent: #2d6118;
    --bk-accent-light: rgba(45,97,24,0.10);
    --bk-page: #f5f5f2;
  }
  .dark {
    --bk-bg: #111111;
    --bk-ink: #f0f0f0;
    --bk-muted: #888888;
    --bk-sep: #2a2a2a;
    --bk-accent: #7dc955;
    --bk-accent-light: rgba(125,201,85,0.13);
    --bk-page: #0e0e0e;
  }
  .bk-bg    { background: var(--bk-bg) !important; }
  .bk-ink   { color: var(--bk-ink); }
  .bk-muted { color: var(--bk-muted); }
  .bk-sep   { border-color: var(--bk-sep); }
  .bk-accent{ color: var(--bk-accent); }
  .bk-serif { font-family: 'Georgia', 'Times New Roman', serif; }
  /* ── Page curl – outgoing clips away diagonally ── */
  .pg-exit-left {
    animation: pgCurlExL 0.50s cubic-bezier(0.42, 0, 0.68, 1) both;
  }
  .pg-exit-right {
    animation: pgCurlExR 0.50s cubic-bezier(0.42, 0, 0.68, 1) both;
  }
  @keyframes pgCurlExL {
    0%   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
    100% { clip-path: polygon(0 0, 3%  6%, 2% 94%, 0 100%); }
  }
  @keyframes pgCurlExR {
    0%   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
    100% { clip-path: polygon(98% 6%, 100% 0, 100% 100%, 97% 94%); }
  }

  /* ── Fold edge highlight (back-of-page bright strip) ── */
  .pg-fold-hl-l {
    animation: pgFoldHlL 0.50s cubic-bezier(0.42, 0, 0.68, 1) both;
  }
  .pg-fold-hl-r {
    animation: pgFoldHlR 0.50s cubic-bezier(0.42, 0, 0.68, 1) both;
  }
  @keyframes pgFoldHlL {
    0%   { background: linear-gradient(96deg, transparent 97%, rgba(255,255,255,0.0) 100%); }
    35%  { background: linear-gradient(96deg, transparent 62%, rgba(255,255,255,0.92) 65%, rgba(210,210,210,0.75) 69%, transparent 76%); }
    70%  { background: linear-gradient(96deg, transparent 22%, rgba(255,255,255,0.92) 25%, rgba(210,210,210,0.72) 29%, transparent 36%); }
    100% { background: linear-gradient(96deg, transparent 1%,  rgba(255,255,255,0.92) 3%,  rgba(210,210,210,0.7)  6%,  transparent 10%); }
  }
  @keyframes pgFoldHlR {
    0%   { background: linear-gradient(84deg, rgba(255,255,255,0.0) 0%, transparent 3%); }
    35%  { background: linear-gradient(84deg, transparent 24%, rgba(210,210,210,0.75) 31%, rgba(255,255,255,0.92) 35%, transparent 38%); }
    70%  { background: linear-gradient(84deg, transparent 64%, rgba(210,210,210,0.72) 71%, rgba(255,255,255,0.92) 75%, transparent 78%); }
    100% { background: linear-gradient(84deg, transparent 90%, rgba(210,210,210,0.7)  94%, rgba(255,255,255,0.92) 97%, transparent 100%); }
  }

  /* ── Shadow cast on the page being revealed ── */
  .pg-curl-shadow-l {
    animation: pgCurlShadL 0.50s cubic-bezier(0.42, 0, 0.68, 1) both;
  }
  .pg-curl-shadow-r {
    animation: pgCurlShadR 0.50s cubic-bezier(0.42, 0, 0.68, 1) both;
  }
  @keyframes pgCurlShadL {
    0%   { background: linear-gradient(to left, rgba(0,0,0,0.28) 0%, transparent 18%); }
    60%  { background: linear-gradient(to left, rgba(0,0,0,0.20) 38%, transparent 58%); }
    100% { background: none; opacity: 0; }
  }
  @keyframes pgCurlShadR {
    0%   { background: linear-gradient(to right, rgba(0,0,0,0.28) 0%, transparent 18%); }
    60%  { background: linear-gradient(to right, rgba(0,0,0,0.20) 38%, transparent 58%); }
    100% { background: none; opacity: 0; }
  }

  /* ── Incoming page – subtle brightness reveal ── */
  .pg-enter-right, .pg-enter-left {
    animation: pgReveal 0.50s ease both;
  }
  @keyframes pgReveal {
    0%   { filter: brightness(0.82); }
    100% { filter: brightness(1); }
  }
  .bk-hl-yellow  { background: rgba(255,236,90,0.55);  border-radius: 2px; cursor: pointer; }
  .bk-hl-green   { background: rgba(120,210,130,0.55); border-radius: 2px; cursor: pointer; }
  .bk-hl-pink    { background: rgba(255,160,180,0.55); border-radius: 2px; cursor: pointer; }
  .bk-hl-blue    { background: rgba(100,190,240,0.55); border-radius: 2px; cursor: pointer; }
  .bk-hl-orange  { background: rgba(255,180,80,0.55);  border-radius: 2px; cursor: pointer; }
  .bk-hl-purple  { background: rgba(190,130,240,0.55); border-radius: 2px; cursor: pointer; }
  .bk-hl-teal    { background: rgba(80,210,200,0.55);  border-radius: 2px; cursor: pointer; }
  .bk-hl-red     { background: rgba(255,110,110,0.55); border-radius: 2px; cursor: pointer; }
  .dark .bk-hl-yellow { background: rgba(255,236,90,0.28); }
  .dark .bk-hl-green  { background: rgba(120,210,130,0.28); }
  .dark .bk-hl-pink   { background: rgba(255,160,180,0.28); }
  .dark .bk-hl-blue   { background: rgba(100,190,240,0.28); }
  .dark .bk-hl-orange { background: rgba(255,180,80,0.28); }
  .dark .bk-hl-purple { background: rgba(190,130,240,0.28); }
  .dark .bk-hl-teal   { background: rgba(80,210,200,0.28); }
  .dark .bk-hl-red    { background: rgba(255,110,110,0.28); }
  .bk-hl-yellow:active,.bk-hl-green:active,.bk-hl-pink:active,.bk-hl-blue:active,
  .bk-hl-orange:active,.bk-hl-purple:active,.bk-hl-teal:active,.bk-hl-red:active { opacity:0.7; }
`;

/* ─────────────────────────────────────────────────────────────────
   TOC PAGE  (virtual – no fetch needed)
───────────────────────────────────────────────────────────────── */
function TocPage({ chapters, purchased, onSelect, onBuy }: {
  chapters: Chapter[];
  purchased: boolean;
  onSelect: (idx: number) => void;
  onBuy: () => void;
}) {
  const realChapters = chapters.filter(c => c.pageType === "chapter");
  const frontMatter = chapters.filter(c => c.pageType === "front-matter");
  const epilogues = chapters.filter(c => c.pageType === "epilogue");

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28 bk-bg">
      {/* Ornament */}
      <div className="flex items-center justify-center gap-2 py-10">
        <div className="h-px w-12 opacity-40" style={{ background: "var(--bk-accent)" }} />
        <span className="text-[10px] uppercase tracking-[0.25em] font-semibold bk-accent">Índice</span>
        <div className="h-px w-12 opacity-40" style={{ background: "var(--bk-accent)" }} />
      </div>

      {/* Front matter */}
      {frontMatter.length > 0 && (
        <div className="mb-6">
          {frontMatter.map((ch) => {
            const idx = chapters.findIndex(c => c.id === ch.id);
            return (
              <button key={ch.id} onClick={() => onSelect(idx)}
                className="w-full flex items-baseline justify-between py-2.5 border-b bk-sep group active:opacity-60">
                <span className="bk-serif text-sm italic bk-ink group-hover:bk-accent">{ch.title}</span>
                <span className="text-[10px] font-mono bk-muted ml-2">—</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Chapters */}
      <div>
        {realChapters.map((ch) => {
          const idx = chapters.findIndex(c => c.id === ch.id);
          const locked = !purchased && !ch.isPreview;
          return (
            <button key={ch.id}
              onClick={() => locked ? onBuy() : onSelect(idx)}
              className="w-full flex items-baseline justify-between py-2 border-b bk-sep group active:opacity-60">
              <div className="flex items-baseline gap-3 flex-1 min-w-0">
                <span className="text-[10px] font-mono bk-muted w-5 text-right shrink-0">{ch.order}</span>
                <span className={`bk-serif text-[13px] text-left leading-snug ${locked ? "opacity-40" : "bk-ink"}`}>
                  {ch.title.length > 55 ? ch.title.substring(0, 55) + "…" : ch.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                {ch.pdfPage && <span className="text-[9px] font-mono bk-muted">{ch.pdfPage}</span>}
                {locked && <LockKeyhole size={10} className="bk-muted" />}
                {ch.isPreview && !locked && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "var(--bk-accent-light)", color: "var(--bk-accent)" }}>Grátis</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Epilogue */}
      {epilogues.length > 0 && (
        <div className="mt-6">
          {epilogues.map((ch) => {
            const idx = chapters.findIndex(c => c.id === ch.id);
            return (
              <button key={ch.id} onClick={() => onSelect(idx)}
                className="w-full flex items-baseline justify-between py-2.5 border-b bk-sep group active:opacity-60">
                <span className="bk-serif text-sm italic bk-ink group-hover:bk-accent">{ch.title}</span>
                <span className="text-[10px] font-mono bk-muted ml-2">—</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CHAPTER PAGE  (fetches content + highlights)
───────────────────────────────────────────────────────────────── */
function ChapterPage({ chapter, purchased, onBuy, animClass, subPage, onActualSubPageCount, allChapters, onGoToChapter, highlights, onSaveHighlight, onDeleteHighlight }: {
  chapter: Chapter;
  purchased: boolean;
  onBuy: () => void;
  animClass: string;
  subPage: number;
  onActualSubPageCount: (n: number) => void;
  allChapters?: Chapter[];
  onGoToChapter?: (idx: number) => void;
  highlights: BookHighlight[];
  onSaveHighlight: (data: { chapterId: number; subPage: number; paraIndex: number; startOffset: number; endOffset: number; text: string; color: HLColor }) => void;
  onDeleteHighlight: (id: number) => void;
}) {
  const canRead = purchased || chapter.isPreview;
  const isFrontMatter = chapter.pageType === "front-matter" || chapter.pageType === "epilogue";
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingHL, setPendingHL] = useState<PendingHL | null>(null);
  const [activeHLId, setActiveHLId] = useState<number | null>(null);
  const [activeHLPos, setActiveHLPos] = useState<{ x: number; y: number } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<{ content: string }>({
    queryKey: ["/api/book/chapters", chapter.id, "content"],
    queryFn: async () => {
      const r = await fetch(`/api/book/chapters/${chapter.id}/content`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    enabled: canRead,
    retry: 2,
  });

  const rawContent = (data as any)?.content ?? "";
  const pdfPages: string[] = rawContent
    ? rawContent.split("\f").map(p => p.trim()).filter(p => p.length > 0)
    : [];

  useEffect(() => {
    if (!data) return;
    if (rawContent === "__TOC__") onActualSubPageCount(1);
    else if (pdfPages.length > 0) onActualSubPageCount(pdfPages.length);
  }, [data?.content]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [subPage, chapter.id]);

  const safeSubPage = Math.min(subPage, Math.max(0, pdfPages.length - 1));
  const pageText = pdfPages[safeSubPage] ?? "";
  const currentPdfPage = chapter.pdfPage != null && pdfPages.length > 0
    ? chapter.pdfPage + safeSubPage : null;

  // ─── Selection detection ───────────────────────────────────────
  const getParaSelection = useCallback((): PendingHL | null => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return null;
    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (text.length < 2) return null;
    let node: Node | null = range.startContainer;
    let paraEl: HTMLElement | null = null;
    while (node && node !== document.body) {
      const el = node as HTMLElement;
      if ((el as HTMLElement).dataset?.paraIdx !== undefined) { paraEl = el; break; }
      node = node.parentElement;
    }
    if (!paraEl) return null;
    const paraIdx = parseInt(paraEl.dataset.paraIdx || "0");
    const preRange = document.createRange();
    preRange.selectNodeContents(paraEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = Math.min(startOffset + text.length, (paraEl.textContent || "").length);
    const rect = range.getBoundingClientRect();
    return { paraIndex: paraIdx, startOffset, endOffset, text, rect };
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !canRead) return;
    function onEnd() {
      setTimeout(() => {
        const r = getParaSelection();
        if (r) setPendingHL(r);
      }, 80);
    }
    el.addEventListener("mouseup", onEnd);
    el.addEventListener("touchend", onEnd);
    return () => { el.removeEventListener("mouseup", onEnd); el.removeEventListener("touchend", onEnd); };
  }, [canRead, data?.content, getParaSelection]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-hl-toolbar]") && !t.closest("[data-hl-tooltip]")) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) setPendingHL(null);
        if (!t.closest("[data-highlight-id]")) { setActiveHLId(null); setActiveHLPos(null); }
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // ─── Render paragraph with highlights ─────────────────────────
  function inlineMd(text: string, prefix: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIdx = 0; let ki = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIdx) nodes.push(text.slice(lastIdx, m.index));
      if (m[1] !== undefined) nodes.push(<strong key={`${prefix}bi${ki++}`} style={{ fontWeight: 700 }}><em>{m[1]}</em></strong>);
      else if (m[2] !== undefined) nodes.push(<strong key={`${prefix}b${ki++}`} style={{ fontWeight: 700 }}>{m[2]}</strong>);
      else if (m[3] !== undefined) nodes.push(<em key={`${prefix}i${ki++}`}>{m[3]}</em>);
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
    return nodes;
  }

  function renderPara(text: string, paraIdx: number): React.ReactNode {
    const hls = highlights
      .filter(h => h.chapterId === chapter.id && h.subPage === safeSubPage && h.paraIndex === paraIdx)
      .sort((a, b) => a.startOffset - b.startOffset);
    if (!hls.length) return inlineMd(text, `p${paraIdx}-`);
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    for (const hl of hls) {
      const s = Math.max(hl.startOffset, cursor);
      const e = Math.min(hl.endOffset, text.length);
      if (s >= e) continue;
      if (s > cursor) nodes.push(...inlineMd(text.slice(cursor, s), `p${paraIdx}-pre${s}-`));
      nodes.push(
        <mark key={hl.id} className={`bk-hl-${hl.color}`} data-highlight-id={hl.id}
          onClick={(ev) => {
            ev.stopPropagation();
            setPendingHL(null);
            window.getSelection()?.removeAllRanges();
            if (activeHLId === hl.id) { setActiveHLId(null); setActiveHLPos(null); }
            else {
              const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
              setActiveHLId(hl.id);
              setActiveHLPos({ x: r.left + r.width / 2, y: r.top });
            }
          }}>
          {inlineMd(text.slice(s, e), `p${paraIdx}-hl${hl.id}-`)}
        </mark>
      );
      cursor = e;
    }
    if (cursor < text.length) nodes.push(...inlineMd(text.slice(cursor), `p${paraIdx}-post${cursor}-`));
    return nodes;
  }

  function clampX(x: number) {
    return Math.max(96, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 400) - 96));
  }
  function calcToolbarY(rect: DOMRect) {
    const top = rect.top - 60;
    return top < 8 ? rect.bottom + 10 : top;
  }

  if (!canRead) return (
    <div className={`flex-1 overflow-y-auto flex flex-col items-center justify-center gap-5 px-8 text-center ${animClass}`} style={{ background: "var(--bk-bg)" }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--bk-accent-light)" }}>
        <LockKeyhole size={24} style={{ color: "var(--bk-accent)" }} />
      </div>
      <div>
        <h3 className="bk-serif text-xl bk-ink font-bold mb-2">Capítulo bloqueado</h3>
        <p className="text-sm bk-muted">Adquire o livro para aceder a todos os capítulos.</p>
      </div>
      <button onClick={onBuy} data-testid="btn-buy-reader"
        className="px-8 py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.98] transition-transform"
        style={{ background: "var(--bk-accent)" }}>
        Comprar acesso completo
      </button>
    </div>
  );

  if (isLoading) return (
    <div className={`flex-1 flex items-center justify-center ${animClass}`} style={{ background: "var(--bk-bg)" }}>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--bk-accent)", animationDelay: `${i*0.15}s` }} />)}
      </div>
    </div>
  );

  if (isError) return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center ${animClass}`} style={{ background: "var(--bk-bg)" }}>
      <p className="bk-serif bk-ink text-base opacity-70">Não foi possível carregar o conteúdo.</p>
      <button
        onClick={() => refetch()}
        className="text-sm px-4 py-2 rounded-md border"
        style={{ borderColor: "var(--bk-accent)", color: "var(--bk-accent)", background: "transparent" }}
      >
        Tentar novamente
      </button>
    </div>
  );

  // Sumário
  if (rawContent === "__TOC__" && allChapters) {
    const fmChapters = allChapters.filter(c => c.pageType === "front-matter" && c.title !== "Sumário");
    const regularChapters = allChapters.filter(c => c.pageType === "chapter");
    const epilogueChapters = allChapters.filter(c => c.pageType === "epilogue");
    return (
      <div className={`flex-1 overflow-y-auto ${animClass}`} style={{ background: "var(--bk-bg)" }}>
        <div className="max-w-[62ch] mx-auto px-7 pb-16">
          <div className="pt-14 pb-8 text-center">
            <h2 className="bk-serif text-2xl bk-ink font-bold mb-3">Sumário</h2>
            <div className="flex items-center justify-center gap-2 mt-5">
              <div className="h-px w-16 opacity-30" style={{ background: "var(--bk-accent)" }} />
              <div className="w-1 h-1 rounded-full opacity-40" style={{ background: "var(--bk-accent)" }} />
              <div className="h-px w-16 opacity-30" style={{ background: "var(--bk-accent)" }} />
            </div>
          </div>
          {fmChapters.map(ch => {
            const idx = allChapters.indexOf(ch);
            return (
              <button key={ch.id} onClick={() => onGoToChapter?.(idx)}
                className="w-full flex items-center gap-3 py-3 border-b bk-sep text-left active:opacity-60 group">
                <BookMarked size={13} className="shrink-0 opacity-50" style={{ color: "var(--bk-accent)" }} />
                <span className="bk-serif text-sm bk-ink italic">{ch.title}</span>
              </button>
            );
          })}
          {regularChapters.map(ch => {
            const idx = allChapters.indexOf(ch);
            const isLocked = !purchased && !ch.isPreview;
            return (
              <button key={ch.id} onClick={() => !isLocked && onGoToChapter?.(idx)} disabled={isLocked}
                className="w-full flex items-start gap-3 py-3 border-b bk-sep text-left disabled:opacity-40 active:opacity-60 group">
                <span className="text-[10px] font-mono font-bold shrink-0 mt-0.5 w-5 text-right" style={{ color: "var(--bk-accent)" }}>{ch.order}</span>
                <span className="bk-serif text-sm bk-ink leading-snug">{ch.title}</span>
                {isLocked && <LockKeyhole size={11} className="shrink-0 mt-1 ml-auto bk-muted" />}
              </button>
            );
          })}
          {epilogueChapters.map(ch => {
            const idx = allChapters.indexOf(ch);
            return (
              <button key={ch.id} onClick={() => onGoToChapter?.(idx)}
                className="w-full flex items-center gap-3 py-3 border-b bk-sep text-left active:opacity-60 group">
                <BookMarked size={13} className="shrink-0 opacity-50" style={{ color: "var(--bk-accent)" }} />
                <span className="bk-serif text-sm bk-ink italic">{ch.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const isSpacedTitle = /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ](\s[A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ])*$/.test(pageText.trim());
  const paras = isSpacedTitle ? [] : processContent(pageText);

  return (
    <>
      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${animClass}`} style={{ background: "var(--bk-bg)" }}>
        <div ref={contentRef} className="max-w-[62ch] mx-auto px-7 pb-16">

          {safeSubPage === 0 && (
            isFrontMatter ? (
              <div className="pt-14 pb-10 text-center">
                {chapter.tag && <p className="text-[9px] uppercase tracking-[0.28em] font-bold mb-6 bk-accent">{chapter.tag}</p>}
                <h2 className="bk-serif text-2xl bk-ink font-bold mb-3">{chapter.title}</h2>
                <div className="flex items-center justify-center gap-2 mt-5">
                  <div className="h-px w-16 opacity-30" style={{ background: "var(--bk-accent)" }} />
                  <div className="w-1 h-1 rounded-full opacity-40" style={{ background: "var(--bk-accent)" }} />
                  <div className="h-px w-16 opacity-30" style={{ background: "var(--bk-accent)" }} />
                </div>
              </div>
            ) : (
              <div className="pt-10 pb-4">
                {/* ── Date badge + Verse box ── */}
                <div className="flex items-center gap-3 mb-6">
                  {/* Date badge */}
                  {(() => {
                    const { day, month } = chapterDate(chapter.order);
                    return (
                      <div className="flex flex-col items-center shrink-0">
                        <div className="rounded-lg px-3 py-1.5" style={{ background: "var(--bk-accent)" }}>
                          <span className="font-black text-2xl leading-none" style={{ color: "#fff" }}>{day}</span>
                        </div>
                        <span className="text-[11px] font-black mt-1" style={{ color: "var(--bk-accent)" }}>{month}</span>
                      </div>
                    );
                  })()}
                  {/* Verse quote */}
                  {(chapter.excerpt || chapter.tag) && (
                    <div className="flex-1 rounded-xl px-3 py-3" style={{ border: "1px solid var(--bk-sep)", background: "var(--bk-page)" }}>
                      {chapter.excerpt && (
                        <p className="bk-serif text-[13px] italic bk-ink leading-relaxed">
                          "{chapter.excerpt}"
                        </p>
                      )}
                      {chapter.tag && (
                        <p className="text-[11px] font-bold mt-2 text-right" style={{ color: "var(--bk-accent)" }}>
                          {chapter.tag}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Title with decorative lines ── */}
                <div className="text-center py-3 mb-2" style={{ borderTop: "2px solid var(--bk-accent)", borderBottom: "2px solid var(--bk-accent)" }}>
                  <h2 className={`bk-serif font-black bk-ink uppercase leading-tight ${chapter.title.length > 60 ? "text-[13px]" : chapter.title.length > 40 ? "text-[15px]" : "text-[18px]"}`}
                    style={{ letterSpacing: "0.04em" }}>
                    {chapter.title}
                  </h2>
                </div>

                {chapter.imageUrl && (
                  <div className="mt-4 -mx-1 rounded-xl overflow-hidden">
                    <img src={chapter.imageUrl} alt="" className="w-full object-cover" style={{ maxHeight: 260 }} />
                  </div>
                )}
              </div>
            )
          )}

          {isSpacedTitle ? (
            <div className="flex flex-col items-center justify-center" style={{ minHeight: "50vh" }}>
              <p className="bk-serif font-bold bk-accent text-center" style={{ fontSize: "13px", letterSpacing: "0.35em", lineHeight: "3", opacity: 0.85 }}>
                {pageText.trim()}
              </p>
              <div className="flex items-center justify-center gap-2 mt-8 opacity-25">
                <div className="h-px w-10" style={{ background: "var(--bk-accent)" }} />
                <div className="w-1 h-1 rounded-full" style={{ background: "var(--bk-accent)" }} />
                <div className="h-px w-10" style={{ background: "var(--bk-accent)" }} />
              </div>
            </div>
          ) : isFrontMatter && chapter.tag === "DEDICATÓRIA" ? (
            <div className="py-4 space-y-5 text-center">
              {paras.map((p, i) => (
                <p key={i} data-para-idx={i} className="bk-serif text-base italic bk-ink leading-relaxed">
                  {renderPara(p, i)}
                </p>
              ))}
            </div>
          ) : (() => {
            const { body, dica, oracao } = isFrontMatter
              ? { body: paras, dica: null, oracao: [] }
              : parseChapterSections(paras);
            return (
              <div className="pb-2">
                {/* Body paragraphs */}
                <div className="pt-3">
                  {body.length === 0 && data && (
                    <p className="bk-serif bk-ink opacity-40 text-center pt-8 text-sm">Conteúdo não disponível.</p>
                  )}
                  {body.map((p, i) => {
                    const isBullet = p.trimStart().startsWith("- ");
                    if (isBullet) {
                      const items = p.split("\n").map(l => l.trim()).filter(l => l.startsWith("- ")).map(l => l.slice(2));
                      return (
                        <ul key={i} data-para-idx={i} className="bk-serif bk-ink"
                          style={{ fontSize: "16px", lineHeight: "1.72", paddingLeft: "1.4em", marginBottom: i < body.length - 1 ? "0.85em" : "0", listStyleType: "disc" }}>
                          {items.map((item, j) => <li key={j}>{inlineMd(item, `p${i}li${j}`)}</li>)}
                        </ul>
                      );
                    }
                    return (
                      <p key={i} data-para-idx={i} className="bk-serif bk-ink"
                        style={{ fontSize: "16px", lineHeight: "1.72", textAlign: "justify", hyphens: "auto", marginBottom: i < body.length - 1 ? "0.85em" : "0", textIndent: i === 0 && safeSubPage === 0 ? "0" : "1.6em" } as React.CSSProperties}>
                        {renderPara(p, i)}
                      </p>
                    );
                  })}
                </div>

                {/* ── Dica do Dia ── */}
                {dica && (
                  <div className="mt-6 rounded-xl p-4" style={{ background: "var(--bk-accent-light)", border: "1.5px solid var(--bk-accent)" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--bk-accent)" }}>
                        <Lightbulb size={14} color="#fff" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: "var(--bk-accent)" }}>Dica do Dia</p>
                        {dica.instruction && (
                          <p className="bk-serif text-[13px] bk-ink leading-snug mb-1">{dica.instruction}</p>
                        )}
                        {dica.quote && (
                          <p className="bk-serif text-[14px] font-bold bk-ink italic">"{dica.quote}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Momento de Oração ── */}
                {oracao.length > 0 && (
                  <div className="mt-7">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1" style={{ background: "var(--bk-sep)" }} />
                      <span className="bk-serif font-black text-[12px] uppercase tracking-[0.18em] bk-ink">Momento de Oração</span>
                      <div className="h-px flex-1" style={{ background: "var(--bk-sep)" }} />
                    </div>
                    {oracao.map((p, i) => (
                      <p key={i} data-para-idx={body.length + i + 1} className="bk-serif bk-ink"
                        style={{ fontSize: "15px", lineHeight: "1.75", marginBottom: i < oracao.length - 1 ? "0.75em" : "0" }}>
                        {renderPara(p, body.length + i + 1)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {currentPdfPage && (
            <div className="flex items-center justify-center mt-8 mb-2">
              <span className="text-[10px] font-mono bk-muted">{currentPdfPage}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-12 opacity-25">
            <div className="h-px w-10" style={{ background: "var(--bk-accent)" }} />
            <div className="w-1 h-1 rounded-full" style={{ background: "var(--bk-accent)" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--bk-accent)" }} />
            <div className="w-1 h-1 rounded-full" style={{ background: "var(--bk-accent)" }} />
            <div className="h-px w-10" style={{ background: "var(--bk-accent)" }} />
          </div>
        </div>
      </div>

      {/* ── Highlight color toolbar ── */}
      {pendingHL && (
        <div data-hl-toolbar
          className="fixed z-[200] pointer-events-auto"
          style={{ left: clampX(pendingHL.rect.left + pendingHL.rect.width / 2), top: calcToolbarY(pendingHL.rect), transform: "translateX(-50%)" }}>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-2 shadow-2xl"
            style={{ background: "var(--bk-ink)" }}>
            {(Object.entries(HL_COLORS) as [HLColor, typeof HL_COLORS[HLColor]][]).map(([color, cfg]) => (
              <button key={color}
                data-testid={`btn-hl-${color}`}
                title={cfg.label}
                className="w-7 h-7 rounded-full active:scale-90 transition-transform ring-2 ring-transparent hover:ring-white/30"
                style={{ background: cfg.bg }}
                onClick={() => {
                  onSaveHighlight({
                    chapterId: chapter.id, subPage: safeSubPage,
                    paraIndex: pendingHL.paraIndex,
                    startOffset: pendingHL.startOffset, endOffset: pendingHL.endOffset,
                    text: pendingHL.text, color,
                  });
                  setPendingHL(null);
                  window.getSelection()?.removeAllRanges();
                }}
              />
            ))}
            <button className="ml-1 opacity-50 hover:opacity-90 transition-opacity"
              onClick={() => { setPendingHL(null); window.getSelection()?.removeAllRanges(); }}>
              <X size={14} style={{ color: "var(--bk-bg)" }} />
            </button>
          </div>
          {pendingHL.rect.top - 60 >= 8 && (
            <div className="flex justify-center">
              <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid var(--bk-ink)" }} />
            </div>
          )}
        </div>
      )}

      {/* ── Delete highlight tooltip ── */}
      {activeHLId !== null && activeHLPos && (
        <div data-hl-tooltip
          className="fixed z-[200] pointer-events-auto"
          style={{ left: clampX(activeHLPos.x), top: activeHLPos.y - 54, transform: "translateX(-50%)" }}>
          <div className="flex items-center rounded-full shadow-2xl overflow-hidden"
            style={{ background: "var(--bk-ink)" }}>
            <button data-testid="btn-hl-delete"
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium active:opacity-70"
              style={{ color: "var(--bk-bg)" }}
              onClick={() => { onDeleteHighlight(activeHLId); setActiveHLId(null); setActiveHLPos(null); }}>
              <Trash2 size={13} /> Remover marcação
            </button>
          </div>
          <div className="flex justify-center">
            <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid var(--bk-ink)" }} />
          </div>
        </div>
      )}
    </>
  );
}


const HL_SOLID: Record<string, string> = {
  yellow:  "#e6c100",
  green:   "#3aad4a",
  pink:    "#e85580",
  blue:    "#2e9fd4",
  orange:  "#e07b10",
  purple:  "#8b3fd6",
  teal:    "#10a89e",
  red:     "#e03030",
};

function buildHighlightCanvas(hl: BookHighlight, chapterLabel: string): HTMLCanvasElement {
  const W = 1080, H = 1080;
  const PAD = 88;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const accentColor = HL_SOLID[hl.color] ?? "#2d6118";

  // ── Background ──────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#f7f5ee");
  bgGrad.addColorStop(1, "#dde8d6");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Accent strip at top ─────────────────────────────────────────
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, W, 12);

  // ── Decorative large quotation mark (background, top-left) ─────
  ctx.save();
  ctx.fillStyle = "rgba(45,97,24,0.07)";
  ctx.font = `bold 280px Georgia, serif`;
  ctx.fillText("\u201C", PAD - 20, PAD + 220);
  ctx.restore();

  // ── Chapter label ───────────────────────────────────────────────
  const labelY = PAD + 46;
  ctx.fillStyle = accentColor;
  ctx.font = `700 26px Arial, sans-serif`;
  const labelText = chapterLabel.toUpperCase().slice(0, 55);
  ctx.fillText(labelText, PAD, labelY);

  // ── Thin divider under label ─────────────────────────────────────
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, labelY + 16);
  ctx.lineTo(PAD + ctx.measureText(labelText).width + 40, labelY + 16);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── Quoted text (word-wrapped, auto font-size) ──────────────────
  const textAreaTop    = labelY + 46;
  const textAreaBottom = H - 200;
  const textAreaH      = textAreaBottom - textAreaTop;
  const maxW           = W - PAD * 2;

  function wrapLines(fontSize: number): string[] {
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    const rawText = `\u201C${hl.text}\u201D`;
    const words = rawText.split(" ");
    const ls: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW) { if (cur) ls.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) ls.push(cur);
    return ls;
  }

  // Pick largest font that fits
  let fontSize = 52, lineH = 76, lines: string[] = [];
  for (const fs of [52, 46, 40, 34, 28]) {
    lines = wrapLines(fs);
    lineH = Math.round(fs * 1.48);
    if (lines.length * lineH <= textAreaH) { fontSize = fs; break; }
  }
  // Clamp to 12 lines max
  if (lines.length > 12) { lines = lines.slice(0, 12); lines[11] += "…"; }

  const blockH   = lines.length * lineH;
  const textStartY = textAreaTop + Math.max(0, (textAreaH - blockH) / 2);

  ctx.fillStyle = "#2a1a08";
  ctx.font = `italic ${fontSize}px Georgia, serif`;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], PAD, textStartY + lineH * i + fontSize);
  }

  // ── Bottom section ──────────────────────────────────────────────
  const bottomY = H - 160;

  // Divider
  ctx.strokeStyle = "rgba(45,97,24,0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, bottomY);
  ctx.lineTo(W - PAD, bottomY);
  ctx.stroke();

  // Book title
  ctx.fillStyle = "rgba(20,31,14,0.90)";
  ctx.font = `700 36px Georgia, serif`;
  ctx.fillText("365 Encontros com Deus Pai", PAD, bottomY + 54);

  // Author
  ctx.fillStyle = "rgba(45,97,24,0.70)";
  ctx.font = `400 28px Georgia, serif`;
  ctx.fillText("Jun Date", PAD, bottomY + 96);

  // Accent circle (right side)
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(W - PAD, bottomY + 74, 20, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/* ─────────────────────────────────────────────────────────────────
   BOOK READER  (full-screen overlay)
───────────────────────────────────────────────────────────────── */
function BookReader({ chapters, startIdx, purchased, onClose, onBuy, openToc }: {
  chapters: Chapter[];
  startIdx: number;
  purchased: boolean;
  onClose: () => void;
  onBuy: () => void;
  openToc?: boolean;
}) {
  const initCounts = chapters.map((ch, i) => {
    if (!ch.pdfPage) return 1;
    const next = chapters[i + 1]?.pdfPage;
    if (!next) return 5;
    return Math.max(1, next - ch.pdfPage);
  });

  const [chapterIdx, setChapterIdx] = useState(startIdx);
  const [subPage, setSubPage]       = useState(0);
  const [animClass, setAnimClass]   = useState("");
  const [showToc, setShowToc]       = useState(openToc ?? false);
  const [showHLPanel, setShowHLPanel] = useState(false);
  const [immersive, setImmersive]   = useState(false);
  const [outgoing, setOutgoing]     = useState<{ chIdx: number; sp: number; exitCls: string; foldCls: string; shadowCls: string; isMonthSep?: string } | null>(null);
  const [monthSepName, setMonthSepName] = useState<string | null>(null);
  const [hlImgPreview, setHlImgPreview] = useState<{ dataUrl: string; filename: string } | null>(null);
  const [showSearch, setShowSearch]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ chapterId: number; order: number; title: string; pageType: string; isPreview: boolean; before: string; match: string; after: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [subPageCounts, setSubPageCounts] = useState<number[]>(initCounts);
  const touchStartX = useRef<number | null>(null);
  const [screenshotCount, setScreenshotCount] = useState(() => {
    return parseInt(localStorage.getItem("bk-ss-count") || "0", 10);
  });
  const [isBlocked, setIsBlocked] = useState(() => {
    return localStorage.getItem("bk-blocked") === "1";
  });

  // ─── Save reading progress ─────────────────────────────────────
  // (Restore is handled by the parent via startIdx prop)
  useEffect(() => {
    const chapterTitle = chapters[chapterIdx]?.title ?? "";
    const total = subPageCounts.reduce((a: number, b: number) => a + b, 0);
    const abs = subPageCounts.slice(0, chapterIdx).reduce((a: number, b: number) => a + b, 0) + subPage;
    const pct = total > 1 ? Math.round((abs / (total - 1)) * 100) : 100;
    localStorage.setItem("bk-progress", JSON.stringify({ ch: chapterIdx, sp: subPage, pct, title: chapterTitle }));
  }, [chapterIdx, subPage, subPageCounts]);

  // ─── Book search via API (debounced) ──────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/book/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 350);
  }, [searchQuery]);

  // ─── Anti-piracy: block copy/paste & screenshot detection ─────
  useEffect(() => {
    const blockCopy = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (["c", "a", "x", "p", "s", "u"].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
      if (e.key === "PrintScreen" || e.key === "Print") {
        e.preventDefault();
        const newCount = screenshotCount + 1;
        setScreenshotCount(newCount);
        localStorage.setItem("bk-ss-count", String(newCount));
        if (newCount >= 15) {
          setIsBlocked(true);
          localStorage.setItem("bk-blocked", "1");
        }
      }
    };

    // Block ALL copy/cut at native document level (catches mobile toolbar too)
    const blockNativeCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Set empty clipboard so even if the event is not fully blocked, nothing is copied
      try { if (e.clipboardData) e.clipboardData.setData("text/plain", ""); } catch {}
      // Clear the selection so the native "Copy" toolbar disappears
      window.getSelection()?.removeAllRanges();
    };

    const blockContext = (e: MouseEvent) => e.preventDefault();

    // Mobile screenshot detection via visibility change
    let lastHidden = 0;
    const handleVisibility = () => {
      if (document.hidden) {
        lastHidden = Date.now();
      } else {
        if (lastHidden && Date.now() - lastHidden < 1500) {
          const newCount = screenshotCount + 1;
          setScreenshotCount(newCount);
          localStorage.setItem("bk-ss-count", String(newCount));
          if (newCount >= 15) {
            setIsBlocked(true);
            localStorage.setItem("bk-blocked", "1");
          }
        }
      }
    };

    document.addEventListener("keydown", blockCopy, true);
    document.addEventListener("copy", blockNativeCopy, true);
    document.addEventListener("cut", blockNativeCopy, true);
    document.addEventListener("contextmenu", blockContext, true);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("keydown", blockCopy, true);
      document.removeEventListener("copy", blockNativeCopy, true);
      document.removeEventListener("cut", blockNativeCopy, true);
      document.removeEventListener("contextmenu", blockContext, true);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [screenshotCount]);

  const chapter      = chapters[chapterIdx];
  const subPageCount = subPageCounts[chapterIdx] ?? 1;
  const hasPrev = monthSepName !== null || chapterIdx > 0 || subPage > 0;
  const hasNext = monthSepName !== null || chapterIdx < chapters.length - 1 || subPage < subPageCount - 1;

  const totalSubPages = subPageCounts.reduce((a, b) => a + b, 0);
  const absPage = subPageCounts.slice(0, chapterIdx).reduce((a, b) => a + b, 0) + subPage;
  const progress = totalSubPages > 1 ? Math.round((absPage / (totalSubPages - 1)) * 100) : 100;

  // ─── Highlights ───────────────────────────────────────────────
  const { data: allHighlights = [] } = useQuery<BookHighlight[]>({
    queryKey: ["/api/book/highlights"],
    queryFn: () => fetch("/api/book/highlights", { credentials: "include" }).then(r => r.json()),
  });

  const saveHL = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/book/highlights", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/book/highlights"] }),
  });

  const deleteHL = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/book/highlights/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/book/highlights"] }),
  });

  // ─── Navigation ───────────────────────────────────────────────
  function handleActualSubPageCount(n: number) {
    if (n === subPageCounts[chapterIdx]) return;
    setSubPageCounts(prev => { const nx = [...prev]; nx[chapterIdx] = n; return nx; });
    setSubPage(p => Math.min(p, n - 1));
  }

  const FLIP_MS = 420;

  function makeOutgoing(cIdx: number, sp: number, dir: "left" | "right") {
    return {
      chIdx: cIdx, sp,
      exitCls:   dir === "left" ? "pg-exit-left"       : "pg-exit-right",
      foldCls:   dir === "left" ? "pg-fold-hl-l"       : "pg-fold-hl-r",
      shadowCls: dir === "left" ? "pg-curl-shadow-l"   : "pg-curl-shadow-r",
    };
  }

  function navigate(dir: "prev" | "next") {
    if (dir === "next") {
      if (monthSepName !== null) {
        // Leaving separator → reveal the chapter
        const outSep = { chIdx: chapterIdx, sp: 0, exitCls: "pg-exit-left", foldCls: "pg-fold-hl-l", shadowCls: "pg-curl-shadow-l", isMonthSep: monthSepName };
        setOutgoing(outSep);
        setMonthSepName(null);
        setAnimClass("pg-enter-right");
        setTimeout(() => { setAnimClass(""); setOutgoing(null); }, FLIP_MS);
        return;
      }
      // Check if next step crosses a month boundary
      const wouldAdvanceChapter = subPage >= subPageCount - 1 && chapterIdx < chapters.length - 1;
      if (wouldAdvanceChapter) {
        const nextChIdx = chapterIdx + 1;
        const monthName = chapterStartsNewMonth(chapters, nextChIdx);
        if (monthName) {
          setOutgoing(makeOutgoing(chapterIdx, subPage, "left"));
          setAnimClass("pg-enter-right");
          setTimeout(() => { setAnimClass(""); setOutgoing(null); }, FLIP_MS);
          setChapterIdx(nextChIdx);
          setSubPage(0);
          setMonthSepName(monthName);
          return;
        }
      }
      // Normal next navigation
      setOutgoing(makeOutgoing(chapterIdx, subPage, "left"));
      setAnimClass("pg-enter-right");
      setTimeout(() => { setAnimClass(""); setOutgoing(null); }, FLIP_MS);
      if (subPage < subPageCount - 1) setSubPage(p => p + 1);
      else if (chapterIdx < chapters.length - 1) { setChapterIdx(i => i + 1); setSubPage(0); }
    } else {
      if (monthSepName !== null) {
        // Going back from separator → go to previous chapter's last subpage
        const outSep = { chIdx: chapterIdx, sp: 0, exitCls: "pg-exit-right", foldCls: "pg-fold-hl-r", shadowCls: "pg-curl-shadow-r", isMonthSep: monthSepName };
        setOutgoing(outSep);
        setMonthSepName(null);
        setAnimClass("pg-enter-left");
        setTimeout(() => { setAnimClass(""); setOutgoing(null); }, FLIP_MS);
        if (chapterIdx > 0) {
          const prevChIdx = chapterIdx - 1;
          setChapterIdx(prevChIdx);
          setSubPage(subPageCounts[prevChIdx] - 1);
        }
        return;
      }
      // Check if going prev from subPage 0 of a month-boundary chapter should show separator first
      if (subPage === 0 && chapterIdx > 0) {
        const monthName = chapterStartsNewMonth(chapters, chapterIdx);
        if (monthName) {
          setOutgoing(makeOutgoing(chapterIdx, 0, "right"));
          setAnimClass("pg-enter-left");
          setTimeout(() => { setAnimClass(""); setOutgoing(null); }, FLIP_MS);
          setMonthSepName(monthName);
          return;
        }
      }
      // Normal prev navigation
      setOutgoing(makeOutgoing(chapterIdx, subPage, "right"));
      setAnimClass("pg-enter-left");
      setTimeout(() => { setAnimClass(""); setOutgoing(null); }, FLIP_MS);
      if (subPage > 0) setSubPage(p => p - 1);
      else if (chapterIdx > 0) { const p = chapterIdx - 1; setChapterIdx(p); setSubPage(subPageCounts[p] - 1); }
    }
  }

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    // Don't swipe if user is selecting text
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return;
    if (Math.abs(diff) > 55) { diff > 0 && hasNext ? navigate("next") : diff < 0 && hasPrev ? navigate("prev") : null; }
  }

  function goToChapter(idx: number) {
    const dir = idx >= chapterIdx ? "left" : "right";
    if (monthSepName !== null) {
      setMonthSepName(null);
    } else {
      setOutgoing(makeOutgoing(chapterIdx, subPage, dir));
    }
    setAnimClass(dir === "left" ? "pg-enter-right" : "pg-enter-left");
    setTimeout(() => { setAnimClass(""); setOutgoing(null); }, FLIP_MS);
    setChapterIdx(idx); setSubPage(0); setShowToc(false);
  }

  function handleContentTap(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button, a, [data-hl-toolbar], [data-hl-tooltip]")) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return;
    setImmersive(v => !v);
  }

  function pageLabel() {
    if (monthSepName !== null) return monthSepName.toUpperCase();
    if (!chapter) return "";
    if (chapter.pageType === "front-matter" || chapter.pageType === "epilogue") return chapter.title;
    const pdfPageNum = chapter.pdfPage != null ? chapter.pdfPage + subPage : null;
    return pdfPageNum ? `Página ${pdfPageNum}` : `Cap. ${chapter.order}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bk-bg pt-safe"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}>
      <style>{BOOK_STYLES}</style>

      {/* Screenshot / piracy block overlay */}
      {isBlocked && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center px-8 text-center"
          style={{ background: "var(--bk-bg)" }}>
          <div className="text-5xl mb-6">🔒</div>
          <h2 className="bk-serif text-xl font-bold bk-ink mb-3">Acesso Bloqueado</h2>
          <p className="bk-serif text-sm bk-muted leading-relaxed mb-6">
            Detetámos atividade suspeita nesta sessão de leitura. O acesso ao livro foi suspenso para proteger os direitos de autor.
          </p>
          <p className="text-xs bk-muted">
            Se acreditas que isto é um engano, contacta o suporte.
          </p>
          <button onClick={onClose}
            className="mt-8 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--bk-accent)" }}>
            Fechar
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="shrink-0 overflow-hidden" style={{ maxHeight: immersive ? 0 : "6rem", transition: "max-height 0.3s ease" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b bk-sep bk-bg">
          <button onClick={onClose} data-testid="btn-close-reader" className="p-2.5 active:opacity-50">
            <X size={22} className="bk-muted" />
          </button>
          <p className="text-[10px] uppercase tracking-[0.2em] bk-muted font-semibold">365 Encontros com Deus Pai</p>
          <div className="flex items-center gap-0.5">
            <button onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 80); }}
              data-testid="btn-search" className="p-2.5 active:opacity-50">
              <Search size={18} className="bk-muted" />
            </button>
            <button onClick={() => setShowHLPanel(true)} data-testid="btn-highlights-panel"
              className="p-2.5 active:opacity-50 relative">
              <Highlighter size={18} className="bk-muted" />
              {allHighlights.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full text-[8px] font-bold flex items-center justify-center px-0.5"
                  style={{ background: "var(--bk-accent)", color: "var(--bk-bg)" }}>
                  {allHighlights.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowToc(true)} data-testid="btn-toc" className="p-2.5 active:opacity-50">
              <AlignLeft size={20} className="bk-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 overflow-hidden" style={{ maxHeight: immersive ? 0 : "4px", transition: "max-height 0.3s ease" }}>
        <div className="h-[2px]" style={{ background: "var(--bk-sep)" }}>
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "var(--bk-accent)" }} />
        </div>
      </div>

      {/* TOC overlay */}
      {showToc && (
        <div className="absolute inset-0 z-20 flex flex-col bk-bg overflow-hidden pt-safe">
          <style>{BOOK_STYLES}</style>
          <div className="flex items-center justify-between px-5 py-4 border-b bk-sep shrink-0">
            <h2 className="bk-serif text-lg bk-ink font-bold">Índice</h2>
            <button onClick={() => setShowToc(false)} className="p-2.5 active:opacity-50"><X size={20} className="bk-muted" /></button>
          </div>
          <TocPage chapters={chapters} purchased={purchased}
            onSelect={goToChapter} onBuy={() => { setShowToc(false); onBuy(); }} />
        </div>
      )}

      {/* Highlights panel */}
      {showHLPanel && (
        <div className="absolute inset-0 z-20 flex flex-col bk-bg overflow-hidden pt-safe">
          <style>{BOOK_STYLES}</style>
          <div className="flex items-center justify-between px-5 py-4 border-b bk-sep shrink-0">
            <div className="flex items-center gap-2">
              <Highlighter size={16} style={{ color: "var(--bk-accent)" }} />
              <h2 className="bk-serif text-lg bk-ink font-bold">As Tuas Marcações</h2>
            </div>
            <button onClick={() => setShowHLPanel(false)} className="p-2.5 active:opacity-50"><X size={20} className="bk-muted" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-12">
            {allHighlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 gap-3 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-30"
                  style={{ background: "var(--bk-accent-light)" }}>
                  <Highlighter size={20} style={{ color: "var(--bk-accent)" }} />
                </div>
                <p className="bk-serif text-base bk-ink opacity-60">Ainda não marcaste nada.</p>
                <p className="text-sm bk-muted text-center">Seleciona texto no livro e escolhe uma cor para sublinhar.</p>
              </div>
            ) : (
              <div>
                {allHighlights.map(hl => {
                  const ch = chapters.find(c => c.id === hl.chapterId);
                  const colorBg = HL_COLORS[hl.color as HLColor]?.bg ?? "rgba(255,236,90,0.55)";
                  return (
                    <div key={hl.id} className="py-4 border-b bk-sep last:border-0">
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: colorBg }} />
                        <div className="flex-1 min-w-0">
                          {ch && (
                            <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5"
                              style={{ color: "var(--bk-accent)" }}>
                              {ch.pageType === "chapter" ? `Cap. ${ch.order} — ${ch.title.slice(0, 40)}` : ch.title}
                            </p>
                          )}
                          <p className="bk-serif text-[14px] bk-ink leading-relaxed italic">
                            "{hl.text}"
                          </p>
                          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                            <p className="text-[11px] bk-muted">
                              {new Date(hl.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                              {ch && (
                                <button className="text-[11px] font-semibold active:opacity-60"
                                  style={{ color: "var(--bk-accent)" }}
                                  onClick={() => {
                                    const idx = chapters.findIndex(c => c.id === hl.chapterId);
                                    if (idx >= 0) { goToChapter(idx); setShowHLPanel(false); }
                                  }}>
                                  Ir ao capítulo
                                </button>
                              )}
                              <button className="flex items-center gap-1 text-[11px] font-semibold active:opacity-60"
                                style={{ color: "var(--bk-accent)" }}
                                onClick={() => {
                                  const label = ch
                                    ? (ch.pageType === "chapter" ? `Cap. ${ch.order} — ${ch.title}` : ch.title)
                                    : "365 Encontros com Deus Pai";
                                  const cvs = buildHighlightCanvas(hl, label);
                                  setHlImgPreview({
                                    dataUrl: cvs.toDataURL("image/png"),
                                    filename: `marcacao-365encontros.png`,
                                  });
                                }}>
                                <ImageDown size={12} /> Imagem
                              </button>
                              <button className="flex items-center gap-1 text-[11px] active:opacity-60"
                                style={{ color: "var(--bk-muted)" }}
                                onClick={() => deleteHL.mutate(hl.id)}>
                                <Trash2 size={12} /> Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden" onClick={handleContentTap}>

        {/* ── Page curl layers ── */}
        {outgoing && (
          <>
            {/* Layer 1 – shadow cast on the revealed (new) page */}
            <div className={`absolute inset-0 z-10 pointer-events-none ${outgoing.shadowCls}`} />

            {/* Layer 2 – outgoing page clipping away diagonally */}
            <div className={`absolute inset-0 z-20 pointer-events-none ${outgoing.exitCls}`}>
              {outgoing.isMonthSep ? (
                <MonthSeparatorPage monthName={outgoing.isMonthSep} animClass="" />
              ) : chapters[outgoing.chIdx] ? (
                <ChapterPage
                  chapter={chapters[outgoing.chIdx]}
                  purchased={purchased}
                  onBuy={() => {}}
                  animClass=""
                  subPage={outgoing.sp}
                  onActualSubPageCount={() => {}}
                  allChapters={chapters}
                  onGoToChapter={() => {}}
                  highlights={allHighlights}
                  onSaveHighlight={() => {}}
                  onDeleteHighlight={() => {}}
                />
              ) : null}
            </div>

            {/* Layer 3 – bright fold-edge highlight (NOT clipped) */}
            <div className={`absolute inset-0 z-30 pointer-events-none ${outgoing.foldCls}`} />
          </>
        )}

        {monthSepName !== null ? (
          <MonthSeparatorPage monthName={monthSepName} animClass={animClass} />
        ) : chapter ? (
          <ChapterPage
            chapter={chapter}
            purchased={purchased}
            onBuy={onBuy}
            animClass={animClass}
            subPage={subPage}
            onActualSubPageCount={handleActualSubPageCount}
            allChapters={chapters}
            onGoToChapter={goToChapter}
            highlights={allHighlights}
            onSaveHighlight={(data) => saveHL.mutate(data)}
            onDeleteHighlight={(id) => deleteHL.mutate(id)}
          />
        ) : null}
        {/* Immersive hint */}
        {immersive && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none select-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium bk-muted"
              style={{ background: "var(--bk-sep)", opacity: 0.55 }}>
              Toque para mostrar menu
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 overflow-hidden" style={{ maxHeight: immersive ? 0 : "6rem", transition: "max-height 0.3s ease" }}>
        <div className="border-t bk-sep bk-bg px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("prev")} disabled={!hasPrev}
            data-testid="btn-prev-chapter"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border bk-sep text-sm font-medium disabled:opacity-20 active:scale-[0.97] transition-all bk-muted"
            style={{ minWidth: 96 }}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <p className="flex-1 text-center text-[10px] bk-muted font-mono">{pageLabel()}</p>
          <button onClick={() => navigate("next")} disabled={!hasNext}
            data-testid="btn-next-chapter"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-20 active:scale-[0.97] transition-all text-white"
            style={{ minWidth: 96, background: hasNext ? "var(--bk-accent)" : "var(--bk-muted)", opacity: hasNext ? 1 : 0.3 }}>
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Search panel ── */}
      {showSearch && (
        <div className="fixed inset-0 z-[9990] flex flex-col pt-safe" style={{ background: "var(--bk-bg)" }}>
          {/* Search header */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--bk-sep)" }}>
            <Search size={17} style={{ color: "var(--bk-muted)", flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              data-testid="input-search-book"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar no livro…"
              className="flex-1 bg-transparent text-[15px] outline-none"
              style={{ color: "var(--bk-ink)" }}
              autoComplete="off"
              spellCheck={false}
            />
            {searchQuery && (
              <button className="p-1 active:opacity-50" onClick={() => setSearchQuery("")}>
                <X size={15} style={{ color: "var(--bk-muted)" }} />
              </button>
            )}
            <button className="pl-2 text-[13px] font-medium active:opacity-50"
              style={{ color: "var(--bk-accent)" }}
              onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
              Fechar
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {searchQuery.trim().length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 pb-20">
                <Search size={36} style={{ color: "var(--bk-sep)" }} />
                <p className="text-sm bk-muted">Digite pelo menos 2 letras para pesquisar</p>
              </div>
            ) : searchLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 pb-20">
                <p className="text-sm bk-muted animate-pulse">A pesquisar…</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 pb-20">
                <Search size={36} style={{ color: "var(--bk-sep)" }} />
                <p className="text-sm bk-muted">Nenhum resultado encontrado</p>
              </div>
            ) : (
              <div className="py-2">
                <p className="px-4 py-2 text-[11px] bk-muted">
                  {searchResults.length === 60 ? "60+ resultados" : `${searchResults.length} resultado${searchResults.length !== 1 ? "s" : ""}`}
                </p>
                {searchResults.map((r, i) => {
                  const chIdx = chapters.findIndex(c => c.id === r.chapterId);
                  const label = r.pageType === "chapter" ? `Cap. ${r.order} — ${r.title}` : r.title;
                  return (
                    <button key={i}
                      data-testid={`btn-search-result-${i}`}
                      className="w-full text-left px-4 py-3 border-b active:opacity-60"
                      style={{ borderColor: "var(--bk-sep)" }}
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery("");
                        setSearchResults([]);
                        if (chIdx >= 0) goToChapter(chIdx);
                      }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: "var(--bk-accent)" }}>
                          {label}
                        </span>
                      </div>
                      <p className="text-[13px] leading-snug" style={{ color: "var(--bk-muted)" }}>
                        {r.before}
                        <span className="font-bold rounded-sm px-0.5"
                          style={{ color: "var(--bk-ink)", background: "rgba(255,220,50,0.45)" }}>
                          {r.match}
                        </span>
                        {r.after}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Highlight image preview modal ── */}
      {hlImgPreview && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.82)" }}
          onClick={() => setHlImgPreview(null)}>
          <div
            className="flex flex-col items-center gap-4 p-4 rounded-2xl"
            style={{ maxWidth: "92vw", background: "var(--bk-bg)" }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="w-full flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--bk-ink)" }}>
                Prévia da imagem
              </span>
              <button
                className="p-1.5 rounded-full active:opacity-60"
                style={{ color: "var(--bk-muted)" }}
                onClick={() => setHlImgPreview(null)}>
                <X size={18} />
              </button>
            </div>
            {/* Image */}
            <img
              src={hlImgPreview.dataUrl}
              alt="Marcação exportada"
              className="rounded-xl border"
              style={{ width: "100%", maxWidth: 360, aspectRatio: "1/1", objectFit: "cover",
                borderColor: "var(--bk-sep)" }} />
            {/* Download button */}
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white active:opacity-80"
              style={{ background: "var(--bk-accent)" }}
              onClick={() => {
                const link = document.createElement("a");
                link.download = hlImgPreview.filename;
                link.href = hlImgPreview.dataUrl;
                link.click();
              }}>
              <ImageDown size={16} /> Baixar imagem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LIBRARY READER
───────────────────────────────────────────────────────────────── */
type LibHighlight = {
  id: number;
  bookId: number;
  pageNumber: number;
  paraIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  createdAt: string;
};
type LibPendingHL = { paraIndex: number; startOffset: number; endOffset: number; text: string; rect: DOMRect };

function LibraryReader({ bookId, bookTitle, bookAuthor, onClose }: {
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
  onClose: () => void;
}) {
  const lqc = useQueryClient();

  const [currentPage, setCurrentPage] = useState(() => {
    try { const s = localStorage.getItem(`lib-prog-${bookId}`); return s ? JSON.parse(s).p : 0; } catch { return 0; }
  });
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);
  const [immersive, setImmersive] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showHLPanel, setShowHLPanel] = useState(false);
  const [pendingHL, setPendingHL] = useState<LibPendingHL | null>(null);
  const [activeHLId, setActiveHLId] = useState<number | null>(null);
  const [activeHLPos, setActiveHLPos] = useState<{ x: number; y: number } | null>(null);
  const touchStartX = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  type LibPage = { id: number; pageNumber: number; content: string; title: string | null; subtitle: string | null; tag: string | null };
  type LibPagesResponse = { pages: LibPage[]; freePages: number; totalPages: number; locked: boolean };

  const { data: libPagesData, isLoading } = useQuery<LibPagesResponse>({
    queryKey: ["/api/library/books", bookId, "pages"],
    queryFn: async () => {
      const r = await fetch(`/api/library/books/${bookId}/pages`, { credentials: "include" });
      if (!r.ok) return { pages: [], freePages: 0, totalPages: 0, locked: false };
      return r.json();
    },
  });
  const pages = libPagesData?.pages ?? [];
  const libLocked = libPagesData?.locked ?? false;
  const libTotalPages = libPagesData?.totalPages ?? pages.length;

  const { data: highlights = [] } = useQuery<LibHighlight[]>({
    queryKey: ["/api/library/highlights", bookId],
    queryFn: () => fetch(`/api/library/highlights?bookId=${bookId}`, { credentials: "include" }).then(r => r.json()),
  });

  const saveHLMutation = useMutation({
    mutationFn: (d: Omit<LibHighlight, "id" | "createdAt" | "userId">) => apiRequest("POST", "/api/library/highlights", d),
    onSuccess: () => lqc.invalidateQueries({ queryKey: ["/api/library/highlights", bookId] }),
  });

  const deleteHLMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/library/highlights/${id}`, {}),
    onSuccess: () => lqc.invalidateQueries({ queryKey: ["/api/library/highlights", bookId] }),
  });

  const totalPages = pages.length;
  const safeCurrentPage = Math.max(0, Math.min(currentPage, Math.max(0, totalPages - 1)));
  const progress = totalPages > 0 ? Math.round(((safeCurrentPage + 1) / totalPages) * 100) : 0;
  const currentPageData = pages[safeCurrentPage];
  const paragraphs = currentPageData ? processContent(currentPageData.content) : [];

  useEffect(() => {
    if (totalPages > 0) localStorage.setItem(`lib-prog-${bookId}`, JSON.stringify({ p: safeCurrentPage }));
  }, [safeCurrentPage, totalPages, bookId]);

  function goTo(idx: number, dir: "left" | "right") {
    if (idx < 0 || idx >= totalPages) return;
    setAnimDir(dir);
    setTimeout(() => {
      setCurrentPage(idx);
      setAnimDir(null);
      setPendingHL(null);
      setActiveHLId(null);
      setActiveHLPos(null);
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, 220);
  }

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(safeCurrentPage + 1, "left");
      else goTo(safeCurrentPage - 1, "right");
    }
    touchStartX.current = null;
  }

  const getParaSelection = useCallback((): LibPendingHL | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return null;
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (text.length < 2) return null;
    let node: Node | null = range.startContainer;
    let paraEl: HTMLElement | null = null;
    while (node && node !== document.body) {
      const el = node as HTMLElement;
      if (el.dataset?.paraIdx !== undefined) { paraEl = el; break; }
      node = node.parentElement;
    }
    if (!paraEl) return null;
    const paraIdx = parseInt(paraEl.dataset.paraIdx || "0");
    const preRange = document.createRange();
    preRange.selectNodeContents(paraEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = Math.min(startOffset + text.length, (paraEl.textContent || "").length);
    const rect = range.getBoundingClientRect();
    return { paraIndex: paraIdx, startOffset, endOffset, text, rect };
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    function onEnd() { setTimeout(() => { const r = getParaSelection(); if (r) setPendingHL(r); }, 80); }
    el.addEventListener("mouseup", onEnd);
    el.addEventListener("touchend", onEnd);
    return () => { el.removeEventListener("mouseup", onEnd); el.removeEventListener("touchend", onEnd); };
  }, [getParaSelection, safeCurrentPage]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-hl-toolbar]") && !t.closest("[data-hl-tooltip]")) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) setPendingHL(null);
        if (!t.closest("[data-highlight-id]")) { setActiveHLId(null); setActiveHLPos(null); }
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function inlineMd(text: string, prefix: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIdx = 0; let ki = 0; let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIdx) nodes.push(text.slice(lastIdx, m.index));
      if (m[1] !== undefined) nodes.push(<strong key={`${prefix}bi${ki++}`} style={{ fontWeight: 700 }}><em>{m[1]}</em></strong>);
      else if (m[2] !== undefined) nodes.push(<strong key={`${prefix}b${ki++}`} style={{ fontWeight: 700 }}>{m[2]}</strong>);
      else if (m[3] !== undefined) nodes.push(<em key={`${prefix}i${ki++}`}>{m[3]}</em>);
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
    return nodes;
  }

  function renderPara(text: string, paraIdx: number): React.ReactNode {
    const pageNum = currentPageData?.pageNumber ?? 0;
    const hls = highlights.filter(h => h.pageNumber === pageNum && h.paraIndex === paraIdx).sort((a, b) => a.startOffset - b.startOffset);
    if (!hls.length) return inlineMd(text, `p${paraIdx}-`);
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    for (const hl of hls) {
      const s = Math.max(hl.startOffset, cursor), e = Math.min(hl.endOffset, text.length);
      if (s >= e) continue;
      if (s > cursor) nodes.push(...inlineMd(text.slice(cursor, s), `p${paraIdx}-pre${s}-`));
      nodes.push(
        <mark key={hl.id} className={`bk-hl-${hl.color}`} data-highlight-id={hl.id}
          onClick={ev => {
            ev.stopPropagation(); setPendingHL(null); window.getSelection()?.removeAllRanges();
            if (activeHLId === hl.id) { setActiveHLId(null); setActiveHLPos(null); }
            else { const r = (ev.currentTarget as HTMLElement).getBoundingClientRect(); setActiveHLId(hl.id); setActiveHLPos({ x: r.left + r.width / 2, y: r.top }); }
          }}>
          {inlineMd(text.slice(s, e), `p${paraIdx}-hl${hl.id}-`)}
        </mark>
      );
      cursor = e;
    }
    if (cursor < text.length) nodes.push(...inlineMd(text.slice(cursor), `p${paraIdx}-post${cursor}-`));
    return nodes;
  }

  function clampX(x: number) { return Math.max(96, Math.min(x, window.innerWidth - 96)); }

  const LIB_ANIM = `
    @keyframes lib-in-left { from { transform: translateX(40px); opacity:0; } to { transform: translateX(0); opacity:1; } }
    @keyframes lib-in-right { from { transform: translateX(-40px); opacity:0; } to { transform: translateX(0); opacity:1; } }
    @keyframes lib-out-left { from { transform: translateX(0); opacity:1; } to { transform: translateX(-40px); opacity:0; } }
    @keyframes lib-out-right { from { transform: translateX(0); opacity:1; } to { transform: translateX(40px); opacity:0; } }
    .lib-out-left { animation: lib-out-left 220ms ease forwards; }
    .lib-out-right { animation: lib-out-right 220ms ease forwards; }
  `;

  const pageHlCount = highlights.filter(h => h.pageNumber === currentPageData?.pageNumber).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bk-bg pt-safe"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <style>{BOOK_STYLES}{LIB_ANIM}</style>

      {/* TOC overlay */}
      {showToc && (
        <div className="absolute inset-0 z-20 flex flex-col bk-bg overflow-hidden pt-safe">
          <style>{BOOK_STYLES}</style>
          <div className="flex items-center justify-between px-5 py-4 border-b bk-sep shrink-0">
            <h2 className="bk-serif text-lg bk-ink font-bold">Índice</h2>
            <button onClick={() => setShowToc(false)} className="p-2.5 active:opacity-50"><X size={20} className="bk-muted" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-12">
            <div className="flex items-center gap-3 py-4 mb-2">
              <div className="h-px flex-1 opacity-20" style={{ background: "var(--bk-accent)" }} />
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold bk-accent">Páginas</span>
              <div className="h-px flex-1 opacity-20" style={{ background: "var(--bk-accent)" }} />
            </div>
            {pages.map((pg, idx) => {
              const isActive = idx === safeCurrentPage;
              // Use stored title from DB; fall back to extracting from content
              const rawTitle = pg.title || (() => {
                const paras = processContent(pg.content);
                const first = paras[0] ?? "";
                if (first.startsWith("# ")) return first.slice(2).trim();
                if (first.startsWith("## ")) return first.slice(3).trim();
                if (first.startsWith("### ")) return first.slice(4).trim();
                const isAllCaps = first === first.toUpperCase() && /[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/.test(first);
                if (first.length <= 80 && !/[.!?]$/.test(first.trim()) && (isAllCaps || first.length <= 50)) return first.trim();
                if (first.length <= 120) return first.slice(0, 60).trim() + (first.length > 60 ? "…" : "");
                return `Página ${pg.pageNumber}`;
              })();
              const isCompleted = !isActive && safeCurrentPage > idx;
              return (
                <button key={pg.pageNumber}
                  onClick={() => { goTo(idx, idx > safeCurrentPage ? "left" : "right"); setShowToc(false); }}
                  className="w-full flex items-start gap-3 py-3 border-b bk-sep active:opacity-60 text-left">
                  <span className="shrink-0 text-[11px] font-mono mt-0.5"
                    style={{ color: isActive ? "var(--bk-accent)" : isCompleted ? "var(--bk-muted)" : "var(--bk-muted)", minWidth: 28 }}>
                    {pg.pageNumber}
                  </span>
                  <span className={`bk-serif text-[13px] leading-snug flex-1 min-w-0 ${isActive ? "font-semibold" : isCompleted ? "opacity-50" : "bk-ink"}`}
                    style={isActive ? { color: "var(--bk-accent)" } : {}}>
                    {rawTitle}
                  </span>
                  {isActive && <span className="text-[9px] font-semibold uppercase tracking-wide shrink-0 self-center" style={{ color: "var(--bk-accent)" }}>atual</span>}
                  {isCompleted && !isActive && <CheckCircle2 size={13} className="shrink-0 self-center opacity-30 bk-muted" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Highlights panel */}
      {showHLPanel && (
        <div className="absolute inset-0 z-20 flex flex-col bk-bg overflow-hidden pt-safe">
          <style>{BOOK_STYLES}</style>
          <div className="flex items-center justify-between px-5 py-4 border-b bk-sep shrink-0">
            <div className="flex items-center gap-2">
              <Highlighter size={16} style={{ color: "var(--bk-accent)" }} />
              <h2 className="bk-serif text-lg bk-ink font-bold">As Tuas Marcações</h2>
            </div>
            <button onClick={() => setShowHLPanel(false)} className="p-2.5 active:opacity-50"><X size={20} className="bk-muted" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-12">
            {highlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 gap-3 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-30"
                  style={{ background: "var(--bk-accent-light)" }}>
                  <Highlighter size={20} style={{ color: "var(--bk-accent)" }} />
                </div>
                <p className="bk-serif text-base bk-ink opacity-60">Ainda não marcaste nada.</p>
                <p className="text-sm bk-muted text-center">Seleciona texto no livro e escolhe uma cor para sublinhar.</p>
              </div>
            ) : (
              <div>
                {highlights.map(hl => {
                  const colorBg = HL_COLORS[hl.color as HLColor]?.bg ?? "rgba(255,236,90,0.55)";
                  return (
                    <div key={hl.id} className="py-4 border-b bk-sep last:border-0">
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: colorBg }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "var(--bk-accent)" }}>
                            Página {hl.pageNumber}
                          </p>
                          <p className="bk-serif text-[14px] bk-ink leading-relaxed italic">"{hl.text}"</p>
                          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                            <p className="text-[11px] bk-muted">
                              {new Date(hl.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                            <button onClick={() => deleteHLMutation.mutate(hl.id)}
                              className="flex items-center gap-1 text-[10px] bk-muted active:opacity-50">
                              <Trash2 size={11} /> Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="shrink-0 overflow-hidden" style={{ maxHeight: immersive ? 0 : "6rem", transition: "max-height 0.3s ease" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b bk-sep bk-bg">
          <button onClick={onClose} data-testid="btn-lib-reader-close" className="p-2.5 active:opacity-50">
            <X size={22} className="bk-muted" />
          </button>
          <div className="text-center flex-1 px-2">
            <p className="text-[10px] uppercase tracking-[0.2em] bk-muted font-semibold truncate">{bookTitle}</p>
            {bookAuthor && <p className="text-[9px] bk-muted opacity-70 truncate">{bookAuthor}</p>}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setShowHLPanel(true)} data-testid="btn-lib-highlights-panel"
              className="p-2.5 active:opacity-50 relative">
              <Highlighter size={18} className="bk-muted" />
              {highlights.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full text-[8px] font-bold flex items-center justify-center px-0.5"
                  style={{ background: "var(--bk-accent)", color: "var(--bk-bg)" }}>
                  {highlights.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowToc(true)} data-testid="btn-lib-toc" className="p-2.5 active:opacity-50">
              <AlignLeft size={20} className="bk-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 overflow-hidden" style={{ maxHeight: immersive ? 0 : "4px", transition: "max-height 0.3s ease" }}>
        <div className="h-[2px]" style={{ background: "var(--bk-sep)" }}>
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "var(--bk-accent)" }} />
        </div>
      </div>

      {/* Page counter (immersive) */}
      {immersive && totalPages > 0 && (
        <div className="absolute top-3 right-4 z-10 text-[10px] bk-muted opacity-50">
          {safeCurrentPage + 1}/{totalPages}
        </div>
      )}

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto"
        onClick={() => { if (!pendingHL) setImmersive(v => !v); }}>
        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--bk-accent)", animationDelay: `${i*0.15}s` }} />)}
            </div>
          </div>
        )}
        {!isLoading && totalPages === 0 && (
          <div className="flex flex-col items-center justify-center h-60 gap-4 px-8 text-center">
            <BookOpen size={36} className="bk-muted opacity-40" />
            <p className="bk-serif text-base bk-ink opacity-60">Este livro ainda não tem páginas processadas.</p>
            <p className="text-sm bk-muted">O administrador precisa de carregar o PDF.</p>
          </div>
        )}
        {!isLoading && totalPages > 0 && (
          <div ref={contentRef}
            className={`px-6 py-8 mx-auto ${animDir === "left" ? "lib-out-left" : animDir === "right" ? "lib-out-right" : ""}`}
            style={{ maxWidth: 680, width: "100%" }}>
            {/* Page title and tag from database */}
            {(currentPageData?.tag || currentPageData?.title) && (
              <div className="text-center mb-7 mt-1">
                {currentPageData.tag && (
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: "var(--bk-accent)", opacity: 0.75 }}>
                    {currentPageData.tag}
                  </p>
                )}
                {currentPageData.title && (
                  <div style={{ borderTop: "2px solid var(--bk-accent)", borderBottom: "2px solid var(--bk-accent)", padding: "10px 0" }}>
                    <h2 className="bk-serif font-black bk-ink uppercase leading-tight"
                      style={{ fontSize: currentPageData.title.length > 60 ? 14 : currentPageData.title.length > 40 ? 16 : 19, letterSpacing: "0.04em" }}>
                      {currentPageData.title}
                    </h2>
                    {currentPageData.subtitle && (
                      <p className="bk-serif bk-muted italic mt-1.5" style={{ fontSize: 13 }}>
                        {currentPageData.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {parseLibPageContent(paragraphs).map((block, bi) => {
              if (block.type === "h1") return (
                <div key={bi} className="text-center py-3 mb-6 mt-2"
                  style={{ borderTop: "2px solid var(--bk-accent)", borderBottom: "2px solid var(--bk-accent)" }}>
                  <h2 className="bk-serif font-black bk-ink uppercase leading-tight"
                    style={{ fontSize: block.text.length > 60 ? 13 : block.text.length > 40 ? 15 : 18, letterSpacing: "0.04em" }}>
                    {block.text}
                  </h2>
                </div>
              );
              if (block.type === "h2") return (
                <h3 key={bi} className="bk-serif font-bold bk-ink mt-6 mb-2"
                  style={{ fontSize: 15, letterSpacing: "0.02em", textTransform: "uppercase", opacity: 0.85 }}>
                  {block.text}
                </h3>
              );
              if (block.type === "h3") return (
                <h4 key={bi} className="bk-serif font-semibold bk-ink mt-4 mb-1"
                  style={{ fontSize: 14, fontStyle: "italic" }}>
                  {block.text}
                </h4>
              );
              if (block.type === "bullet") return (
                <ul key={bi} className="bk-serif bk-ink mb-5 ml-4" style={{ listStyleType: "disc" }}>
                  {block.items.map((item, ii) => (
                    <li key={ii} data-para-idx={block.startIdx + ii}
                      style={{ fontSize: 16, lineHeight: 1.72, marginBottom: ii < block.items.length - 1 ? "0.5em" : 0 }}>
                      {renderPara(item, block.startIdx + ii)}
                    </li>
                  ))}
                </ul>
              );
              if (block.type === "dica") return (
                <div key={bi} className="rounded-xl mb-5" style={{ border: "1px solid var(--bk-sep)", background: "var(--bk-bg)", padding: "14px 16px" }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: "var(--bk-accent)" }}>Dica do Dia</p>
                  {block.instruction && <p className="bk-serif text-[13px] bk-ink leading-snug mb-1">{block.instruction}</p>}
                  {block.quote && <p className="bk-serif text-[14px] font-bold bk-ink italic">"{block.quote}"</p>}
                </div>
              );
              if (block.type === "oracao") return (
                <div key={bi} className="rounded-xl mb-5 mt-4" style={{ border: "1px solid var(--bk-sep)", padding: "14px 16px" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 opacity-30" style={{ background: "var(--bk-accent)" }} />
                    <span className="bk-serif font-black text-[12px] uppercase tracking-[0.18em] bk-ink">Momento de Oração</span>
                    <div className="h-px flex-1 opacity-30" style={{ background: "var(--bk-accent)" }} />
                  </div>
                  {block.lines.map((p, li) => (
                    <p key={li} data-para-idx={li}
                      className="bk-serif bk-ink"
                      style={{ fontSize: 15, lineHeight: 1.75, marginBottom: li < block.lines.length - 1 ? "0.75em" : 0 }}>
                      {renderPara(p, li)}
                    </p>
                  ))}
                </div>
              );
              // Regular paragraph
              return (
                <p key={bi} data-para-idx={block.idx}
                  className="bk-serif bk-ink leading-relaxed mb-5"
                  style={{ fontSize: 17, lineHeight: 1.72, textAlign: "justify", hyphens: "auto",
                    textIndent: block.idx === 0 ? "0" : "1.6em" } as React.CSSProperties}>
                  {renderPara(block.text, block.idx)}
                </p>
              );
            })}
          </div>
        )}
      </div>

      {/* Lock banner — shown on last free page when book requires premium */}
      {libLocked && safeCurrentPage === totalPages - 1 && (
        <div className="shrink-0 mx-4 mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--bk-sep)", background: "var(--bk-bg)" }}>
          <div className="px-4 py-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: "var(--bk-ink)" }}>Continuar lendo</span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--bk-muted)" }}>
              Este livro tem {libTotalPages} capítulos no total. Os restantes {libTotalPages - totalPages} estão disponíveis para membros Premium.
            </p>
            <a href="/premium" className="inline-block mt-1 px-5 py-2.5 rounded-full text-xs font-semibold text-white" style={{ background: "var(--bk-accent)" }}>
              Ver plano Premium
            </a>
          </div>
        </div>
      )}

      {/* Highlight toolbar (new selection) */}
      {pendingHL && (
        <div data-hl-toolbar
          className="fixed z-30 flex items-center gap-1 px-3 py-2 rounded-2xl shadow-lg"
          style={{
            background: "var(--bk-bg)",
            border: "1px solid var(--bk-sep)",
            left: clampX(pendingHL.rect.left + pendingHL.rect.width / 2) - 120,
            top: pendingHL.rect.top < 70 ? pendingHL.rect.bottom + 10 : pendingHL.rect.top - 52,
            minWidth: 240,
          }}>
          {(Object.entries(HL_COLORS) as [HLColor, typeof HL_COLORS[HLColor]][]).map(([color, cfg]) => (
            <button key={color}
              onClick={() => {
                if (!currentPageData) return;
                saveHLMutation.mutate({
                  bookId,
                  pageNumber: currentPageData.pageNumber,
                  paraIndex: pendingHL.paraIndex,
                  startOffset: pendingHL.startOffset,
                  endOffset: pendingHL.endOffset,
                  text: pendingHL.text,
                  color,
                });
                setPendingHL(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="w-6 h-6 rounded-full border-2 border-white/60 shadow-sm active:scale-110 transition-transform"
              style={{ background: cfg.bg }}
              title={cfg.label}
            />
          ))}
          <div className="w-px h-4 mx-1" style={{ background: "var(--bk-sep)" }} />
          <button onClick={() => { setPendingHL(null); window.getSelection()?.removeAllRanges(); }}
            className="p-1 active:opacity-50"><X size={14} className="bk-muted" /></button>
        </div>
      )}

      {/* Highlight tooltip (delete existing) */}
      {activeHLId !== null && activeHLPos && (
        <div data-hl-tooltip
          className="fixed z-30 flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg"
          style={{ background: "var(--bk-bg)", border: "1px solid var(--bk-sep)", left: clampX(activeHLPos.x) - 60, top: activeHLPos.y < 70 ? activeHLPos.y + 30 : activeHLPos.y - 44 }}>
          <button onClick={() => { deleteHLMutation.mutate(activeHLId!); setActiveHLId(null); setActiveHLPos(null); }}
            className="flex items-center gap-1.5 text-[12px] bk-muted active:opacity-50">
            <Trash2 size={13} /> Remover marcação
          </button>
        </div>
      )}

      {/* Bottom navigation */}
      {!isLoading && totalPages > 0 && (
        <div className="shrink-0 overflow-hidden" style={{ maxHeight: immersive ? 0 : "5rem", transition: "max-height 0.3s ease" }}>
          <div className="flex items-center justify-between px-5 py-3 border-t bk-sep bk-bg">
            <button onClick={() => goTo(safeCurrentPage - 1, "right")} disabled={safeCurrentPage === 0}
              className="flex items-center gap-1.5 text-sm disabled:opacity-30 active:opacity-50"
              style={{ color: "var(--bk-accent)" }}
              data-testid="btn-lib-prev">
              <ChevronLeft size={18} /> Anterior
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] bk-muted">{safeCurrentPage + 1}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(libTotalPages, 7) }, (_, i) => {
                  const pi = libTotalPages <= 7 ? i : Math.round(i * (libTotalPages - 1) / 6);
                  const isActive = pi === safeCurrentPage;
                  const isLocked = libLocked && pi >= totalPages;
                  return (
                    <button key={i} onClick={() => !isLocked && goTo(pi, pi > safeCurrentPage ? "left" : "right")}
                      className="rounded-full transition-all"
                      style={{ width: isActive ? 14 : 6, height: 6, background: isActive ? "var(--bk-accent)" : isLocked ? "var(--bk-sep)" : "var(--bk-sep)", opacity: isLocked ? 0.35 : 1 }} />
                  );
                })}
              </div>
              <span className="text-[11px] bk-muted">{libTotalPages}</span>
            </div>
            <button onClick={() => goTo(safeCurrentPage + 1, "left")} disabled={safeCurrentPage === totalPages - 1 || (libLocked && safeCurrentPage >= totalPages - 1)}
              className="flex items-center gap-1.5 text-sm disabled:opacity-30 active:opacity-50"
              style={{ color: "var(--bk-accent)" }}
              data-testid="btn-lib-next">
              Próxima <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────── */
export default function Book() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hasPremium = (user as any)?.hasPremium ?? false;
  const [activeTab, setActiveTab] = useState<"sobre" | "ler" | "biblioteca">("ler");
  const [readerStartIdx, setReaderStartIdx] = useState<number | null>(null);
  const [readerKey, setReaderKey] = useState(0);
  const [readerOpenToc, setReaderOpenToc] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  function readSavedProgress() {
    try {
      const saved = localStorage.getItem("bk-progress");
      return saved ? JSON.parse(saved) as { ch: number; sp: number; pct: number; title: string } : null;
    } catch { return null; }
  }
  const [savedProgress, setSavedProgress] = useState(() => readSavedProgress());

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery<Chapter[]>({
    queryKey: ["/api/book/chapters"],
    staleTime: 0,
    queryFn: async () => {
      const r = await fetch("/api/book/chapters", { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: purchaseStatus } = useQuery<PurchaseStatus>({
    queryKey: ["/api/book/purchase-status"],
    queryFn: async () => {
      const r = await fetch("/api/book/purchase-status", { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
  });

  const purchased = purchaseStatus?.purchased ?? false;
  const priceLabel = purchaseStatus?.pricesCents ? formatPrice(purchaseStatus.pricesCents) : "R$\u00a019,90";

  type LibBook = { id: number; title: string; author: string; description: string; coverImageData: string | null; priceDisplay: string; priceInCents: number; requiresPremium: boolean; isPublished: boolean; freePages: number; pageCount: number };
  const { data: libBooks = [], isLoading: libLoading } = useQuery<LibBook[]>({
    queryKey: ["/api/library/books"],
    queryFn: async () => {
      const r = await fetch("/api/library/books", { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: activeTab === "biblioteca",
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const [libReaderBook, setLibReaderBook] = useState<{ id: number; title: string; author: string } | null>(null);

  // Sort chapters: front-matter first (by order), then chapters
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  const freeChapters = sortedChapters.filter(c => c.isPreview && c.pageType === "chapter");

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("open") !== "today") return;
    if (sortedChapters.length === 0 || purchaseStatus === undefined) return;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const idx = sortedChapters.findIndex(c => c.order === dayOfYear);
    if (idx !== -1) {
      autoOpenedRef.current = true;
      const ch = sortedChapters[idx];
      if (!purchased && !ch.isPreview) { setShowPurchaseModal(true); }
      else {
        setReaderKey(k => k + 1);
        setReaderOpenToc(false);
        setReaderStartIdx(idx);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [sortedChapters, purchaseStatus, purchased]);

  function openChapter(idx: number) {
    const ch = sortedChapters[idx];
    if (!ch) return;
    if (!purchased && !ch.isPreview) { setShowPurchaseModal(true); return; }
    setReaderKey(k => k + 1);
    setReaderOpenToc(false);
    setReaderStartIdx(idx);
  }

  function openReader(startIdx?: number, showToc = false) {
    setReaderOpenToc(showToc);
    setReaderKey(k => k + 1);
    if (startIdx !== undefined) {
      setReaderStartIdx(startIdx);
    } else {
      // Restore saved progress
      try {
        const saved = localStorage.getItem("bk-progress");
        const { ch } = saved ? JSON.parse(saved) : { ch: 0 };
        setReaderStartIdx(typeof ch === "number" && ch < sortedChapters.length ? ch : 0);
      } catch {
        setReaderStartIdx(0);
      }
    }
  }

  function handlePurchaseSuccess() {
    setShowPurchaseModal(false);
    queryClient.invalidateQueries({ queryKey: ["/api/book/purchase-status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/book/chapters"] });
  }

  const tagGradients: Record<string, string> = {
    "ESSENCIAL":   "linear-gradient(135deg,#c9bfb0 0%,#7a6e64 100%)",
    "TRANSIÇÃO":   "linear-gradient(135deg,#b8c4ce 0%,#5c6e7a 100%)",
    "IDENTIDADE":  "linear-gradient(135deg,#c8bdd4 0%,#6e5c7a 100%)",
    "AMOR":        "linear-gradient(135deg,#d4bdb8 0%,#7a5c5c 100%)",
    "CRESCIMENTO": "linear-gradient(135deg,#b8cec4 0%,#5c7a6e 100%)",
    "PROPÓSITO":   "linear-gradient(135deg,#cec4b8 0%,#7a6e5c 100%)",
  };

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-700 overflow-x-hidden">
      <style>{BOOK_STYLES}</style>
      <div className="px-6 md:px-10 pt-1 pb-28">

        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif text-foreground">O Livro</h1>
          <Bookmark size={20} className="text-muted-foreground" />
        </header>

        {/* Tabs */}
        <div className="flex gap-1 bg-border/60 rounded-xl p-1 mb-8">
          <button onClick={() => setActiveTab("sobre")} data-testid="tab-sobre"
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "sobre" ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground/70"}`}>
            Sobre
          </button>
          <button onClick={() => setActiveTab("ler")} data-testid="tab-ler"
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === "ler" ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground/70"}`}>
            <BookMarked size={14} /> Devocional
          </button>
          <button onClick={() => { setActiveTab("biblioteca"); setLibReaderBook(null); }} data-testid="tab-biblioteca"
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === "biblioteca" ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground/70"}`}>
            <Library size={14} /> Biblioteca
          </button>
        </div>

        {/* ── TAB: SOBRE ── */}
        {activeTab === "sobre" && (
          <div>
            {/* Cover */}
            <div className="flex flex-col items-center mb-10">
              <div className="w-44 h-60 rounded-r-xl rounded-l-sm shadow-2xl shadow-primary/20 overflow-hidden relative border-l-[6px] border-primary/30 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                <img src={bookCover} alt="365 Encontros com Deus Pai" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
              </div>
              <h2 className="mt-8 font-serif text-2xl text-center text-foreground tracking-tight">365 Encontros com Deus Pai</h2>
              <p className="text-sm text-muted-foreground text-center mt-2 italic font-serif">Um devocional diário para cada dia do ano</p>
              <p className="text-xs text-primary/70 font-medium uppercase tracking-widest mt-4">Por Jun Date</p>
            </div>

            {/* Access status */}
            {purchased ? (
              <div className="mb-8 bg-green-600/15 border border-green-600/30 rounded-2xl p-4 flex items-center gap-3 dark:bg-green-500/10 dark:border-green-500/20">
                <CheckCircle2 size={20} className="text-green-700 dark:text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-400">Livro desbloqueado</p>
                  <p className="text-xs text-foreground/60">Tens acesso completo a todos os capítulos.</p>
                </div>
                <button onClick={() => openReader()} data-testid="btn-read-now"
                  className="text-xs px-4 py-2 rounded-xl font-semibold text-white shrink-0 whitespace-nowrap active:scale-95 transition-transform"
                  style={{ background: "var(--bk-accent)" }}>
                  Continuar
                </button>
              </div>
            ) : (
              <div className="mb-8 bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Ler todos os 365 dias no App</p>
                    <p className="text-xs text-muted-foreground">Acesso permanente · 7 dias grátis para experimentar</p>
                  </div>
                  <span className="text-lg font-bold text-primary">{priceLabel}</span>
                </div>
                <button onClick={() => setShowPurchaseModal(true)} data-testid="btn-buy-book-in-app"
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                  <BookOpen size={16} /> Comprar e Ler Agora
                </button>
              </div>
            )}

            {/* Free chapters cards */}
            {freeChapters.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg text-foreground">Reflexões do Livro</h3>
                  <BookOpen size={17} className="text-muted-foreground" />
                </div>
                <div className="space-y-4">
                  {freeChapters.map((chapter) => {
                    const idx = sortedChapters.findIndex(c => c.id === chapter.id);
                    const grad = tagGradients[chapter.tag?.toUpperCase() ?? ""] ?? "linear-gradient(135deg,#c9bfb0 0%,#7a6e64 100%)";
                    return (
                      <button key={chapter.id} onClick={() => openChapter(idx)}
                        data-testid={`card-free-ch-${chapter.id}`}
                        className="w-full text-left bg-card border border-border rounded-2xl overflow-hidden active:scale-[0.99] transition-transform shadow-sm">
                        <div className="h-28 w-full relative overflow-hidden" style={{ background: grad }}>
                          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(ellipse at 30% 50%,rgba(255,255,255,0.6) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(0,0,0,0.3) 0%,transparent 50%)" }} />
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
                        </div>
                        <div className="px-5 pt-3 pb-4">
                          {chapter.tag && <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1.5">{chapter.tag}</p>}
                          <h4 className="font-serif text-base text-foreground mb-2 leading-snug" style={{ overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 } as React.CSSProperties}>{chapter.title}</h4>
                          {chapter.excerpt && <p className="text-sm text-muted-foreground italic leading-relaxed mb-3">"{chapter.excerpt}"</p>}
                          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--bk-accent)" }}>
                            Ler Reflexão <ChevronRight size={13} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-foreground">Testemunhos de quem leu</h3>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} size={13} className="fill-amber-400 text-amber-400" />)}
                </div>
              </div>
              <div className="space-y-3">
                {([
                  {
                    name: "Ana Paula Ferreira",
                    title: "O Pai falou comigo em cada página",
                    text: "Comecei no início do ano e não consegui parar. Cada dia traz uma palavra que parece que o próprio Deus Pai escreveu para o meu coração. Jun Date tem um dom único de tornar a presença de Deus tão próxima e real. Gloria a Deus por este devocional!",
                    date: "8 de janeiro de 2026",
                  },
                  {
                    name: "Carlos Mendes",
                    title: "O Espírito Santo age através destas páginas",
                    text: "Já li muitos devocionais ao longo dos anos, mas este é ungido de um jeito diferente. As reflexões são curtas mas tocam fundo no espírito. O momento de oração ao final de cada dia transformou a minha vida de intimidade com o Pai. Que Deus abençoe abundantemente o irmão Jun Date!",
                    date: "3 de fevereiro de 2026",
                  },
                  {
                    name: "Mariana Costa",
                    title: "Presente que edifica toda a família na fé",
                    text: "Dei de presente para a minha mãe, a minha irmã e a minha cunhada. Todas se apaixonaram! É um livro que une a família em torno da Palavra viva de Deus. As dicas do dia são práticas e cheias de sabedoria bíblica. Leitura indispensável para quem quer crescer no Senhor.",
                    date: "15 de março de 2026",
                  },
                  {
                    name: "José Roberto Lima",
                    title: "365 encontros que renovaram a minha fé",
                    text: "Li todos os dias sem falhar durante um ano inteiro. Cada devocional é uma conversa íntima e real com o Pai Celestial. Aprendi que Deus está presente em cada detalhe da minha vida, até nos dias mais simples e comuns. Uma obra que carrego comigo para sempre, com gratidão ao Senhor.",
                    date: "27 de dezembro de 2025",
                  },
                ] as { name: string; title: string; text: string; date: string }[]).map((review, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{review.name}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} size={11} className="fill-amber-400 text-amber-400" />)}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{review.date}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground italic">"{review.title}"</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Author */}
            <div className="bg-card rounded-3xl p-6 border border-border flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden border-2 border-background shadow-md flex items-center justify-center">
                <span className="font-serif text-2xl font-bold text-primary">J</span>
              </div>
              <div>
                <h3 className="font-serif text-base text-foreground">Jun Date</h3>
                <p className="text-xs text-muted-foreground mt-1">Autor de "365 Encontros com Deus Pai" — pastor e escritor cristão comprometido com a renovação espiritual diária.</p>
              </div>
              <button onClick={() => window.open("https://www.instagram.com/jundate/","_blank")}
                className="w-full py-2.5 text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ background: "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)" }}
                data-testid="btn-author-instagram">
                <Instagram size={16} /> @jundate
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: LER LIVRO ── */}
        {activeTab === "ler" && (
          <div>
            {/* Reading progress card — purchased user with progress */}
            {purchased && savedProgress && typeof savedProgress.pct === "number" && savedProgress.pct > 0 && (
              <div className="mb-6 bg-card border border-border rounded-2xl p-4 space-y-3" data-testid="card-reading-progress">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={15} style={{ color: "var(--bk-accent)" }} />
                    <p className="text-sm font-semibold text-foreground">O teu progresso</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "var(--bk-accent)" }}>
                    {savedProgress.pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${savedProgress.pct}%`, background: "var(--bk-accent)" }}
                  />
                </div>
                {savedProgress.title && (
                  <p className="text-xs text-muted-foreground truncate">
                    A ler: <span className="italic">{savedProgress.title.charAt(0).toUpperCase() + savedProgress.title.slice(1).toLowerCase()}</span>
                  </p>
                )}
                <button onClick={() => openReader()} data-testid="btn-continue-reading"
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  style={{ background: "var(--bk-accent)" }}>
                  <ChevronRight size={14} /> Continuar a Ler
                </button>
              </div>
            )}

            {/* Start reading card — purchased user with no progress yet */}
            {purchased && (!savedProgress || !(savedProgress.pct > 0)) && (
              <div className="mb-6 bg-green-600/15 border border-green-600/30 rounded-2xl p-4 flex items-center gap-3 dark:bg-green-500/10 dark:border-green-500/20" data-testid="card-start-reading">
                <CheckCircle2 size={20} className="text-green-700 dark:text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-400">Livro desbloqueado</p>
                  <p className="text-xs text-foreground/60">Tens acesso completo a todos os capítulos.</p>
                </div>
                <button onClick={() => openReader()} data-testid="btn-start-reading"
                  className="text-xs px-4 py-2 rounded-xl font-semibold text-white shrink-0 whitespace-nowrap active:scale-95 transition-transform"
                  style={{ background: "var(--bk-accent)" }}>
                  Começar
                </button>
              </div>
            )}

            {/* Buy banner */}
            {!purchased && (
              <div className="mb-6 bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Acesso completo por {priceLabel}</p>
                  <p className="text-xs text-muted-foreground">7 dias gratuitos · depois acesso permanente</p>
                </div>
                <button onClick={() => setShowPurchaseModal(true)} data-testid="btn-buy-ler-tab"
                  className="text-xs px-3 py-2 bg-primary text-primary-foreground rounded-xl font-semibold shrink-0 active:scale-95 transition-transform">
                  Comprar
                </button>
              </div>
            )}

            {/* Open reader from TOC */}
            <button onClick={() => openReader(undefined, true)} data-testid="btn-open-toc"
              className="w-full mb-5 p-4 border border-border bg-card rounded-2xl flex items-center gap-3 active:scale-[0.99] transition-transform">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--bk-accent-light)" }}>
                <AlignLeft size={16} style={{ color: "var(--bk-accent)" }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Ver Índice Completo</p>
                <p className="text-xs text-muted-foreground">{sortedChapters.filter(c=>c.pageType==="chapter").length} capítulos · sumário · introdução · dedicatória</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>

            {/* Chapter list */}
            {chaptersLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="h-[68px] bg-muted rounded-2xl animate-pulse"/>)}</div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {sortedChapters.map((chapter, idx) => {
                  const isLocked = !purchased && !chapter.isPreview;
                  const isFM = chapter.pageType === "front-matter" || chapter.pageType === "epilogue";
                  return (
                    <button key={chapter.id} onClick={() => openChapter(idx)}
                      data-testid={`chapter-read-${chapter.id}`}
                      className="w-full flex items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40 active:bg-muted">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={isLocked ? {} : { background: "var(--bk-accent-light)" }}>
                        {isLocked ? (
                          <LockKeyhole size={14} className="text-muted-foreground" />
                        ) : isFM ? (
                          <BookMarked size={14} style={{ color: "var(--bk-accent)" }} />
                        ) : (
                          <span className="text-[10px] font-bold font-mono" style={{ color: "var(--bk-accent)" }}>{chapter.order}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {chapter.tag && <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5 truncate" style={{ color: "var(--bk-accent)" }}>{chapter.tag}</p>}
                        <p className={`text-sm font-serif font-semibold ${isLocked ? "text-muted-foreground" : "text-foreground"}`}
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                          {chapter.title}
                        </p>
                        {chapter.excerpt && (
                          <p className={`text-xs text-muted-foreground mt-0.5 truncate ${isLocked ? "blur-[2px] select-none" : ""}`}>
                            {chapter.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 ml-2">
                        {chapter.isPreview ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--bk-accent-light)", color: "var(--bk-accent)" }}>Grátis</span>
                        ) : isLocked ? (
                          <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Bloqueado</span>
                        ) : (
                          <ChevronRight size={15} className="text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Book reader overlay */}
      {readerStartIdx !== null && sortedChapters.length > 0 && (
        <BookReader
          key={readerKey}
          chapters={sortedChapters}
          startIdx={readerStartIdx}
          purchased={purchased}
          openToc={readerOpenToc}
          onClose={() => { setReaderStartIdx(null); setReaderOpenToc(false); setSavedProgress(readSavedProgress()); }}
          onBuy={() => { setReaderStartIdx(null); setReaderOpenToc(false); setSavedProgress(readSavedProgress()); setShowPurchaseModal(true); }}
        />
      )}

      {/* ── LIBRARY READER ── */}
      {libReaderBook && (
        <LibraryReader
          bookId={libReaderBook.id}
          bookTitle={libReaderBook.title}
          bookAuthor={libReaderBook.author}
          onClose={() => setLibReaderBook(null)}
        />
      )}

      {/* ── TAB: BIBLIOTECA ── */}
      {activeTab === "biblioteca" && !readerStartIdx && (
        <div className="px-6 md:px-10 pt-4 pb-10">
          {/* ── Empty state ── */}
          {!libLoading && libBooks.length === 0 && (
            <div className="rounded-2xl flex flex-col items-center justify-center py-16 gap-3 bg-muted/30">
              <div className="w-14 h-20 rounded-md bg-muted/60 flex items-center justify-center">
                <Library size={22} className="text-muted-foreground/40" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Nenhum livro disponível</p>
                <p className="text-xs text-muted-foreground/60">Em breve terás acesso a recursos e leituras.</p>
              </div>
            </div>
          )}

          {/* ── Loading skeleton ── */}
          {libLoading && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="w-full rounded-md bg-muted" style={{ aspectRatio: "2/3" }} />
                  <div className="h-2.5 bg-muted rounded w-4/5" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* ── Book grid — fills downward ── */}
          {!libLoading && libBooks.length > 0 && (
            <div className={libBooks.length === 1 ? "flex justify-center" : "grid grid-cols-2 gap-x-6 gap-y-8"}>
              {libBooks.map(book => {
                const isFree = book.priceInCents === 0 && !book.requiresPremium;
                const isLocked = book.requiresPremium ? !hasPremium : book.priceInCents > 0;
                const hasProgress = (() => {
                  try { const s = localStorage.getItem(`lib-prog-${book.id}`); return s ? JSON.parse(s).p > 0 : false; } catch { return false; }
                })();
                const progressPage = (() => {
                  try { const s = localStorage.getItem(`lib-prog-${book.id}`); return s ? JSON.parse(s).p : 0; } catch { return 0; }
                })();
                const progressPct = book.pageCount > 0 ? Math.round(((progressPage + 1) / book.pageCount) * 100) : 0;

                return (
                  <div
                    key={book.id}
                    className={`flex flex-col cursor-pointer group min-w-0 ${libBooks.length === 1 ? "w-44" : ""}`}
                    onClick={() => {
                      if (!isLocked || (book.freePages > 0 && book.pageCount > 0)) {
                        setLibReaderBook({ id: book.id, title: book.title, author: book.author });
                      }
                    }}
                    data-testid={`card-lib-${book.id}`}
                  >
                    {/* Cover */}
                    <div
                      className="relative w-full overflow-hidden rounded-sm"
                      style={{ aspectRatio: "2/3", boxShadow: "3px 5px 12px rgba(0,0,0,0.38)" }}
                    >
                      {book.coverImageData ? (
                        <img
                          src={`data:image/jpeg;base64,${book.coverImageData}`}
                          alt={book.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                          style={{
                            background: "linear-gradient(135deg, hsl(var(--primary)/0.18) 0%, hsl(var(--primary)/0.08) 100%)",
                            borderLeft: "3px solid hsl(var(--primary)/0.25)",
                          }}
                        >
                          <Library size={18} className="text-primary/30" />
                          <span className="text-[8px] font-bold text-primary/25 uppercase tracking-wider px-2 text-center leading-tight line-clamp-3">{book.title}</span>
                        </div>
                      )}

                      {/* Spine shadow */}
                      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-[2px]" style={{ background: "linear-gradient(90deg,rgba(0,0,0,0.22) 0%,rgba(0,0,0,0.03) 100%)" }} />

                      {/* Lock overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 rounded-r-sm rounded-l-[2px] flex flex-col items-center justify-center gap-0.5" style={{ background: "rgba(0,0,0,0.52)" }}>
                          <LockKeyhole size={16} className="text-white/90" />
                          {book.requiresPremium && <span className="text-[7px] font-bold text-amber-300 uppercase tracking-wider">Premium</span>}
                          {!book.requiresPremium && book.priceInCents > 0 && <span className="text-[8px] font-bold text-white/90">{book.priceDisplay}</span>}
                        </div>
                      )}

                      {/* Progress bar at bottom of cover */}
                      {!isLocked && hasProgress && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden bg-black/30">
                          <div className="h-full bg-primary" style={{ width: `${progressPct}%` }} />
                        </div>
                      )}
                    </div>

                    {/* Info below cover */}
                    <div className="pt-1.5 space-y-1">
                      <p className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2">{book.title}</p>

                      {/* Status line */}
                      {isFree && !hasProgress && (
                        <span className="text-[9px] font-semibold text-emerald-500">Grátis</span>
                      )}
                      {!isLocked && hasProgress && (
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-[3px] rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-[8px] text-primary font-bold">{progressPct}%</span>
                        </div>
                      )}
                      {isLocked && (
                        <div className="flex gap-1">
                          {book.freePages > 0 && book.pageCount > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); setLibReaderBook({ id: book.id, title: book.title, author: book.author }); }}
                              className="flex-1 py-0.5 rounded bg-muted text-[7px] font-medium text-foreground"
                              data-testid={`btn-lib-preview-${book.id}`}
                            >Amostra</button>
                          )}
                          <button
                            onClick={e => e.stopPropagation()}
                            className="flex-1 py-0.5 rounded bg-primary text-primary-foreground text-[7px] font-bold"
                            data-testid={`btn-lib-buy-${book.id}`}
                          >{book.requiresPremium ? "Premium" : "Comprar"}</button>
                        </div>
                      )}
                      {!isLocked && !hasProgress && !isFree && (
                        <span className="text-[9px] text-emerald-600 font-semibold">Desbloqueado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showPurchaseModal && (
        <BookPurchaseModal
          priceLabel={priceLabel}
          onSuccess={handlePurchaseSuccess}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}
    </div>
  );
}
