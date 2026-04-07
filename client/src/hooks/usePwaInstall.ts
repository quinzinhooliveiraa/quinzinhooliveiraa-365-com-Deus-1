import { useState, useEffect, useCallback } from "react";

let globalDeferredPrompt: any = null;
const listeners: Set<() => void> = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    listeners.forEach((fn) => fn());
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    listeners.forEach((fn) => fn());
    fetch("/api/pwa/installed", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } }).catch(() => {});
  });

  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  ) {
    if (!sessionStorage.getItem("pwa-reported")) {
      sessionStorage.setItem("pwa-reported", "1");
      fetch("/api/pwa/installed", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(globalDeferredPrompt);
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    );
  });

  useEffect(() => {
    const update = () => {
      setDeferredPrompt(globalDeferredPrompt);
      if (!globalDeferredPrompt && !installed) {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as any).standalone === true;
        if (isStandalone) setInstalled(true);
      }
    };
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, [installed]);

  const promptInstall = useCallback(async () => {
    if (!globalDeferredPrompt) return false;
    try {
      await globalDeferredPrompt.prompt();
      const result = await globalDeferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setInstalled(true);
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        return true;
      }
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    canInstall: !!deferredPrompt && !installed,
    installed,
    promptInstall,
  };
}
