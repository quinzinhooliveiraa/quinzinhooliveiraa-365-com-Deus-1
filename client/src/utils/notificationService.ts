export type NotificationType =
  | "devotional"
  | "diary"
  | "reminder"
  | "reflection"
  | "live"
  | "new_message"
  | "community";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  actionUrl?: string;
  dismissed?: boolean;
}

const NOTIFICATION_STORAGE_KEY = "365encontros-notifications";

export function getStoredNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addNotification(notification: Omit<Notification, "id" | "timestamp">): Notification {
  const newNotification: Notification = {
    ...notification,
    id: `notif-${Date.now()}`,
    timestamp: Date.now(),
  };

  const notifications = getStoredNotifications();
  notifications.push(newNotification);
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));

  return newNotification;
}

export function dismissNotification(id: string): void {
  const notifications = getStoredNotifications();
  const updated = notifications.map(n =>
    n.id === id ? { ...n, dismissed: true } : n
  );
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated));
}

export function getUnreadNotifications(): Notification[] {
  return getStoredNotifications().filter(n => !n.dismissed);
}

export function clearNotifications(): void {
  localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
}

export function shouldShowDailyNotification(type: NotificationType): boolean {
  const key = `365encontros-${type}-shown-today`;
  const shown = localStorage.getItem(key);

  if (!shown) {
    localStorage.setItem(key, new Date().toDateString());
    return true;
  }

  return shown !== new Date().toDateString();
}

export const NOTIFICATION_MESSAGES: Record<string, { title: string; message: string }> = {
  devotional: {
    title: "Devocional do Dia",
    message: "O devocional de hoje está disponível. Reserve um momento com Deus Pai.",
  },
  diary: {
    title: "Registo no Diário",
    message: "Escreve no teu diário de fé. O que Deus Pai falou ao teu coração hoje?",
  },
  reminder: {
    title: "Lembrete Espiritual",
    message: "Uma palavra de encorajamento para o teu caminho com Deus Pai.",
  },
  reflection: {
    title: "Reflexão para Hoje",
    message: "Uma reflexão especial para meditar ao longo do dia.",
  },
  live: {
    title: "Live a decorrer",
    message: "Há uma transmissão em direto na Comunidade. Junta-te agora!",
  },
  new_message: {
    title: "Nova Mensagem",
    message: "Tens uma mensagem nova na Comunidade.",
  },
  community: {
    title: "Comunidade",
    message: "Há novidade na tua comunidade de fé.",
  },
};
