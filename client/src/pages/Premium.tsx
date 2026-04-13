import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Crown, Check, Sparkles, PenLine, Map, Ticket, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useLocation } from "wouter";
import SubscriptionCheckoutModal from "@/components/SubscriptionCheckoutModal";
import { useGeoPrice } from "@/hooks/useGeoPrice";

export default function Premium() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { price: geo } = useGeoPrice();
  const [checkoutPlan, setCheckoutPlan] = useState<{
    priceId: string;
    label: string;
    priceFormatted: string;
    interval: string;
    periodShort: string;
    badge?: string;
  } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        alert(data.message || "Erro ao abrir o portal. Tenta novamente.");
      }
    } catch {
      alert("Erro ao abrir o portal. Tenta novamente.");
    } finally {
      setPortalLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCouponMsg({ text: data.message, ok: true });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setCouponCode("");
      } else {
        setCouponMsg({ text: data.message, ok: false });
      }
    } catch {
      setCouponMsg({ text: "Erro ao aplicar o cupão. Tenta novamente.", ok: false });
    } finally {
      setCouponLoading(false);
    }
  };

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/stripe/products"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/products");
      return res.json();
    },
  });

  function getPeriodLabel(recurring: { interval: string; interval_count?: number } | null): string {
    if (!recurring) return "Vitalício";
    const { interval, interval_count } = recurring;
    if (interval === "week") return "Semanal";
    if (interval === "month" && interval_count === 3) return "Trimestral";
    if (interval === "month" && interval_count === 6) return "Semestral";
    if (interval === "month") return "Mensal";
    if (interval === "year") return "Anual";
    return "Personalizado";
  }

  function getPeriodShort(recurring: { interval: string; interval_count?: number } | null): string {
    if (!recurring) return "único";
    const { interval, interval_count } = recurring;
    if (interval === "week") return "semana";
    if (interval === "month" && interval_count === 3) return "3 meses";
    if (interval === "month" && interval_count === 6) return "6 meses";
    if (interval === "month") return "mês";
    if (interval === "year") return "ano";
    return "período";
  }

  function getPriceFormatted(p: any): string {
    const rec = p.recurring as { interval: string; interval_count?: number } | null;
    if (rec?.interval === "month" && !rec?.interval_count) return geo.monthlyFormatted;
    if (rec?.interval === "year") return geo.yearlyFormatted;
    return `R$ ${((p.unit_amount ?? 0) / 100).toFixed(2).replace(".", ",")}`;
  }

  const sortedPlans = [...products].sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));
  const bestValuePlan = [...products]
    .filter((p: any) => p.recurring)
    .sort((a, b) => (b.unit_amount ?? 0) - (a.unit_amount ?? 0))[0];

  const handleCheckout = (p: any) => {
    const rec = p.recurring as { interval: string; interval_count?: number } | null;
    const label = getPeriodLabel(rec);
    const priceFormatted = getPriceFormatted(p);
    const periodShort = getPeriodShort(rec);
    const interval = rec ? (rec.interval_count ? `month_${rec.interval_count}` : rec.interval) : "one_time";
    setCheckoutPlan({ priceId: p.price_id, label, priceFormatted, interval, periodShort });
  };

  const handleCheckoutSuccess = () => {
    setCheckoutPlan(null);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const features = [
    { icon: Sparkles, text: "Todas as cartas de reflexão desbloqueadas" },
    { icon: Map, text: "Jornadas de 30 dias completas" },
    { icon: PenLine, text: "Diário ilimitado com todas as funcionalidades" },
  ];


  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-500" data-testid="page-premium">
      {checkoutPlan && (
        <SubscriptionCheckoutModal
          plan={checkoutPlan}
          onSuccess={handleCheckoutSuccess}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
      <div className="p-4">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-serif mb-2" data-testid="text-premium-title">
            365 Encontros Premium
          </h1>
          <p className="text-muted-foreground">
            Desbloqueie todo o conteúdo e transforme sua jornada de autoconhecimento.
          </p>
        </div>

        {user?.hasPremium && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center space-y-3" data-testid="premium-active-banner">
            <p className="text-green-600 dark:text-green-400 font-semibold">Já tens o Premium ativo!</p>
            <p className="text-sm text-muted-foreground">Obrigado pelo apoio a 365 Encontros com Deus Pai.</p>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover-elevate transition-colors disabled:opacity-50"
              data-testid="btn-manage-subscription"
            >
              <Settings size={15} />
              {portalLoading ? "A abrir..." : "Gerir ou cancelar assinatura"}
            </button>
          </div>
        )}

        <div className="space-y-3 mb-8">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-lg border" data-testid={`feature-${i}`}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">{f.text}</span>
              <Check className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {sortedPlans.map((p: any) => {
            const rec = p.recurring as { interval: string; interval_count?: number } | null;
            const label = getPeriodLabel(rec);
            const short = getPeriodShort(rec);
            const priceFormatted = getPriceFormatted(p);
            const isBest = bestValuePlan && p.price_id === bestValuePlan.price_id;
            const isLifetime = !rec;
            return (
              <button
                key={p.price_id}
                onClick={() => handleCheckout(p)}
                className={`w-full p-4 rounded-xl border-2 transition-colors text-left relative ${
                  isLifetime
                    ? "border-purple-500 bg-purple-500/5"
                    : isBest
                    ? "border-amber-500 bg-amber-500/5"
                    : "border-primary bg-primary/5"
                }`}
                data-testid={`button-checkout-${p.price_id}`}
              >
                {isBest && !isLifetime && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MELHOR VALOR
                  </div>
                )}
                {isLifetime && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    VITALÍCIO
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-lg">{p.product_name || label}</p>
                    <p className="text-muted-foreground text-sm truncate">
                      {p.product_description || (isLifetime ? "Acesso permanente" : "Cancele quando quiser")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold ${isLifetime ? "text-purple-600 dark:text-purple-400" : isBest ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}>
                      {priceFormatted}
                    </p>
                    <p className="text-xs text-muted-foreground">/{short}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {geo.currency !== "BRL" && (
          <p className="text-[10px] text-muted-foreground text-center mt-3 px-2">
            Valor aproximado. A cobrança é feita em BRL pelo Stripe.
          </p>
        )}

        <div className="mt-6 border border-border rounded-xl overflow-hidden" data-testid="section-coupon">
          <button
            onClick={() => { setCouponOpen(!couponOpen); setCouponMsg(null); }}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="btn-toggle-coupon"
          >
            <div className="flex items-center gap-2">
              <Ticket size={16} />
              Tens um cupão de desconto?
            </div>
            {couponOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {couponOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && applyCoupon()}
                  placeholder="Código do cupão"
                  className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal"
                  data-testid="input-coupon-code-user"
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50"
                  data-testid="btn-apply-coupon"
                >
                  {couponLoading ? "..." : "Aplicar"}
                </button>
              </div>
              {couponMsg && (
                <p className={`text-sm text-center font-medium ${couponMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}`} data-testid="coupon-message">
                  {couponMsg.text}
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4" data-testid="text-disclaimer">
          Pagamento seguro via Stripe. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
}