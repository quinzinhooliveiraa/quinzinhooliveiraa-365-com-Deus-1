import fs from "fs";
import path from "path";
import { db } from "../server/db";
import { bookChapters } from "../shared/schema";
import { eq } from "drizzle-orm";

const FILE_PATH = "/tmp/book_text.txt";

function parseChapters(raw: string): Array<{ number: number; title: string; content: string }> {
  const lines = raw.split("\n");
  const chapters: Array<{ number: number; title: string; content: string }> = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // A chapter number line: no leading spaces (or very minimal), just a number 1-84
    const trimmed = line.trim();
    const leading = line.length - line.trimStart().length;

    // Chapter number line: small or no indent, just a number 1-84
    if (/^\d{1,2}$/.test(trimmed) && leading < 4) {
      const chapNum = parseInt(trimmed, 10);
      if (chapNum >= 1 && chapNum <= 84) {
        // Skip empty lines after chapter number
        i++;
        while (i < lines.length && lines[i].trim() === "") i++;

        // Collect title lines (uppercase or title case, typically short lines before prose)
        const titleLines: string[] = [];
        while (i < lines.length) {
          const tl = lines[i].trim();
          // Stop collecting title if line is empty (separator before content)
          if (tl === "") break;
          // Stop if it looks like prose content (longer than ~70 chars and lowercase mixed)
          if (tl.length > 80 && /[a-záéíóúãõâêîôûç].*[a-záéíóúãõâêîôûç]/.test(tl)) break;
          // Stop at page number lines (big indent + number)
          if (/^\d{1,3}$/.test(tl) && lines[i].length - lines[i].trimStart().length > 10) break;
          titleLines.push(tl);
          i++;
        }
        const title = titleLines.join(" ").replace(/\s+/g, " ").trim();

        // Collect content until next chapter number
        const contentLines: string[] = [];
        i++; // skip empty line after title
        while (i < lines.length) {
          const cl = lines[i];
          const ct = cl.trim();
          const cl_leading = cl.length - cl.trimStart().length;

          // Check if this is the start of a new chapter
          if (/^\d{1,2}$/.test(ct) && cl_leading < 4) {
            const nextNum = parseInt(ct, 10);
            if (nextNum >= 1 && nextNum <= 84 && nextNum !== chapNum) {
              break;
            }
          }

          // Skip pure page number lines (heavily indented numbers)
          if (/^\d{1,3}$/.test(ct) && cl_leading > 10) {
            i++;
            continue;
          }

          contentLines.push(ct);
          i++;
        }

        // Clean content: remove excessive blank lines
        const content = contentLines
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        if (title || content) {
          chapters.push({ number: chapNum, title, content });
        }
        continue;
      }
    }
    i++;
  }

  return chapters;
}

async function main() {
  console.log("Reading file...");
  const raw = fs.readFileSync(FILE_PATH, "utf-8");

  console.log("Parsing chapters...");
  const chapters = parseChapters(raw);
  console.log(`Found ${chapters.length} chapters`);

  // Print first few for verification
  chapters.slice(0, 5).forEach((c) => {
    console.log(`\nCap ${c.number}: "${c.title}"`);
    console.log(`  Content preview: ${c.content.substring(0, 100)}...`);
  });

  console.log("\nInserting into database...");

  // Clear existing chapters first
  await db.delete(bookChapters);
  console.log("Cleared existing chapters");

  // Insert all chapters
  for (const ch of chapters) {
    await db.insert(bookChapters).values({
      order: ch.number,
      title: ch.title || `Capítulo ${ch.number}`,
      content: ch.content,
      isPreview: ch.number <= 3, // first 3 chapters are free preview
    });
  }

  console.log(`\nSuccessfully inserted ${chapters.length} chapters!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
