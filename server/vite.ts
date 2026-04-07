import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { storage } from "./storage";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      const sharedMatch = url.match(/^\/shared\/([a-zA-Z0-9_-]+)/);
      if (sharedMatch) {
        try {
          const entry = await storage.getEntryBySlug(sharedMatch[1]);
          if (entry) {
            const title = `Reflexão de ${entry.authorName} — Casa dos 20`;
            const desc = entry.text.replace(/[#*>\[\]!()]/g, "").slice(0, 160).trim() + "…";
            const safeTitle = title.replace(/"/g, "&quot;");
            const safeDesc = desc.replace(/"/g, "&quot;");

            template = template
              .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${safeTitle}">`)
              .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${safeDesc}">`)
              .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${safeTitle}">`)
              .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${safeDesc}">`)
              .replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);
          }
        } catch {}
      }

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
