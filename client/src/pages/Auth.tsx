import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, XCircle, Shield, X } from "lucide-react";
import iconLight from "@/assets/images/icon-light.png";
import iconDark from "@/assets/images/icon-dark.png";
import { useTheme } from "next-themes";
import { Capacitor } from "@capacitor/core";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: any) => void;
        signIn: () => Promise<any>;
      };
    };
  }
}

export default function Auth({ onRegisterSuccess, initialError }: { onRegisterSuccess: () => void; initialError?: string | null }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [success, setSuccess] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [emailValidation, setEmailValidation] = useState<{ status: "idle" | "checking" | "valid" | "invalid"; message?: string; suggestion?: string }>({ status: "idle" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const emailValidationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login, register, loginWithGoogle, loginWithApple } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const isIOS = Capacitor.getPlatform() === "ios";
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    fetch("/api/auth/google-client-id")
      .then(r => r.json())
      .then(data => {
        if (data.clientId) setGoogleClientId(data.clientId);
      })
      .catch(() => {});
  }, []);

  const handleGoogleCallback = useCallback(async (response: any) => {
    if (!response.credential) return;
    setIsSubmitting(true);
    setError("");
    try {
      await loginWithGoogle(response.credential);
    } catch (err: any) {
      setError("Erro ao fazer login com Google. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [loginWithGoogle]);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleClientId || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCallback,
      use_fedcm_for_prompt: false,
    });

    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: googleBtnRef.current.offsetWidth,
        text: "continue_with",
        logo_alignment: "center",
      });
      setGoogleReady(true);
    }
  }, [googleClientId, handleGoogleCallback, mode]);

  const validateEmail = useCallback((emailValue: string) => {
    if (emailValidationTimer.current) {
      clearTimeout(emailValidationTimer.current);
    }

    if (!emailValue || !emailValue.includes("@") || !emailValue.includes(".")) {
      setEmailValidation({ status: "idle" });
      return;
    }

    setEmailValidation({ status: "checking" });

    emailValidationTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/validate-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailValue }),
        });
        const data = await res.json();
        if (data.valid) {
          setEmailValidation({ status: "valid", message: "Email válido" });
        } else {
          setEmailValidation({ status: "invalid", message: data.reason, suggestion: data.suggestion });
        }
      } catch {
        setEmailValidation({ status: "idle" });
      }
    }, 600);
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (mode === "register") {
      validateEmail(val);
    }
  };

  const applySuggestion = () => {
    if (emailValidation.suggestion) {
      setEmail(emailValidation.suggestion);
      setEmailValidation({ status: "valid", message: "Email válido" });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        await register(name, email, password);
        localStorage.setItem("casa-dos-20-user-name", name);
        onRegisterSuccess();
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("409")) {
        setError("Este email já está cadastrado.");
      } else if (msg.includes("401")) {
        setError("Email ou senha incorretos.");
      } else if (msg.includes("400")) {
        try {
          const body = JSON.parse(msg);
          if (body.suggestion) {
            setEmailValidation({ status: "invalid", message: body.message, suggestion: body.suggestion });
          }
          setError(body.message || "Email inválido.");
        } catch {
          setError("Email inválido ou domínio não reconhecido.");
        }
      } else {
        setError(mode === "login" ? "Erro ao fazer login. Tente novamente." : "Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erro ao enviar email.");
        return;
      }
      setForgotSent(true);
      setSuccess(data.message);
    } catch {
      setError("Erro ao enviar email. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadAppleSDK = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.AppleID) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar SDK da Apple"));
      document.head.appendChild(script);
    });
  }, []);

  const handleAppleSignIn = useCallback(async () => {
    setIsSubmitting(true);
    setError("");
    try {
      if (isNative && isIOS) {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
        const result = await SignInWithApple.authorize({
          clientId: "com.casados20.app",
          redirectURI: "https://casados20.replit.app",
          scopes: "email name",
        });
        if (result.response?.identityToken) {
          await loginWithApple(
            result.response.identityToken,
            result.response.user,
            result.response.givenName || result.response.familyName
              ? { givenName: result.response.givenName, familyName: result.response.familyName }
              : undefined
          );
        }
      } else {
        await loadAppleSDK();
        window.AppleID!.auth.init({
          clientId: "com.casados20.app",
          scope: "email name",
          redirectURI: "https://casados20.replit.app",
          usePopup: true,
        });
        const result = await window.AppleID!.auth.signIn();
        if (result.authorization?.id_token) {
          await loginWithApple(
            result.authorization.id_token,
            result.user?.email,
            result.user?.name
              ? { givenName: result.user.name.firstName, familyName: result.user.name.lastName }
              : undefined
          );
        }
      }
    } catch (err: any) {
      const msg = err?.message || err?.error || "";
      if (msg !== "The user canceled the sign-in flow." && msg !== "popup_closed_by_user") {
        setError("Erro ao fazer login com Apple. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isNative, isIOS, loginWithApple, loadAppleSDK]);

  const isLoginValid = email.includes("@") && password.length >= 1;
  const isRegisterValid = email.includes("@") && password.length >= 4 && name.trim().length > 0 && emailValidation.status !== "invalid" && acceptedTerms;
  const isForgotValid = email.includes("@") && !forgotSent;
  const isValid = mode === "login" ? isLoginValid : mode === "register" ? isRegisterValid : isForgotValid;

  const iconSrc = resolvedTheme === "dark" ? iconDark : iconLight;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center space-y-3 relative">
          {/* Aquarela decorativa — evoca a capa do livro */}
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full opacity-30 dark:opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(210 55% 72%) 0%, hsl(210 45% 80%) 50%, transparent 75%)" }}
          />
          <p className="relative text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-muted-foreground border-b border-muted-foreground/30 pb-1.5 px-4">
            Devocional
          </p>
          <div className="relative text-center leading-none">
            <div className="text-[3.5rem] font-serif font-black text-foreground leading-none">365</div>
            <div className="text-xl font-serif font-bold text-foreground uppercase tracking-wide leading-tight">Encontros</div>
            <div className="text-xl font-serif font-bold text-foreground uppercase tracking-wide leading-tight">
              com <span className="text-primary">Deus Pai</span>
            </div>
          </div>
          <p className="relative text-xs text-muted-foreground text-center mt-1">
            {mode === "login" ? "Bem-vindo de volta" : mode === "register" ? "Cria a tua conta" : "Recuperar palavra-passe"}
          </p>
        </div>

        <div className="w-full space-y-4">
          {mode !== "forgot" && (
            <>
              {!isNative && (
                <a
                  href={typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches ? "/api/auth/google-oauth?source=pwa" : "/api/auth/google-oauth"}
                  className="w-full h-12 rounded-xl border border-border bg-white dark:bg-muted flex items-center justify-center gap-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-all"
                  data-testid="button-google-login"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar com Google
                </a>
              )}
              <div ref={googleBtnRef} className="hidden" />

              <button
                onClick={handleAppleSignIn}
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl border border-border bg-black dark:bg-white flex items-center justify-center gap-3 text-sm font-medium text-white dark:text-black hover:opacity-90 transition-all"
                data-testid="button-apple-login"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continuar com Apple
              </button>

              <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
                Ao continuar, você concorda com os{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="underline hover:text-primary"
                  data-testid="button-social-terms"
                >
                  Termos de Uso e Política de Privacidade
                </button>
              </p>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          {mode === "forgot" && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound size={16} className="text-primary" />
                <p className="text-sm font-medium text-foreground">Recuperar senha</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {forgotSent
                  ? "Verifique seu email (incluindo a caixa de spam) e clique no link para redefinir sua senha."
                  : "Insira seu email e enviaremos um link para redefinir sua senha."}
              </p>
            </div>
          )}

          {mode === "register" && (
            <Input
              type="text"
              placeholder="Como quer ser chamado?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl bg-card border-border/60 text-center font-serif text-lg focus-visible:ring-primary/40 focus-visible:border-primary shadow-sm transition-all"
              data-testid="input-name"
            />
          )}

          <div className="relative">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={handleEmailChange}
              className={`h-12 rounded-xl bg-white/50 text-center font-sans focus-visible:ring-primary/20 pr-10 ${
                mode === "register" && emailValidation.status === "valid"
                  ? "border-green-400/70"
                  : mode === "register" && emailValidation.status === "invalid"
                  ? "border-red-400/70"
                  : "border-border/50"
              }`}
              data-testid="input-email"
            />
            {mode === "register" && emailValidation.status === "checking" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="animate-spin text-muted-foreground" size={16} />
              </div>
            )}
            {mode === "register" && emailValidation.status === "valid" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckCircle2 className="text-green-500" size={16} />
              </div>
            )}
            {mode === "register" && emailValidation.status === "invalid" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <XCircle className="text-red-500" size={16} />
              </div>
            )}
          </div>

          {mode === "register" && emailValidation.status === "invalid" && emailValidation.message && (
            <div className="space-y-1">
              <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1" data-testid="text-email-validation-error">
                <AlertCircle size={12} />
                {emailValidation.message}
              </p>
              {emailValidation.suggestion && (
                <button
                  onClick={applySuggestion}
                  className="w-full text-xs text-primary font-medium hover:underline text-center"
                  data-testid="button-email-suggestion"
                >
                  Usar {emailValidation.suggestion}
                </button>
              )}
            </div>
          )}

          {mode !== "forgot" && (
            <Input
              type="password"
              placeholder={mode === "login" ? "Sua senha" : "Crie uma senha (min. 4 caracteres)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-card border-border/60 text-center font-serif text-lg focus-visible:ring-primary/40 focus-visible:border-primary shadow-sm transition-all"
              data-testid="input-password"
            />
          )}

          {mode === "register" && (
            <label className="flex items-start gap-3 cursor-pointer group" data-testid="label-accept-terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer"
                data-testid="checkbox-accept-terms"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                Li e aceito os{" "}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                  className="text-primary underline hover:text-primary/80"
                  data-testid="button-view-terms"
                >
                  Termos de Uso e Política de Privacidade
                </button>
              </span>
            </label>
          )}

          {error && (
            <p className="text-xs text-red-500 text-center" data-testid="text-auth-error">{error}</p>
          )}
          {success && (
            <p className="text-xs text-green-600 text-center" data-testid="text-auth-success">{success}</p>
          )}

          <Button
            onClick={mode === "forgot" ? handleForgotPassword : handleSubmit}
            disabled={isSubmitting || !isValid}
            className="w-full h-14 rounded-full bg-primary text-primary-foreground text-lg font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
            data-testid="button-auth-submit"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {mode === "login" ? "Entrar" : mode === "register" ? "Criar Conta" : forgotSent ? "Email Enviado" : "Enviar Link"}
                {!forgotSent && <ArrowRight className="ml-2" size={20} />}
                {forgotSent && <Mail className="ml-2" size={20} />}
              </>
            )}
          </Button>

          {mode === "login" && (
            <button
              onClick={() => { setMode("forgot"); setError(""); setSuccess(""); setForgotSent(false); }}
              className="w-full text-xs text-muted-foreground hover:text-primary transition-colors text-center"
              data-testid="button-forgot-password"
            >
              Esqueceu a senha?
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          {mode === "forgot" ? (
            <button
              onClick={() => { setMode("login"); setError(""); setSuccess(""); setForgotSent(false); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              data-testid="button-back-to-login"
            >
              <ArrowLeft size={14} />
              Voltar para login
            </button>
          ) : (
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setEmailValidation({ status: "idle" }); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-auth-mode"
            >
              {mode === "login" ? (
                <>Não tem conta? <span className="text-primary font-medium">Criar conta</span></>
              ) : (
                <>Já tem conta? <span className="text-primary font-medium">Entrar</span></>
              )}
            </button>
          )}
        </div>

        <button
          onClick={() => setShowTerms(true)}
          className="text-[10px] text-muted-foreground text-center px-4 underline hover:text-primary transition-colors"
          data-testid="button-footer-terms"
        >
          Termos de Uso e Política de Privacidade
        </button>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setShowTerms(false)}>
          <div
            className="bg-background w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="text-primary" size={18} />
                <h2 className="text-base font-serif font-semibold">Termos de Uso e Privacidade</h2>
              </div>
              <button onClick={() => setShowTerms(false)} className="p-1 rounded-full hover:bg-muted" data-testid="button-close-terms">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-5 text-sm text-foreground/90 leading-relaxed" data-testid="terms-content">
              <div>
                <h3 className="font-semibold text-foreground mb-2">1. Sobre o 365 Encontros com Deus Pai</h3>
                <p>O 365 Encontros com Deus Pai é um aplicativo devocional diário baseado no livro homónimo, com diário pessoal, reflexões, orações e comunidade cristã.</p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  <Shield size={16} />
                  2. Privacidade das suas respostas
                </h3>
                <p className="font-medium">Suas respostas no diário, nas perguntas reflexivas e nas jornadas são completamente privadas.</p>
                <ul className="mt-2 space-y-1.5 text-foreground/80">
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Nenhum administrador, moderador ou criador do app tem acesso ao conteúdo que você escreve.</li>
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Suas reflexões pessoais não são lidas, compartilhadas, vendidas ou usadas para qualquer fim.</li>
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>O app é um espaço seguro e privado para o seu autoconhecimento.</li>
                </ul>
              </div>

              <div className="bg-muted/40 border border-border rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-primary" />
                  3. Proteção técnica dos seus dados
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <Shield size={14} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-xs">E-mail criptografado</p>
                      <p className="text-foreground/70 text-xs">Seu e-mail é armazenado com criptografia AES-256-GCM — o mesmo padrão usado por bancos. Mesmo que alguém acesse o banco de dados, não consegue ler seu e-mail.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield size={14} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-xs">Senha nunca armazenada</p>
                      <p className="text-foreground/70 text-xs">Sua senha passa por hashing irreversível (scrypt) antes de ser salva. Nem nós conseguimos saber qual é a sua senha.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield size={14} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-xs">Proteção contra ataques</p>
                      <p className="text-foreground/70 text-xs">O sistema bloqueia automaticamente tentativas repetidas de login ou acesso não autorizado.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield size={14} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-xs">Dados de cartão protegidos pela Stripe</p>
                      <p className="text-foreground/70 text-xs">Não armazenamos nenhum dado de cartão. Os pagamentos são processados diretamente pela Stripe (certificada PCI DSS nível 1).</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">4. Dados coletados</h3>
                <p>Coletamos apenas o mínimo necessário para o funcionamento do app:</p>
                <ul className="mt-2 space-y-1 text-foreground/80">
                  <li className="flex items-start gap-2"><span className="text-muted-foreground mt-0.5">•</span>Nome e e-mail (armazenado de forma criptografada)</li>
                  <li className="flex items-start gap-2"><span className="text-muted-foreground mt-0.5">•</span>Dados de progresso (quais jornadas e capítulos você completou)</li>
                  <li className="flex items-start gap-2"><span className="text-muted-foreground mt-0.5">•</span>Preferências de notificação</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">5. Uso do aplicativo</h3>
                <ul className="space-y-1 text-foreground/80">
                  <li className="flex items-start gap-2"><span className="text-muted-foreground mt-0.5">•</span>O app é gratuito com recursos premium opcionais.</li>
                  <li className="flex items-start gap-2"><span className="text-muted-foreground mt-0.5">•</span>Você pode excluir sua conta e todos os seus dados a qualquer momento.</li>
                  <li className="flex items-start gap-2"><span className="text-muted-foreground mt-0.5">•</span>Não compartilhe conteúdo ofensivo ou ilegal dentro do app.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">6. Pagamentos</h3>
                <p>Assinaturas premium são processadas pela Stripe (certificada PCI DSS nível 1). Nenhum dado de cartão é armazenado nos nossos servidores — apenas um identificador de referência da Stripe. Você pode cancelar a qualquer momento.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">7. Contato</h3>
                <p>Em caso de dúvidas, entre em contato pelo e-mail: <span className="text-primary font-medium">quinzinhooliveiraa@gmail.com</span></p>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">Última atualização: Março de 2026</p>
            </div>
            <div className="p-4 border-t border-border">
              <Button
                onClick={() => { setAcceptedTerms(true); setShowTerms(false); }}
                className="w-full h-12 rounded-full"
                data-testid="button-accept-terms"
              >
                Li e aceito os termos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
