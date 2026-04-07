import { db } from "../server/db";
import { bookChapters } from "../shared/schema";
import { eq } from "drizzle-orm";

// PDF page where each chapter starts (order → PDF page from the book's Sumário)
const PDF_PAGES: Record<number, number> = {
  [-1]: 9,   // Introdução
  1:  12, 2:  14, 3:  16, 4:  18, 5:  20,
  6:  22, 7:  25, 8:  27, 9:  29, 10: 31,
  11: 34, 12: 36, 13: 38, 14: 40, 15: 42,
  16: 44, 17: 46, 18: 48, 19: 49, 20: 50,
  21: 52, 22: 55, 23: 57, 24: 59, 25: 62,
  26: 63, 27: 64, 28: 66, 29: 67, 30: 69,
  31: 71, 32: 72, 33: 74, 34: 77, 35: 78,
  36: 81, 37: 83, 38: 85, 39: 87, 40: 88,
  41: 90, 42: 92, 43: 93, 44: 95, 45: 97,
  46: 99, 47: 101, 48: 104, 49: 107, 50: 108,
  51: 111, 52: 113, 53: 114, 54: 115, 55: 116,
  56: 118, 57: 119, 58: 121, 59: 122, 60: 125,
  61: 127, 62: 128, 63: 130, 64: 132, 65: 135,
  66: 136, 67: 137, 68: 139, 69: 141, 70: 143,
  71: 146, 72: 147, 73: 150, 74: 152, 75: 153,
  76: 155, 77: 157, 78: 159, 79: 161, 80: 163,
  81: 165, 82: 167, 83: 169, 84: 171,
};

async function run() {
  let updated = 0;
  for (const [orderStr, page] of Object.entries(PDF_PAGES)) {
    const order = Number(orderStr);
    const result = await db
      .update(bookChapters)
      .set({ pdfPage: page })
      .where(eq(bookChapters.order, order));
    updated++;
  }
  console.log(`Updated ${updated} chapters with PDF page numbers.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
