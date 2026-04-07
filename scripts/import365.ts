/**
 * Import "365 Encontros com Deus Pai" from pdftotext -layout output.
 */
import fs from "fs";
import { db } from "../server/db";
import { bookChapters } from "../shared/schema";

const FILE = "/tmp/365_book.txt";

const MONTH_NUMS: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
};
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function toDOY(monthAbbr: string, day: number): number {
  const m = MONTH_NUMS[monthAbbr];
  if (!m) return -1;
  let d = 0;
  for (let i = 0; i < m - 1; i++) d += DAYS_IN_MONTH[i];
  return d + day;
}

function dequote(s: string): string {
  return s.replace(/[\u201c\u201d"]/g, "").trim();
}

function indent(line: string): number {
  return line.length - line.trimStart().length;
}

function isReference(t: string): boolean {
  return (
    /^[A-ZÁÉÍÓÚ][a-záéíóú][\w\s,.çãõéíóúâêîôûàèìùÃÕÂÊÎÔÛÇ]*\d+[,.:]\s*\d+/.test(t) ||
    /^[A-ZÁÉÍÓÚ][a-záéíóú]+[\s,]+\d+$/.test(t)
  );
}

interface Day {
  doy: number;
  dayNum: number;
  month: string;
  verse: string;
  reference: string;
  title: string;
  content: string;
  tip: string;
  prayer: string;
}

function parsePage(page: string): Day | null {
  const lines = page.split("\n");

  // ── 1. Find day number line (low indent, 2-digit 01-31) ──
  let dayLineIdx = -1;
  let dayNum = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const m = lines[i].match(/^( {2,10})(\d{2})\b/);
    if (m) {
      const n = parseInt(m[2], 10);
      if (n >= 1 && n <= 31) { dayLineIdx = i; dayNum = n; break; }
    }
  }
  if (dayLineIdx === -1) return null;

  // ── 2. Find month abbreviation in next 5 lines ──
  let month = "";
  let monthLineIdx = -1;
  for (let i = dayLineIdx; i < Math.min(dayLineIdx + 5, lines.length); i++) {
    const trimmed = lines[i].trimStart();
    const m = trimmed.match(/^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\b/);
    if (m) { month = m[1]; monthLineIdx = i; break; }
  }
  if (!month) return null;

  const doy = toDOY(month, dayNum);
  if (doy < 1 || doy > 365) return null;

  // ── 3. Extract inline verse text from day line and month line ──
  const rawVerseLines: string[] = [];
  const dayRight = lines[dayLineIdx].replace(/^ {2,10}\d{2}\s*/, "").trim();
  if (dayRight) rawVerseLines.push(dayRight);

  const monthRight = lines[monthLineIdx].replace(/^ {2,10}(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*/, "").trim();
  if (monthRight) rawVerseLines.push(monthRight);

  // ── 4. Pass through remaining lines in one clean loop ──
  let reference = "";
  const titleLines: string[] = [];
  const bodyLines: string[] = [];
  const tipLines: string[] = [];
  const prayerLines: string[] = [];

  // Track which phase we're in
  // verse → title → body → tip → prayer
  let phase: "verse" | "title" | "body" | "tip" | "prayer" = "verse";

  for (let i = monthLineIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    const ind = indent(raw);

    // Skip page-number-only lines (very high indent)
    if (/^\d{1,3}$/.test(t) && ind > 40) continue;

    // Section markers
    if (/^Dica do dia$/i.test(t))              { phase = "tip";    continue; }
    if (/^Momento de ora[çc][aã]o$/i.test(t)) { phase = "prayer"; continue; }

    if (phase === "tip")    { if (t) tipLines.push(t);    continue; }
    if (phase === "prayer") { if (t) prayerLines.push(t); continue; }

    if (phase === "verse") {
      if (t === "") continue;
      if (ind > 20) {
        // Right column → verse text or reference
        if (isReference(t)) {
          reference = t;
          phase = "title"; // reference ends the verse
        } else {
          rawVerseLines.push(t);
        }
      } else {
        // Left column appears — verse is done (or this IS prose starting)
        if (rawVerseLines.length > 0 || reference) {
          phase = "title";
          // Process this line in title phase below (fall through via goto-like logic)
        }
        // If we haven't collected any verse yet, skip (likely front-matter artifacts)
        else { continue; }
      }
      if (phase === "verse") continue; // still in verse, move to next line
      // If we just switched to title, fall through intentionally to handle the current line
      if (t === "") continue;
    }

    if (phase === "title") {
      if (t === "") continue;

      // Check if it's a Bible reference that came AFTER we switched (shouldn't happen, but safe)
      if (ind > 20 && isReference(t)) {
        reference = t;
        continue;
      }

      // ALL CAPS = title heading
      const isAllCaps = t.length >= 4 && t === t.toUpperCase() && /[A-ZÁÉÍÓÚ]/.test(t);

      // Medium-indent short line = title continuation (e.g., "Um novo começo" / "com Deus")
      const isCenteredTitle = ind >= 8 && ind <= 35 && t.length < 80;

      if (isAllCaps || (isCenteredTitle && bodyLines.length === 0)) {
        titleLines.push(t);
        continue;
      }

      // Low indent prose → body starts
      phase = "body";
      // fall through to body
    }

    if (phase === "body") {
      if (t === "") {
        bodyLines.push("");
      } else {
        bodyLines.push(t);
      }
    }
  }

  const verse = dequote(rawVerseLines.join(" ").replace(/\s+/g, " "));
  const title = titleLines.join(" ").replace(/\s+/g, " ").trim();
  const clean = (arr: string[]) => arr.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  if (!verse && !title) return null;

  return {
    doy, dayNum, month,
    verse,
    reference,
    title,
    content: clean(bodyLines),
    tip: clean(tipLines),
    prayer: clean(prayerLines),
  };
}

function buildContent(day: Day): string {
  // Content = body text + sections only (verse & title shown in chapter header)
  const parts: string[] = [];
  if (day.content) parts.push(day.content);
  if (day.tip) parts.push(`Dica do dia\n${day.tip}`);
  if (day.prayer) parts.push(`Momento de oração\n${day.prayer}`);
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function main() {
  console.log("Reading layout text...");
  const raw = fs.readFileSync(FILE, "utf-8");
  const pages = raw.split("\f");
  console.log(`Total pages: ${pages.length}`);

  const days: Day[] = [];
  const seen = new Set<number>();

  for (const page of pages) {
    const day = parsePage(page);
    if (!day) continue;
    if (seen.has(day.doy)) continue;
    seen.add(day.doy);
    days.push(day);
  }

  days.sort((a, b) => a.doy - b.doy);
  console.log(`\nParsed ${days.length} devotionals`);

  console.log("\nSample:");
  [0, 1, 2, 3, 30, 180, 364].forEach(idx => {
    const d = days[idx];
    if (!d) return;
    console.log(`  DOY ${String(d.doy).padStart(3)}: ${d.dayNum.toString().padStart(2,"0")} ${d.month}`);
    console.log(`    title:  "${d.title.substring(0, 50)}"`);
    console.log(`    verse:  "${d.verse.substring(0, 60)}"`);
    console.log(`    ref:    "${d.reference}"`);
    console.log(`    body:   "${d.content.substring(0, 80)}..."`);
  });

  const missing: number[] = [];
  for (let i = 1; i <= 365; i++) { if (!seen.has(i)) missing.push(i); }
  if (missing.length > 0) {
    console.log(`\nMissing (${missing.length}): ${missing.slice(0, 20).join(", ")}...`);
  } else {
    console.log("\nAll 365 days found!");
  }

  console.log("\nClearing existing chapters...");
  await db.delete(bookChapters);

  console.log("Inserting...");
  let n = 0;
  for (const day of days) {
    const content = buildContent(day);
    // tag = Bible reference (short label shown above title)
    const tag = day.reference ? day.reference.substring(0, 120) : null;
    // excerpt = verse text (shown as italic quote below title)
    const excerpt = day.verse ? day.verse.substring(0, 300) : null;

    await db.insert(bookChapters).values({
      order: day.doy,
      title: day.title || `Dia ${day.doy}`,
      tag,
      excerpt,
      content,
      isPreview: day.doy <= 7,
    });
    n++;
    if (n % 50 === 0) console.log(`  ${n}/${days.length}...`);
  }

  console.log(`\nDone! Inserted ${n} devotionals.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
