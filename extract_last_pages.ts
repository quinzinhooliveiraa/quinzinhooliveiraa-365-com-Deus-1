import * as fs from "fs";
import * as path from "path";

// Use pdf-parse to extract text from the PDF
async function run() {
  const pdfParse = (await import("pdf-parse")).default;
  const pdfPath = "attached_assets/EBOOK_-_CASA_DOS_20_Refletindo_sobre_os_Desafios_da_Transição__1774559232117.pdf";
  const buf = fs.readFileSync(pdfPath);
  
  let pageTexts: string[] = [];
  
  const data = await pdfParse(buf, {
    pagerender: function(pageData: any) {
      return pageData.getTextContent().then((textContent: any) => {
        let text = "";
        for (const item of textContent.items) {
          text += item.str + " ";
        }
        pageTexts.push(text.trim());
        return text;
      });
    }
  });
  
  console.log(`Total pages: ${data.numpages}`);
  console.log("\n--- Last 12 pages ---\n");
  const start = Math.max(0, pageTexts.length - 12);
  for (let i = start; i < pageTexts.length; i++) {
    console.log(`\n=== PAGE ${i + 1} ===`);
    console.log(pageTexts[i].slice(0, 500));
  }
}
run().catch(e => { console.error(e); process.exit(1); });
