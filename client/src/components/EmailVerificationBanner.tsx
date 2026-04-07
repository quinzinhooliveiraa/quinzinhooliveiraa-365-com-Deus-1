import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Mail, X, Loader2, CheckCircle } from "lucide-react";

export function EmailVerificationBanner() {
  const { user, refetch } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => refetch(), 2000);
      }
    } catch {}
    setSending(false);
  };

  return (
    <div className="mx-4 mt-2 mb-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3" data-testid="banner-email-verification">
      <Mail size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          Confirme seu email
        </p>
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
          Enviamos um link de verificação para <span className="font-medium">{user.email}</span>
        </p>
        {sent ? (
          <div className="flex items-center gap-1 mt-2 text-[11px] text-green-600">
            <CheckCircle size={12} />
            Email reenviado!
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-50 flex items-center gap-1"
            data-testid="button-resend-verification"
          >
            {sending ? <Loader2 size={10} className="animate-spin" /> : null}
            Reenviar email
          </button>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600 transition-colors shrink-0"
        data-testid="button-dismiss-verification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
