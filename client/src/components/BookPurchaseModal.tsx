import { useState, useEffect } from "react";
import { X, BookOpen, Lock, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";

interface BookPurchaseModalProps {
  priceLabel: string;
  onSuccess: () => void;
  onClose: () => void;
  libraryBookId?: number;
  libraryBookTitle?: string;
}

function PaymentForm({ priceLabel, onSuccess, onClose, libraryBookId, libraryBookTitle }: BookPurchaseModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);

  const isLibrary = !!libraryBookId;
  const title = isLibrary ? (libraryBookTitle || "Livro") : "365 Encontros com Deus Pai";
  const confirmUrl = isLibrary
    ? `/api/library/books/${libraryBookId}/confirm-purchase`
    : "/api/book/confirm-purchase";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });

      if (stripeError) {
        setError(stripeError.message || "Erro no pagamento. Verifica os dados.");
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        const confirmRes = await fetch(confirmUrl, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        const confirmData = await confirmRes.json();
        if (!confirmRes.ok) {
          setError(confirmData.error || "Erro ao confirmar compra.");
          setLoading(false);
          return;
        }
        setSuccess(true);
        if (isLibrary) {
          queryClient.invalidateQueries({ queryKey: ["/api/library/books"] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["/api/book/purchase-status"] });
          queryClient.invalidateQueries({ queryKey: ["/api/book/chapters"] });
        }
        setTimeout(() => onSuccess(), 1800);
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
        <h2 className="text-xl font-bold font-serif text-foreground">Livro desbloqueado!</h2>
        <p className="text-sm text-muted-foreground">
          {isLibrary ? "Podes ler agora na Biblioteca." : "Todos os capítulos estão agora disponíveis para ti."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="px-6 pt-7 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif text-foreground leading-tight">
              Comprar acesso ao livro
            </h2>
            <p className="text-xs text-muted-foreground">Leitura completa no app · acesso permanente</p>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5 flex items-center justify-between">
          <span className="text-sm text-foreground font-medium">{title}</span>
          <span className="text-base font-bold text-primary">{priceLabel}</span>
        </div>

        <div className="mb-4">
          <PaymentElement
            onReady={() => setReady(true)}
            options={{
              layout: "tabs",
              paymentMethodOrder: ["apple_pay", "google_pay", "card"],
              wallets: { applePay: "auto", googlePay: "auto" },
            }}
          />
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          <Lock size={11} className="text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">Protegido pelo Stripe · os teus dados nunca passam pelos nossos servidores</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
              Pagamento único · sem subscrição · acesso para sempre
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
          data-testid="btn-confirm-book-purchase"
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? "A processar..." : `Comprar por ${priceLabel}`}
        </button>

        <button
          type="button"
          onClick={onClose}
          data-testid="btn-cancel-book-purchase"
          className="w-full py-2.5 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function BookPurchaseModal({ priceLabel, onSuccess, onClose, libraryBookId, libraryBookTitle }: BookPurchaseModalProps) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loadError, setLoadError] = useState("");

  const isLibrary = !!libraryBookId;
  const intentUrl = isLibrary
    ? `/api/library/books/${libraryBookId}/create-payment-intent`
    : "/api/book/create-payment-intent";

  useEffect(() => {
    const keyFetch = fetch("/api/stripe/config", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.publishableKey) return loadStripe(d.publishableKey);
        throw new Error("Stripe não configurado.");
      });

    const intentFetch = fetch(intentUrl, { method: "POST", credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.clientSecret) throw new Error(d.error || "Erro ao criar pagamento.");
        return d;
      });

    Promise.all([keyFetch, intentFetch])
      .then(([stripeInst, intentData]) => {
        setStripePromise(Promise.resolve(stripeInst));
        setClientSecret(intentData.clientSecret);
      })
      .catch((err) => setLoadError(err.message || "Erro de ligação."));
  }, [intentUrl]);

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
          data-testid="btn-close-book-purchase"
        >
          <X size={18} />
        </button>

        {loadError ? (
          <div className="px-6 py-10 text-center flex flex-col items-center gap-3">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </div>
        ) : !clientSecret || !stripePromise ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">A carregar...</p>
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: isDark ? "night" : "stripe",
                variables: { borderRadius: "12px", fontSizeBase: "15px" },
              },
            }}
          >
            <PaymentForm
              priceLabel={priceLabel}
              onSuccess={onSuccess}
              onClose={onClose}
              libraryBookId={libraryBookId}
              libraryBookTitle={libraryBookTitle}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
