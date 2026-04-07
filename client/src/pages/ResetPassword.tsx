import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import iconLight from "@/assets/images/icon-light.png";
import iconDark from "@/assets/images/icon-dark.png";
import { useTheme } from "next-themes";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const token = new URLSearchParams(searchString).get("token");
  const { resolvedTheme } = useTheme();
  const iconSrc = resolvedTheme === "dark" ? iconDark : iconLight;

  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erro ao redefinir senha.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        navigate("/");
        window.location.reload();
      }, 2000);
    } catch {
      setError("Erro ao redefinir senha. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm flex flex-col items-center space-y-6 text-center">
          <img src={iconSrc} alt="365 Encontros com Deus Pai" className="w-20 h-20 object-contain" />
          <h2 className="text-xl font-serif text-foreground">Link inválido</h2>
          <p className="text-sm text-muted-foreground">Este link de recuperação é inválido ou expirou.</p>
          <Button
            onClick={() => navigate("/")}
            className="rounded-full px-8"
            data-testid="button-back-home"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm flex flex-col items-center space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
          </div>
          <h2 className="text-xl font-serif text-foreground">Senha redefinida!</h2>
          <p className="text-sm text-muted-foreground">Sua nova senha foi salva. Redirecionando...</p>
        </div>
      </div>
    );
  }

  const isValid = newPassword.length >= 4 && confirmPassword.length >= 4;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
            <img src={iconSrc} alt="365 Encontros com Deus Pai" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-serif text-foreground tracking-wide">365 Encontros</h1>
          <p className="text-sm text-muted-foreground">Escolha sua nova senha</p>
        </div>

        <div className="w-full space-y-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound size={16} className="text-primary" />
              <p className="text-sm font-medium text-foreground">Nova senha</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Escolha uma senha com pelo menos 4 caracteres.
            </p>
          </div>

          <Input
            type="password"
            placeholder="Nova senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-12 rounded-xl bg-white/50 border-border/50 text-center font-sans focus-visible:ring-primary/20"
            autoFocus
            data-testid="input-new-password"
          />

          <Input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-xl bg-white/50 border-border/50 text-center font-sans focus-visible:ring-primary/20"
            data-testid="input-confirm-password"
          />

          {error && (
            <p className="text-xs text-red-500 text-center" data-testid="text-reset-error">{error}</p>
          )}

          <Button
            onClick={handleReset}
            disabled={isSubmitting || !isValid}
            className="w-full h-14 rounded-full bg-primary text-primary-foreground text-lg font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
            data-testid="button-reset-submit"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Redefinir Senha
                <ArrowRight className="ml-2" size={20} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
