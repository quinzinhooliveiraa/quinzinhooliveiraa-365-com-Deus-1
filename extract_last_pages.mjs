import { createRequire } from "module";
const require = createRequire(import.meta.url);
import fs from "fs";

async function run() {
  const pdfParse = require("pdf-parse");
  const pdfPath = "attached_assets/EBOOK_-_CASA_DOS_20_Refletindo_sobre_os_Desafios_da_Transição__1774559232117.pdf";
  const buf = fs.readFileSync(pdfPath);
  
  let pageTexts = [];
  let currentPage = 0;
  
  const data = await pdfParse(buf, {
    pagerender: async function(pageData) {
      const textContent = await pageData.getTextContent();
      let text = "";
      for (const item of textContent.items) {
        text += item.str + " ";
      }
      pageTexts.push(text.trim());
      currentPage++;
      return text;
    }
  });
  
  console.log(`Total pages: ${data.numpages}`);
  const start = Math.max(0, pageTexts.length - 10);
  for (let i = start; i < pageTexts.length; i++) {
    console.log(`\n=== PAGE ${i + 1} ===`);
    console.log(pageTexts[i].slice(0, 600));
  }
}
run().catch(e => { console.error(e.message); process.exit(1); });
