import { storage } from "./storage";

async function getWebPush() {
  const m = await import("web-push");
  return m.default || m;
}

async function sendToAdmin(adminId: string, title: string, body: string, url: string = "/admin") {
  try {
    const webpush = await getWebPush();
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      process.env.VAPID_PUBLIC_KEY || "",
      process.env.VAPID_PRIVATE_KEY || ""
    );

    const subs = await storage.getPushSubscriptions(adminId);
    if (subs.length === 0) {
      console.warn(`[admin-notify] No push subscriptions found for admin ${adminId}`);
      return;
    }

    const payload = JSON.stringify({ title, body, url });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        console.log(`[admin-notify] Notification sent to admin ${adminId}`);
      } catch (err: any) {
        const status = err?.statusCode || err?.status;
        console.error(`[admin-notify] Failed to send to admin ${adminId}, status: ${status}`, err?.message);
        if (status === 410 || status === 404) {
          console.log(`[admin-notify] Removing expired subscription for admin ${adminId}`);
          await storage.deletePushSubscription(adminId, sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error("[admin-notify] Error:", err);
  }
}

export async function notifyAdminNewUser(userName: string, userEmail: string) {
  try {
    const admins = await storage.getAllUsers();
    for (const admin of admins) {
      if (admin.role === "admin" && admin.adminNotifyNewUser) {
        await sendToAdmin(
          admin.id,
          "Novo Usuário 🎉",
          `${userName} (${userEmail}) acabou de entrar no app`,
          "/admin"
        );
      }
    }
  } catch (err) {
    console.error("[admin-notify] notifyAdminNewUser error:", err);
  }
}

export async function notifyAdminNewSubscription(userName: string, userEmail: string) {
  try {
    const admins = await storage.getAllUsers();
    for (const admin of admins) {
      if (admin.role === "admin" && admin.adminNotifyNewSub) {
        await sendToAdmin(
          admin.id,
          "Nova Assinatura 💰",
          `${userName} (${userEmail}) assinou o plano premium!`,
          "/admin"
        );
      }
    }
  } catch (err) {
    console.error("[admin-notify] notifyAdminNewSubscription error:", err);
  }
}

export async function notifyAdminCardAdded(userName: string, userEmail: string) {
  try {
    const admins = await storage.getAllUsers();
    for (const admin of admins) {
      if (admin.role === "admin" && admin.adminNotifyNewSub) {
        await sendToAdmin(
          admin.id,
          "Cartão Adicionado 💳",
          `${userName} (${userEmail}) adicionou um cartão e ganhou dias grátis!`,
          "/admin"
        );
      }
    }
  } catch (err) {
    console.error("[admin-notify] notifyAdminCardAdded error:", err);
  }
}

export async function notifyAdminRenewal(userName: string, userEmail: string) {
  try {
    const admins = await storage.getAllUsers();
    for (const admin of admins) {
      if (admin.role === "admin" && admin.adminNotifyNewSub) {
        await sendToAdmin(
          admin.id,
          "Renovação 🔄",
          `${userName} (${userEmail}) renovou o plano premium`,
          "/admin"
        );
      }
    }
  } catch (err) {
    console.error("[admin-notify] notifyAdminRenewal error:", err);
  }
}

export async function notifyAdminBookPurchase(userName: string, userEmail: string, amountCents: number) {
  try {
    const admins = await storage.getAllUsers();
    const amount = (amountCents / 100).toFixed(2).replace(".", ",");
    for (const admin of admins) {
      if (admin.role === "admin" && admin.adminNotifyNewSub) {
        await sendToAdmin(
          admin.id,
          "Livro Vendido 📚",
          `${userName} (${userEmail}) comprou o livro por €${amount}`,
          "/admin"
        );
      }
    }
  } catch (err) {
    console.error("[admin-notify] notifyAdminBookPurchase error:", err);
  }
}
