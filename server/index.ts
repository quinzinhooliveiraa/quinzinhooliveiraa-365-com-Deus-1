import express, { type Request, Response, NextFunction } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { registerRoutes, seedAutoNotifications, processAutoNotifications, recoverMissedTrialBonuses, repairAdminEmail, repairAllEmailsWithOldKey } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { WebhookHandlers } from "./webhookHandlers";

const app = express();
const httpServer = createServer(app);

// ── WebSocket Chat ──────────────────────────────────────────────────────────

const wss = new WebSocketServer({ noServer: true, path: "/ws/chat" });

const userConnections = new Map<string, Set<WebSocket>>();
// liveId → Map<userId, ws> — tracks who is in each live room
const liveRooms = new Map<number, Map<string, WebSocket>>();

function broadcastToLive(liveId: number, payload: object) {
  const room = liveRooms.get(liveId);
  if (!room) return;
  const msg = JSON.stringify(payload);
  room.forEach(conn => {
    if (conn.readyState === WebSocket.OPEN) conn.send(msg);
  });
}

function leaveAllLiveRooms(userId: string, ws: WebSocket) {
  liveRooms.forEach((room, liveId) => {
    if (room.get(userId) === ws) {
      room.delete(userId);
      broadcastToLive(liveId, { type: "live_viewer_count", liveId, count: room.size });
    }
  });
}

wss.on("connection", (ws) => {
  let currentUserId: string | null = null;

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === "auth" && message.userId) {
        currentUserId = message.userId;
        if (!userConnections.has(currentUserId)) {
          userConnections.set(currentUserId, new Set());
        }
        userConnections.get(currentUserId)!.add(ws);

      } else if (["live_offer", "live_answer", "live_ice", "viewer_join", "live_join_request", "live_join_response"].includes(message.type) && message.targetUserId) {
        // P2P WebRTC signaling — route to target user
        const targetConns = userConnections.get(message.targetUserId);
        if (targetConns) {
          const payload = JSON.stringify({ ...message, fromUserId: currentUserId });
          targetConns.forEach(conn => {
            if (conn.readyState === WebSocket.OPEN) conn.send(payload);
          });
        }

      } else if (message.type === "live_join_room" && message.liveId && currentUserId) {
        const liveId = Number(message.liveId);
        if (!liveRooms.has(liveId)) liveRooms.set(liveId, new Map());
        liveRooms.get(liveId)!.set(currentUserId, ws);
        broadcastToLive(liveId, { type: "live_viewer_count", liveId, count: liveRooms.get(liveId)!.size });

      } else if (message.type === "live_leave_room" && message.liveId && currentUserId) {
        const liveId = Number(message.liveId);
        liveRooms.get(liveId)?.delete(currentUserId);
        broadcastToLive(liveId, { type: "live_viewer_count", liveId, count: liveRooms.get(liveId)?.size ?? 0 });

      } else if (message.type === "live_comment" && message.liveId) {
        broadcastToLive(Number(message.liveId), {
          type: "live_comment",
          liveId: message.liveId,
          id: `${Date.now()}-${currentUserId}`,
          userId: currentUserId,
          userName: message.userName,
          userPhoto: message.userPhoto ?? null,
          text: message.text,
        });
      }

    } catch (err) {
      console.error("WS error:", err);
    }
  });

  ws.on("close", () => {
    if (currentUserId) {
      const conns = userConnections.get(currentUserId);
      if (conns) {
        conns.delete(ws);
        if (conns.size === 0) userConnections.delete(currentUserId);
      }
      leaveAllLiveRooms(currentUserId, ws);
    }
  });
});

httpServer.on("upgrade", (request, socket, head) => {
  if (request.url === "/ws/chat") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

export function broadcastLiveEnded(liveId: number) {
  broadcastToLive(liveId, { type: "live_ended", liveId });
  liveRooms.delete(liveId);
}

export function broadcastChatMessage(channelId: number, message: any) {
  const payload = JSON.stringify({ type: "chat_message", channelId, message });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function broadcastDmMessage(conversationId: number, message: any) {
  const payload = JSON.stringify({ type: "dm_message", conversationId, message });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        return res.status(500).json({ error: "Webhook processing error" });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  express.json({
    limit: "100mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "100mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  (async () => {
    try {
      const { runMigrations } = await import("stripe-replit-sync");
      const { getStripeSync } = await import("./stripeClient");
      const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
      if (databaseUrl) {
        log("Initializing Stripe schema...", "stripe");
        await runMigrations({ databaseUrl, schema: "stripe" });
        log("Stripe schema ready", "stripe");

        const stripeSync = await getStripeSync();
        const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
        await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
        log("Stripe webhook configured", "stripe");

        stripeSync.syncBackfill()
          .then(() => log("Stripe data synced", "stripe"))
          .catch((err: any) => log(`Stripe sync error: ${err.message}`, "stripe"));
      }
    } catch (err: any) {
      log(`Stripe init error (non-fatal): ${err.message}`, "stripe");
    }
  })();

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      repairAdminEmail()
        .catch((err) => log(`Admin email repair error: ${err}`));

      repairAllEmailsWithOldKey()
        .catch((err) => log(`Email bulk repair error: ${err}`));

      seedAutoNotifications()
        .then(() => log("Auto notifications seeded"))
        .catch((err) => log(`Auto notification seed error: ${err}`));

      recoverMissedTrialBonuses()
        .catch((err) => log(`Recover trial bonus error: ${err}`));

      const runNotificationCycle = async () => {
        try {
          const dueNotifs = await storage.getDueNotifications();
          if (dueNotifs.length > 0 && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PUBLIC_KEY) {
            const webpushModule = await import("web-push");
            const webpush = webpushModule.default || webpushModule;
            webpush.setVapidDetails(
              process.env.VAPID_SUBJECT || "mailto:admin@example.com",
              process.env.VAPID_PUBLIC_KEY,
              process.env.VAPID_PRIVATE_KEY
            );

            const allSubs = await storage.getAllPushSubscriptions();
            if (allSubs.length > 0) {
              for (const notif of dueNotifs) {
                const payload = JSON.stringify({
                  title: notif.title,
                  body: notif.body,
                  url: notif.url,
                });
                for (const sub of allSubs) {
                  try {
                    await webpush.sendNotification(
                      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                      payload
                    );
                  } catch {
                    await storage.deletePushSubscription(sub.userId, sub.endpoint);
                  }
                }
                await storage.markNotificationSent(notif.id);
              }
              log(`Sent ${dueNotifs.length} scheduled notification(s) to ${allSubs.length} device(s)`);
            }
          }
        } catch (err) {
          log(`Notification scheduler error: ${err}`);
        }

        try {
          await processAutoNotifications();
        } catch (err) {
          log(`Auto notification error: ${err}`);
        }
      };

      setTimeout(runNotificationCycle, 10 * 1000);
      setInterval(runNotificationCycle, 60 * 1000);
    },
  );
})();
