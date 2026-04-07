import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Crown, Check, Sparkles, PenLine, Map, Gift, Ticket, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import CardSetupModal from "@/components/CardSetupModal";
import SubscriptionCheckoutModal from "@/components/SubscriptionCheckoutModal";
import { useGeoPrice } from "@/hooks/useGeoPrice";

export default function Premium() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { price: geo } = useGeoPrice();
  const [showCardModal, setShowCardModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<{
    priceId: string;
    label: string;
    priceFormatted: string;
    interval: "month" | "year";
    badge?: string;
  } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

  const monthlyPrice = products.find((p: any) => p.recurring?.interval === "month");
  const yearlyPrice = products.find((p: any) => p.recurring?.interval === "year");

  const handleCheckout = (priceId: string, label: string, priceFormatted: string, interval: "month" | "year") => {
    setCheckoutPlan({ priceId, label, priceFormatted, interval });
  };

  const handleCheckoutSuccess = () => {
    setCheckoutPlan(null);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const handleSetupForBonus = () => {
    setShowCardModal(true);
  };

  const handleCardSuccess = () => {
    setShowCardModal(false);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const features = [
    { icon: Sparkles, text: "Todas as cartas de reflexão desbloqueadas" },
    { icon: Map, text: "Jornadas de 30 dias completas" },
    { icon: PenLine, text: "Diário ilimitado com todas as funcionalidades" },
  ];

  const trialDaysLeft = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const canActivateTrial = !user?.hasPremium && !user?.trialBonusClaimed && user?.role !== "admin";
  const isOnTrial = user?.premiumReason === "trial" && trialDaysLeft > 0;

  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-500" data-testid="page-premium">
      {showCardModal && (
        <CardSetupModal
          onSuccess={handleCardSuccess}
          onClose={() => setShowCardModal(false)}
        />
      )}
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

        {isOnTrial && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-center" data-testid="trial-active-banner">
            <p className="text-amber-700 dark:text-amber-400 font-semibold text-base">
              ✨ {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"} de trial gratuito
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Aproveita para explorar tudo — sem cartão, sem compromisso.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Depois do trial, escolhe um plano para continuar.
            </p>
          </div>
        )}

        {user?.hasPremium && user?.premiumReason !== "trial" && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center" data-testid="premium-active-banner">
            <p className="text-green-600 dark:text-green-400 font-semibold">🌟 Já tens o Premium ativo!</p>
            <p className="text-sm text-muted-foreground mt-1">Obrigado pelo apoio a 365 Encontros com Deus Pai.</p>
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
          {canActivateTrial && (
            <button
              onClick={handleSetupForBonus}
              disabled={!!loading}
              className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-500/5 hover:bg-green-500/10 transition-colors text-left"
              data-testid="button-activate-trial"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-lg">Ganhar 30 dias grátis</p>
                  <p className="text-muted-foreground text-sm">Registas o cartão — <span className="font-medium text-green-600">sem qualquer cobrança agora</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">Só pagas após os 30 dias, se quiseres continuar</p>
                </div>
              </div>
            </button>
          )}

          {monthlyPrice && (
            <button
              onClick={() => handleCheckout(monthlyPrice.price_id, "Mensal", geo.monthlyFormatted, "month")}
              className="w-full p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              data-testid="button-checkout-monthly"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">Mensal</p>
                  <p className="text-muted-foreground text-sm">Cancele quando quiser</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{geo.monthlyFormatted}</p>
                  <p className="text-xs text-muted-foreground">/mês</p>
                </div>
              </div>
            </button>
          )}

          {yearlyPrice && (
            <button
              onClick={() => handleCheckout(yearlyPrice.price_id, "Anual", geo.yearlyFormatted, "year")}
              className="w-full p-4 rounded-xl border-2 border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left relative overflow-hidden"
              data-testid="button-checkout-yearly"
            >
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                ECONOMIZE 33%
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">Anual</p>
                  <p className="text-muted-foreground text-sm">Melhor custo-benefício</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{geo.yearlyFormatted}</p>
                  <p className="text-xs text-muted-foreground">/ano (~{geo.yearlyMonthlyFormatted}/mês)</p>
                </div>
              </div>
            </button>
          )}
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