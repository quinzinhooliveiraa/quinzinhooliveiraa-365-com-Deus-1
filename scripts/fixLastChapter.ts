/**
 * Re-imports chapter 84 content from PDF pages 171-175.
 * Page 173 is a title-only page ("M E N S A G E M  A O  L E I T O R") — stored as-is for
 * special rendering in the reader.
 * Page 175 is blank — skipped.
 */

import { execFileSync } from "child_process";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const PDF = "./attached_assets/EBOOK_-_CASA_DOS_20_Refletindo_sobre_os_Desafios_da_Transição__1774559232117.pdf";

function extractRaw(page: number): string {
  return execFileSync(
    "pdftotext",
    ["-f", String(page), "-l", String(page), "-raw", PDF, "-"],
    { encoding: "utf8" }
  );
}

/** Standard noise removal — digits, spaced page numbers */
function stripNoise(text: string): string {
  return text.split("\n").filter(line => {
    const t = line.trim();
    if (!t) return true;
    if (/^\d{1,3}$/.test(t)) return false;         // standalone page/chapter number
    if (/^\d(\s\d)+$/.test(t)) return false;        // spaced page number "1 7 3"
    return true;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Returns true if the entire text is spaced uppercase (title-only page) */
function isSpacedTitle(text: string): boolean {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  return lines.length === 1 && /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ](\s[A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ])*$/.test(lines[0]);
}

/** Remove spaced uppercase title lines from body text */
function removeSpacedTitles(text: string): string {
  return text.split("\n").filter(line => {
    const t = line.trim();
    if (!t) return true;
    if (/^([A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ]\s){4,}/.test(t)) return false;
    if (/^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ\s]+$/.test(t) && t.replace(/\s/g,"").length <= 20 && / [A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜ]/.test(t)) return false;
    return true;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function run() {
  const pages: string[] = [];

  for (let p = 171; p <= 175; p++) {
    try {
      const raw = extractRaw(p);
      const noNoise = stripNoise(raw);

      if (isSpacedTitle(noNoise)) {
        // Keep as-is — the reader will display this as a styled title page
        pages.push(noNoise);
        console.log(`  Page ${p}: [TITLE] "${noNoise}"`);
      } else {
        const body = removeSpacedTitles(noNoise);
        if (body.trim()) {
          pages.push(body);
          console.log(`  Page ${p}: [body] ${body.substring(0, 80).replace(/\n/g, " ")}`);
        } else {
          console.log(`  Page ${p}: [empty — skipped]`);
        }
      }
    } catch (_) {
      console.log(`  Page ${p}: ERROR`);
    }
  }

  const content = pages.join("\f");
  await db.execute(sql`UPDATE book_chapters SET content = ${content} WHERE "order" = 84`);
  console.log(`\nUpdated chapter 84: ${pages.length} pages, ${content.length} chars`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
