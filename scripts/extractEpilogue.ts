import { db } from "../server/db";
import { bookChapters } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  // Get chapter 84 content
  const [ch84] = await db.select({ id: bookChapters.id, content: bookChapters.content })
    .from(bookChapters).where(eq(bookChapters.order, 84));

  const pages = ch84.content.split("\f");
  // Pages: [0]=p171, [1]=p172, [2]="M E N S A G E M A O L E I T O R", [3]="Caro leitor..."

  // Update chapter 84 to only have the 2 actual chapter pages
  const ch84Content = pages.slice(0, 2).join("\f");
  await db.update(bookChapters)
    .set({ content: ch84Content })
    .where(eq(bookChapters.order, 84));
  console.log("✓ Capítulo 84 actualizado (2 páginas: p171-172)");

  // Epilogue content: title page + epilogue text
  const epilogueContent = pages.slice(2).join("\f"); // "M E N S A G E M A O L E I T O R\fCaro leitor,..."

  // Check if epilogue chapter already exists
  const existing = await db.select({ id: bookChapters.id })
    .from(bookChapters).where(eq(bookChapters.order, 85));

  if (existing.length > 0) {
    await db.update(bookChapters)
      .set({
        title: "Mensagem ao Leitor",
        content: epilogueContent,
        pageType: "epilogue",
        pdfPage: 173,
        isPreview: true,
      })
      .where(eq(bookChapters.order, 85));
    console.log("✓ Epilogo actualizado");
  } else {
    await db.insert(bookChapters).values({
      order: 85,
      title: "Mensagem ao Leitor",
      pageType: "epilogue",
      content: epilogueContent,
      pdfPage: 173,
      isPreview: true,
      tag: null,
      excerpt: null,
    } as any);
    console.log("✓ Epilogo inserido (Mensagem ao Leitor, p173-174)");
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
