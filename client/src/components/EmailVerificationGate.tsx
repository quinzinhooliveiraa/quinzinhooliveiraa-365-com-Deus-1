import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Loader2, CheckCircle, RefreshCw, LogOut } from "lucide-react";
import iconLight from "@/assets/images/icon-light.png";
import iconDark from "@/assets/images/icon-dark.png";
import { useTheme } from "next-themes";

export function EmailVerificationGate() {
  const { user, logout, refetch } = useAuth();
  const { resolvedTheme } = useTheme();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);

  if (!user || user.emailVerified) return null;

  const iconSrc = resolvedTheme === "dark" ? iconDark : iconLight;

  const handleResend = async () => {
    setSending(true);
    setSent(false);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) setSent(true);
    } catch {}
    setSending(false);
  };

  const handleCheck = async () => {
    setChecking(true);
    await refetch();
    setTimeout(() => setChecking(false), 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
            <img src={iconSrc} alt="365 Encontros com Deus Pai" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-serif text-foreground tracking-wide">Confirme seu email</h1>
        </div>

        <div className="w-full bg-card rounded-3xl border border-border p-8 space-y-6 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mail size={28} className="text-primary" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-foreground leading-relaxed">
              Enviamos um link de verificação para:
            </p>
            <p className="text-sm font-bold text-primary break-all" data-testid="text-verification-email">
              {user.email}
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Abra seu email e clique no link para confirmar sua conta. Depois, volte aqui e toque em "Já confirmei".
          </p>

          {sent && (
            <div className="flex items-center justify-center gap-2 text-green-600 text-xs font-medium animate-in fade-in duration-300">
              <CheckCircle size={14} />
              Email reenviado com sucesso!
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              data-testid="button-check-verification"
            >
              {checking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <RefreshCw size={16} />
                  Já confirmei meu email
                </>
              )}
            </button>

            <button
              onClick={handleResend}
              disabled={sending || sent}
              className="w-full text-xs text-muted-foreground font-medium hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1 disabled:opacity-50"
              data-testid="button-resend-verification-gate"
            >
              {sending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : null}
              {sent ? "Email reenviado!" : "Reenviar email de verificação"}
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 py-2"
          data-testid="button-logout-verification"
        >
          <LogOut size={12} />
          Sair e usar outro email
        </button>
      </div>
    </div>
  );
}
