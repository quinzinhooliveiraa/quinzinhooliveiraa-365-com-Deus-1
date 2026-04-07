import { useState } from "react";
import { X, ShieldCheck, CreditCard, Gift, ChevronRight, PartyPopper } from "lucide-react";
import CardSetupModal from "./CardSetupModal";

interface WelcomeTrialModalProps {
  userId: string;
  trialEndsAt: string | null;
  trialBonusClaimed: boolean;
  onClose: () => void;
}

export default function WelcomeTrialModal({ userId, trialBonusClaimed, onClose }: WelcomeTrialModalProps) {
  const [showCardModal, setShowCardModal] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    localStorage.setItem(`casa-welcome-seen-${userId}`, "1");
    onClose();
  };

  const handleSuccess = () => {
    setShowCardModal(false);
    setSuccess(true);
    setTimeout(() => {
      localStorage.setItem(`casa-welcome-seen-${userId}`, "1");
      onClose();
    }, 2500);
  };

  if (trialBonusClaimed) return null;

  if (showCardModal) {
    return (
      <CardSetupModal
        onSuccess={handleSuccess}
        onClose={() => setShowCardModal(false)}
      />
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div
          className="relative bg-card rounded-t-3xl border border-border w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 px-6 py-10 text-center"
          style={{ paddingBottom: "calc(2.5rem + var(--safe-bottom))" }}
        >
          <PartyPopper size={40} className="mx-auto mb-3 text-yellow-500" />
          <h2 className="text-xl font-bold font-serif text-foreground mb-1">Bónus ativado!</h2>
          <p className="text-sm text-muted-foreground">O teu trial foi alargado para <strong className="text-foreground">30 dias grátis</strong>. Aproveita!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}
    >
      <div
        className="relative bg-card rounded-t-3xl border border-border w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500"
        style={{ paddingBottom: "calc(1.5rem + var(--safe-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/70 text-muted-foreground transition-colors z-10"
          data-testid="btn-close-welcome-modal"
        >
          <X size={18} />
        </button>

        <div className="px-6 pt-7 pb-3">
          <p className="text-3xl mb-3">🎁</p>
          <h2 className="text-xl font-bold font-serif text-foreground mb-1">
            Ganha mais 16 dias grátis
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Regista o cartão para ficares com <strong className="text-foreground">30 dias grátis</strong> no total.
          </p>
        </div>

        <div className="px-6 pb-1">
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                <CreditCard size={14} className="text-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Registas o cartão aqui mesmo</p>
                <p className="text-[11px] text-muted-foreground">Seguro — <strong className="text-foreground">sem qualquer cobrança agora</strong></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                <Gift size={14} className="text-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Recebes 30 dias grátis</p>
                <p className="text-[11px] text-muted-foreground">O trial passa de 14 para 30 dias completos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                <ChevronRight size={14} className="text-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Decides depois</p>
                <p className="text-[11px] text-muted-foreground">Só pagas se quiseres continuar após os 30 dias</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pt-3 space-y-2">
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <ShieldCheck size={12} className="text-green-500 shrink-0" />
            <p className="text-[11px] text-muted-foreground">Nenhuma cobrança hoje. Cancela a qualquer momento.</p>
          </div>

          <button
            onClick={() => setShowCardModal(true)}
            className="w-full py-3.5 rounded-2xl bg-foreground text-background font-semibold text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            data-testid="btn-claim-bonus"
          >
            <CreditCard size={18} />
            Registar cartão e ganhar 30 dias
          </button>

          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="btn-close-later"
          >
            Ficar só com os 14 dias
          </button>
        </div>
      </div>
    </div>
  );
}
