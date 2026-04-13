import { useState } from "react";
import { Crown, Sparkles, Loader2, CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface PremiumPaywallProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  features?: string[];
  className?: string;
}

export default function PremiumPaywall({
  icon,
  title = "Recurso Premium",
  description = "Este conteúdo é exclusivo para membros Premium.",
  features = [
    "Devocional diário completo",
    "Biblioteca com mais livros",
    "Comunidade de fé",
    "Diário espiritual completo",
  ],
  className = "",
}: PremiumPaywallProps) {
  const [, navigate] = useLocation();
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialActivated, setTrialActivated] = useState(false);
  const [trialError, setTrialError] = useState("");

  const activateTrial = async () => {
    setTrialLoading(true);
    setTrialError("");
    try {
      const res = await fetch("/api/auth/activate-trial", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setTrialActivated(true);
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      } else {
        setTrialError(data.message || "Erro ao ativar trial. Tente novamente.");
      }
    } catch {
      setTrialError("Erro de conexão. Tente novamente.");
    }
    setTrialLoading(false);
  };

  if (trialActivated) {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-8 gap-4 ${className}`}>
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-serif text-foreground">Trial ativado!</h2>
          <p className="text-sm text-muted-foreground">
            Tens <strong className="text-foreground">14 dias grátis</strong> para explorar tudo. Aproveita!
          </p>
        </div>
        <p className="text-xs text-muted-foreground">A carregar o conteúdo...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center p-6 gap-5 ${className}`}>
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        {icon ?? <Crown className="w-7 h-7 text-primary" />}
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold font-serif text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
      </div>

      <div className="w-full max-w-xs space-y-2 text-left">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">{f}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Button
          className="w-full"
          onClick={() => navigate("/premium")}
          data-testid="button-paywall-upgrade"
        >
          <Crown className="w-4 h-4 mr-2" />
          Ver Planos Premium
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground px-1">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {trialError && (
          <p className="text-xs text-destructive text-center" data-testid="text-trial-error">{trialError}</p>
        )}

        <button
          onClick={activateTrial}
          disabled={trialLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover-elevate transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-activate-trial"
        >
          {trialLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Gift className="w-4 h-4 text-primary" />
          )}
          {trialLoading ? "A ativar..." : "Experimentar grátis por 14 dias"}
        </button>

        <p className="text-[10px] text-muted-foreground/70 text-center">
          Sem cartão. Sem compromisso. Cancela a qualquer momento.
        </p>
      </div>
    </div>
  );
}
