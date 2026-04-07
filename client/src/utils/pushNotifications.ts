import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const res = await fetch("/api/push/vapid-key");
    const data = await res.json();
    cachedVapidKey = data.publicKey || "";
    return cachedVapidKey;
  } catch {
    return "";
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
  } catch {}
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    const result = await PushNotifications.checkPermissions();
    if (result.receive === 'granted') return 'granted';
    if (result.receive === 'denied') return 'denied';
    return 'default';
  }
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (Capacitor.isNativePlatform()) return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

export async function registerNativePush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await PushNotifications.addListener('registration', async (token) => {
    try {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: `capacitor://${Capacitor.getPlatform()}/${token.value}`,
          p256dh: "",
          auth: "",
          platform: Capacitor.getPlatform(),
          token: token.value,
        }),
      });
    } catch {}
  });

  await PushNotifications.addListener('registrationError', (_err) => {
    console.error('Push registration failed');
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    LocalNotifications.schedule({
      notifications: [{
        title: notification.title || '365 Encontros',
        body: notification.body || '',
        id: Date.now(),
        extra: notification.data,
      }],
    });
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = action.notification.data?.url;
    if (url) {
      window.location.href = url;
    }
  });

  await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const url = action.notification.extra?.url;
    if (url) {
      window.location.href = url;
    }
  });
}

export async function subscribeToPush(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    return subscribeNativePush();
  }
  return subscribeWebPush();
}

async function subscribeNativePush(): Promise<boolean> {
  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return false;

    await LocalNotifications.requestPermissions();

    await registerNativePush();
    await PushNotifications.register();

    localStorage.setItem("casa-push-subscribed", "true");
    return true;
  } catch {
    return false;
  }
}

async function subscribeWebPush(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      console.error("Push: VAPID key not available");
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) return false;

    await registration.update();
    await new Promise((r) => setTimeout(r, 500));

    const sw = registration.active || registration.waiting || registration.installing;
    if (!sw) return false;
    if (sw.state !== "activated") {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("SW activation timeout")), 10000);
        sw.addEventListener("statechange", () => {
          if (sw.state === "activated") { clearTimeout(timeout); resolve(); }
        });
        if (sw.state === "activated") { clearTimeout(timeout); resolve(); }
      });
    }

    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await existingSub.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const keys = subscription.toJSON().keys;
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: keys?.p256dh || "",
        auth: keys?.auth || "",
      }),
    });

    if (!res.ok) {
      console.error("Push: subscribe API failed", res.status);
      return false;
    }

    localStorage.setItem("casa-push-subscribed", "true");
    return true;
  } catch (err) {
    console.error("Push: subscribe failed", err);
    return false;
  }
}

export async function refreshPushSubscription(): Promise<void> {
  if (Capacitor.isNativePlatform()) return;
  if (!isPushSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!localStorage.getItem("casa-push-subscribed")) return;

  try {
    await subscribeWebPush();
  } catch {}
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    return unsubscribeNativePush();
  }
  return unsubscribeWebPush();
}

async function unsubscribeNativePush(): Promise<boolean> {
  try {
    await PushNotifications.removeAllListeners();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ endpoint: `capacitor://${Capacitor.getPlatform()}` }),
    });
    localStorage.removeItem("casa-push-subscribed");
    return true;
  } catch {
    return false;
  }
}

async function unsubscribeWebPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return true;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    localStorage.removeItem("casa-push-subscribed");
    return true;
  } catch {
    return false;
  }
}

export function isSubscribed(): boolean {
  return localStorage.getItem("casa-push-subscribed") === "true";
}

export async function scheduleLocalNotification(title: string, body: string, delaySeconds: number = 0, data?: Record<string, string>): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const permStatus = await LocalNotifications.checkPermissions();
  if (permStatus.display !== 'granted') {
    await LocalNotifications.requestPermissions();
  }

  await LocalNotifications.schedule({
    notifications: [{
      title,
      body,
      id: Date.now(),
      schedule: delaySeconds > 0 ? { at: new Date(Date.now() + delaySeconds * 1000) } : undefined,
      extra: data,
    }],
  });
}
