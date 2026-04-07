import { useState, useEffect } from "react";
import { X, ShieldCheck, CreditCard, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface CardSetupModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

function CardForm({ onSuccess, onClose }: CardSetupModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cardReady, setCardReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      const res = await fetch("/api/stripe/create-setup-intent", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erro ao iniciar. Tenta novamente.");
        setLoading(false);
        return;
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        data.clientSecret,
        { payment_method: { card: cardElement } }
      );

      if (stripeError) {
        setError(stripeError.message || "Erro ao guardar cartão. Verifica os dados.");
        setLoading(false);
        return;
      }

      if (setupIntent?.status === "succeeded") {
        const confirmRes = await fetch("/api/stripe/confirm-bonus", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setupIntentId: setupIntent.id }),
        });
        const confirmData = await confirmRes.json();
        if (!confirmRes.ok) {
          setError(confirmData.message || "Erro ao ativar bónus.");
          setLoading(false);
          return;
        }
        onSuccess();
      } else {
        setError("Não foi possível confirmar o cartão. Tenta novamente.");
        setLoading(false);
      }
    } catch {
      setError("Erro de ligação. Tenta novamente.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="px-6 pt-7 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
            <CreditCard size={20} className="text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif text-foreground leading-tight">
              Ativa os teus 30 dias grátis
            </h2>
            <p className="text-xs text-muted-foreground">Cartão necessário para iniciar o trial</p>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-5">
          <div className="flex items-start gap-2">
            <ShieldCheck size={15} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
              <strong>30 dias gratuitos a começar agora.</strong> Após o trial, a assinatura é cobrada automaticamente. Podes cancelar a qualquer momento pelo app.
            </p>
          </div>
        </div>

        <div className="mb-2">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Dados do cartão
          </label>
          <div className="border border-border rounded-xl px-4 py-3.5 bg-background focus-within:border-foreground/40 transition-colors">
            <CardElement
              onChange={(e) => setCardReady(e.complete)}
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "var(--foreground)",
                    "::placeholder": { color: "var(--muted-foreground)" },
                    fontFamily: "inherit",
                  },
                  invalid: { color: "#ef4444" },
                },
                hidePostalCode: true,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <Lock size={11} className="text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">Protegido pelo Stripe — os teus dados nunca passam pelos nossos servidores</p>
        </div>
      </div>

      <div className="px-6 pb-2 space-y-2 mt-auto">
        {error && (
          <p className="text-xs text-red-500 text-center py-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !stripe || !cardReady}
          data-testid="btn-confirm-card"
          className="w-full py-3.5 rounded-2xl bg-foreground text-background font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CreditCard size={18} />
          {loading ? "A ativar..." : "Começar 30 dias grátis"}
        </button>

        <button
          type="button"
          onClick={onClose}
          data-testid="btn-cancel-card"
          className="w-full py-2.5 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function CardSetupModal({ onSuccess, onClose }: CardSetupModalProps) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [configError, setConfigError] = useState("");

  useEffect(() => {
    fetch("/api/stripe/config", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.publishableKey) {
          setStripePromise(loadStripe(d.publishableKey));
        } else {
          setConfigError("Stripe não disponível de momento.");
        }
      })
      .catch(() => setConfigError("Erro de ligação."));
  }, []);

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
          data-testid="btn-close-card-modal"
        >
          <X size={18} />
        </button>

        {configError ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">{configError}</p>
          </div>
        ) : !stripePromise ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">A carregar...</p>
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <CardForm onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        )}
      </div>
    </div>
  );
}
