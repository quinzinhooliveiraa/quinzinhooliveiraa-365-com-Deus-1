/**
 * Re-imports all chapter content directly from the PDF, page by page.
 * Stores content with \f (form-feed) as a page-break separator so the
 * reader can split at exact PDF page boundaries.
 *
 * Chapters with order < 1 (front matter) are skipped — they have custom content.
 */

import { spawnSync } from "child_process";
import { db } from "../server/db";
import { bookChapters } from "../shared/schema";
import { asc, gte, eq, sql } from "drizzle-orm";

const PDF = "./attached_assets/EBOOK_-_CASA_DOS_20_Refletindo_sobre_os_Desafios_da_Transição__1774559232117.pdf";

/** Extract raw text of a single PDF page, cleaned of noise. */
function extractPage(page: number): string {
  const result = spawnSync(
    "pdftotext",
    ["-f", String(page), "-l", String(page), "-raw", PDF, "-"],
    { encoding: "utf8" }
  );
  if (result.error) throw result.error;
  return cleanPage(result.stdout);
}

/** Remove PDF layout noise: spaced titles, page numbers, chapter numbers. */
function cleanPage(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const t = line.trim();

    // Preserve empty lines (paragraph breaks)
    if (!t) { kept.push(""); continue; }

    // Skip pure digit lines: page numbers (e.g. "25") and chapter numbers (e.g. "7")
    if (/^\d{1,3}$/.test(t)) continue;

    // Skip spaced digit page numbers: "2 5", "1 2", "1 0 7", "4 8"
    if (/^\d(\s\d)+$/.test(t)) continue;

    // Skip spaced-letter uppercase chapter titles:
    // e.g. "É N O R M A L S E P E R D E R ..."
    // Pattern: letter, space, letter, space ... (at least 4 such groups)
    // spaced-letter noise (any case): "M E N S A G E M" or "U m a J o r n a d a"
    // Pattern: single non-space char + space, repeated 4+ times
    if (/^(\S\s){4,}\S?$/.test(t.trim())) continue;

    // Skip short ALL-CAPS lines that look like partial spaced titles
    // e.g. "V O L T A", "A M O R", "D E V O L T A"
    if (
      /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ\s]+$/.test(t) &&
      t.replace(/\s/g, "").length <= 20 &&
      / [A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ]/.test(t)
    ) continue;

    kept.push(line);
  }

  return kept.join("\n")
    .replace(/\n{3,}/g, "\n\n") // normalize excessive blank lines
    .trim();
}

async function run() {
  // Fetch all chapters with order >= 1 that have a pdfPage
  const chapters = await db
    .select({
      id: bookChapters.id,
      order: bookChapters.order,
      pdfPage: bookChapters.pdfPage,
      title: bookChapters.title,
    })
    .from(bookChapters)
    .where(gte(bookChapters.order, 1))
    .orderBy(asc(bookChapters.order));

  // Build end-page map: for chapter[i], end page = chapter[i+1].pdfPage - 1
  const endPageMap: Record<number, number> = {};
  for (let i = 0; i < chapters.length - 1; i++) {
    const curr = chapters[i];
    const next = chapters[i + 1];
    if (curr.pdfPage && next.pdfPage) {
      endPageMap[curr.id] = next.pdfPage - 1;
    }
  }
  // Last chapter: ends around page 176
  const last = chapters[chapters.length - 1];
  if (last?.pdfPage) endPageMap[last.id] = 176;

  let updated = 0;
  let skipped = 0;

  for (const ch of chapters) {
    if (!ch.pdfPage) {
      console.log(`  SKIP (no pdfPage): order=${ch.order}`);
      skipped++;
      continue;
    }

    const startPage = ch.pdfPage;
    const endPage   = endPageMap[ch.id] ?? startPage;

    // Extract each PDF page separately, clean, join with \f
    const pageParts: string[] = [];
    for (let p = startPage; p <= endPage; p++) {
      const text = extractPage(p);
      if (text.trim()) pageParts.push(text);
    }

    if (!pageParts.length) {
      console.log(`  SKIP (empty extract): order=${ch.order} pages ${startPage}-${endPage}`);
      skipped++;
      continue;
    }

    const content = pageParts.join("\f");

    await db.execute(sql`UPDATE book_chapters SET content = ${content} WHERE id = ${ch.id}`);

    console.log(
      `  ✓ order=${String(ch.order).padStart(2)} ` +
      `[PDF ${startPage}-${endPage}] ` +
      `(${pageParts.length} pg) ` +
      `"${ch.title.substring(0, 40)}"`
    );
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
