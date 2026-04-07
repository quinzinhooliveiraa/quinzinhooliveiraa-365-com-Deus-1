const CACHE_NAME = "365encontros-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (request.url.includes("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("", { status: 503 });
        })
      )
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "365 Encontros", body: "Você tem uma nova atividade!", url: "/" };
  try {
    data = event.data.json();
  } catch {}

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/favicon.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/", sound: data.sound || null, campaignId: data.campaignId || null },
    actions: data.actions || [],
    tag: data.tag || "default",
    renotify: true,
  };

  if (data.tag === "admin-new-sub") {
    options.vibrate = [200, 100, 200, 100, 300];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      if (data.sound) {
        return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "PLAY_SOUND", sound: data.sound });
          });
        });
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const campaignId = event.notification.data?.campaignId;
  const notifUrl = event.notification.data?.url || "/";

  let targetUrl = notifUrl;
  if (event.action === "reflect") {
    targetUrl = "/";
  } else if (event.action === "share") {
    targetUrl = "/";
  }

  if (campaignId) {
    fetch("/api/push/clicked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    }).catch(() => {});
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
