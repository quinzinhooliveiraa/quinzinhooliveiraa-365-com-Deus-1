import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("/{*path}", async (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");

    const sharedMatch = req.originalUrl.match(/^\/shared\/([a-zA-Z0-9_-]+)/);
    if (sharedMatch) {
      try {
        const entry = await storage.getEntryBySlug(sharedMatch[1]);
        if (entry) {
          const title = `Reflexão de ${entry.authorName} — Casa dos 20`;
          const desc = entry.text.replace(/[#*>\[\]!()]/g, "").slice(0, 160).trim() + "…";
          const safeTitle = title.replace(/"/g, "&quot;");
          const safeDesc = desc.replace(/"/g, "&quot;");

          html = html
            .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${safeTitle}">`)
            .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${safeDesc}">`)
            .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${safeTitle}">`)
            .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${safeDesc}">`)
            .replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);
        }
      } catch {}
    }

    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
