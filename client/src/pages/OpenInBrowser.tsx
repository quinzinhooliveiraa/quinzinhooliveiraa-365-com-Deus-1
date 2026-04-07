import { useState } from "react";
import { ExternalLink, Copy, Check, Smartphone } from "lucide-react";
import iconLight from "@/assets/images/icon-light.png";
import iconDark from "@/assets/images/icon-dark.png";
import { useTheme } from "next-themes";

function getInAppBrowserName(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent || navigator.vendor || "";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/musical_ly|Bytedance|TikTok/i.test(ua)) return "TikTok";
  if (/Twitter/i.test(ua)) return "Twitter";
  if (/Snapchat/i.test(ua)) return "Snapchat";
  if (/LinkedIn/i.test(ua)) return "LinkedIn";
  if (/Pinterest/i.test(ua)) return "Pinterest";
  return "este app";
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export default function OpenInBrowser() {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const iconSrc = resolvedTheme === "dark" ? iconDark : iconLight;
  const appName = getInAppBrowserName();
  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://casados20.replit.app";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = appUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenExternal = () => {
    if (isAndroid()) {
      window.location.href = `intent://${appUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      setTimeout(() => {
        window.open(appUrl, "_system");
      }, 500);
    } else {
      window.open(appUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
            <img src={iconSrc} alt="365 Encontros com Deus Pai" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-serif text-foreground tracking-wide text-center">365 Encontros com Deus Pai</h1>
        </div>

        <div className="w-full p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Abra no navegador
            </p>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            O navegador do {appName} não permite instalar o app.
            {isIos()
              ? " Abra no Safari para ter a melhor experiência."
              : " Abra no Chrome para instalar na sua tela inicial."}
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={handleOpenExternal}
            className="w-full h-14 rounded-full bg-primary text-primary-foreground text-base font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            data-testid="button-open-browser"
          >
            <ExternalLink size={18} />
            Abrir no {isIos() ? "Safari" : "Chrome"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={handleCopy}
            className="w-full h-12 rounded-full border border-border bg-card text-foreground text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all"
            data-testid="button-copy-link"
          >
            {copied ? (
              <>
                <Check size={16} className="text-green-500" />
                Link copiado!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copiar link
              </>
            )}
          </button>
        </div>

        {isIos() && (
          <div className="w-full p-4 rounded-xl bg-muted/50 border border-border space-y-2">
            <p className="text-xs font-medium text-foreground">Como abrir no Safari:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary">1</span>
                <span>Toque nos <strong className="text-foreground">3 pontinhos</strong> (⋯) no canto</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary">2</span>
                <span>Selecione <strong className="text-foreground">"Abrir no navegador"</strong> ou <strong className="text-foreground">"Abrir no Safari"</strong></span>
              </div>
            </div>
          </div>
        )}

        {isAndroid() && (
          <div className="w-full p-4 rounded-xl bg-muted/50 border border-border space-y-2">
            <p className="text-xs font-medium text-foreground">Se o botão acima não funcionar:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary">1</span>
                <span>Toque nos <strong className="text-foreground">3 pontinhos</strong> (⋮) no canto</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary">2</span>
                <span>Selecione <strong className="text-foreground">"Abrir no Chrome"</strong></span>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed px-4">
          Seu diário de autoconhecimento para os 20 e poucos
        </p>
      </div>
    </div>
  );
}
