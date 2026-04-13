import { useState, useEffect } from "react";
import { X, Crown, Loader2, AlertCircle, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";

interface Plan {
  priceId: string;
  label: string;
  priceFormatted: string;
  interval: string;
  periodShort: string;
  badge?: string;
}

interface Props {
  plan: Plan;
  onSuccess: () => void;
  onClose: () => void;
}

function PaymentForm({
  plan,
  subscriptionId,
  onSuccess,
  onClose,
}: {
  plan: Plan;
  subscriptionId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: window.location.href,
        },
      });

      if (stripeError) {
        setError(stripeError.message || "Erro no pagamento. Verifica os dados.");
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        const confirmRes = await fetch("/api/stripe/confirm-subscription", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId }),
        });
        const confirmData = await confirmRes.json();

        if (!confirmRes.ok) {
          setError(confirmData.message || "Erro ao ativar subscrição.");
          setLoading(false);
          return;
        }

        setSuccess(true);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setTimeout(() => onSuccess(), 2000);
      } else {
        setError("Pagamento não confirmado. Tenta novamente.");
        setLoading(false);
      }
    } catch {
      setError("Erro de ligação. Tenta novamente.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold font-serif text-foreground">Premium ativado!</h2>
        <p className="text-sm text-muted-foreground">
          Bem-vindo ao 365 Encontros Premium. Todo o conteúdo está agora desbloqueado.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="px-6 pt-7 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <Crown size={20} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif text-foreground leading-tight">
              365 Encontros Premium
            </h2>
            <p className="text-xs text-muted-foreground">
              Plano {plan.label} · {plan.priceFormatted}{plan.periodShort !== "único" ? `/${plan.periodShort}` : " · pagamento único"}
            </p>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-5 flex items-center justify-between">
          <span className="text-sm text-foreground font-medium">
            {plan.interval === "one_time" ? "Acesso Vitalício" : `Assinatura ${plan.label}`}
          </span>
          <span className="text-base font-bold text-amber-600 dark:text-amber-400">
            {plan.priceFormatted}
          </span>
        </div>

        <div className="mb-4">
          <PaymentElement
            onReady={() => setReady(true)}
            options={{
              layout: "tabs",
              paymentMethodOrder: ["apple_pay", "google_pay", "card"],
              wallets: {
                applePay: "auto",
                googlePay: "auto",
              },
            }}
          />
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          <Lock size={11} className="text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Protegido pelo Stripe · os teus dados nunca passam pelos nossos servidores
          </p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
              Cancela a qualquer momento · sem compromisso
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-2 space-y-2">
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-xs py-1">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !stripe || !ready}
          data-testid="btn-confirm-subscription"
          className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? "A processar..." : `Subscrever por ${plan.priceFormatted}`}
        </button>

        <button
          type="button"
          onClick={onClose}
          data-testid="btn-cancel-subscription"
          className="w-full py-2.5 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function SubscriptionCheckoutModal({ plan, onSuccess, onClose }: Props) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const keyFetch = fetch("/api/stripe/config", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.publishableKey) return loadStripe(d.publishableKey);
        throw new Error("Stripe não configurado.");
      });

    const intentFetch = fetch("/api/stripe/create-subscription-intent", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: plan.priceId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.clientSecret) throw new Error(d.message || "Erro ao criar pagamento.");
        return d;
      });

    Promise.all([keyFetch, intentFetch])
      .then(([stripeInst, intentData]) => {
        setStripePromise(Promise.resolve(stripeInst));
        setClientSecret(intentData.clientSecret);
        setSubscriptionId(intentData.subscriptionId);
      })
      .catch((err) => setLoadError(err.message || "Erro de ligação."));
  }, [plan.priceId]);

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-t-3xl border border-border w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500"
        style={{ paddingBottom: "calc(1rem + var(--safe-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/70 text-muted-foreground transition-colors z-10"
          data-testid="btn-close-subscription-modal"
        >
          <X size={18} />
        </button>

        {loadError ? (
          <div className="px-6 py-10 text-center flex flex-col items-center gap-3">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </div>
        ) : !clientSecret || !stripePromise ? (
          <div className="px-6 py-12 flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-amber-500" />
            <p className="text-sm text-muted-foreground">A preparar pagamento seguro...</p>
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: isDark ? "night" : "stripe",
                variables: {
                  borderRadius: "12px",
                  fontSizeBase: "15px",
                  colorPrimary: "#f59e0b",
                },
              },
            }}
          >
            <PaymentForm
              plan={plan}
              subscriptionId={subscriptionId}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
