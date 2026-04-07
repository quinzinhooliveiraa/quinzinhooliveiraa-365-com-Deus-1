import { useEffect, useState } from "react";
import { X, Crown, Loader2, AlertCircle } from "lucide-react";

interface Plan {
  priceId: string;
  label: string;
  priceFormatted: string;
  interval: "month" | "year";
  badge?: string;
}

interface SubscriptionCheckoutModalProps {
  plan: Plan;
  onSuccess: () => void;
  onClose: () => void;
}

export default function SubscriptionCheckoutModal({
  plan,
  onClose,
}: SubscriptionCheckoutModalProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function startCheckout() {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: plan.priceId }),
        });
        const data = await res.json();

        if (!res.ok || !data.url) {
          if (!cancelled) setError(data.message || "Erro ao iniciar pagamento.");
          return;
        }

        if (!cancelled) {
          window.location.href = data.url;
        }
      } catch {
        if (!cancelled) setError("Erro de ligação. Tenta novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    startCheckout();
    return () => { cancelled = true; };
  }, [plan.priceId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-t-3xl border border-border w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500"
        style={{ paddingBottom: "calc(2rem + var(--safe-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/70 text-muted-foreground transition-colors z-10"
          data-testid="btn-close-subscription-modal"
        >
          <X size={18} />
        </button>

        <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Crown size={26} className="text-amber-500" />
          </div>

          <div>
            <h2 className="text-lg font-bold font-serif text-foreground">
              365 Encontros Premium
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Plano {plan.label} · {plan.priceFormatted}/{plan.interval === "month" ? "mês" : "ano"}
            </p>
          </div>

          {error ? (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 mt-2">
              <Loader2 size={22} className="animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">
                A abrir página de pagamento segura...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
