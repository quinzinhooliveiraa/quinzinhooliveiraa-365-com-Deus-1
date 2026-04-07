import { useState, useEffect } from "react";
import { X, Plus, Smartphone, Share, ArrowUp } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { isNativePlatform } from "@/utils/capacitor";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function PwaInstallPrompt() {
  const isNative = isNativePlatform();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem("casa-pwa-prompt-dismissed");
    if (!ts) return false;
    const diff = Date.now() - parseInt(ts, 10);
    return diff < 24 * 60 * 60 * 1000;
  });
  const [visible, setVisible] = useState(false);
  const [isIosDevice] = useState(isIos);
  const [standalone] = useState(isInStandaloneMode);

  useEffect(() => {
    if (isNative || dismissed || installed || standalone) {
      setVisible(false);
      return;
    }

    if (canInstall || isIosDevice) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }

    setVisible(false);
  }, [canInstall, dismissed, installed, isNative, isIosDevice, standalone]);

  if (!visible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem("casa-pwa-prompt-dismissed", String(Date.now()));
  };

  const handleInstall = async () => {
    await promptInstall();
    setVisible(false);
  };

  if (isIosDevice) {
    return (
      <div
        className="fixed bottom-20 left-4 right-4 z-[90] animate-in slide-in-from-bottom-4 fade-in duration-500"
        data-testid="pwa-install-prompt-ios"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Smartphone size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Instalar App</p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary">1</span>
                  <span>Toque em</span>
                  <Share size={13} className="text-blue-500 shrink-0" />
                  <span className="font-medium text-foreground">Compartilhar</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary">2</span>
                  <span>Depois em</span>
                  <Plus size={13} className="text-foreground shrink-0" />
                  <span className="font-medium text-foreground">Adicionar à Tela de Início</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              data-testid="button-pwa-dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[90] animate-in slide-in-from-bottom-4 fade-in duration-500"
      data-testid="pwa-install-prompt"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3 max-w-md mx-auto">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone size={22} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Instalar App</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Adicione à tela inicial para acesso rápido
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all"
          data-testid="button-pwa-install"
        >
          <Plus size={14} />
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          data-testid="button-pwa-dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
