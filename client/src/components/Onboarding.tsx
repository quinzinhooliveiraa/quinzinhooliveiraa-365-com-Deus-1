import { useState, useEffect } from "react";
import {
  ArrowRight, ArrowLeft, Bell, Check,
  BookOpen, PenLine, Smile,
  BellRing, Crown, Loader2, CheckCircle2, Clock,
  ShieldCheck, Sparkles,
  Smartphone, Plus, Share, Library, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import bookCover from "@/assets/images/book-cover-oficial.png";
import { subscribeToPush, isPushSupported } from "@/utils/pushNotifications";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import Lottie from "lottie-react";

const STEP_ANIMATIONS: Record<string, string> = {
  welcome:       "https://assets2.lottiefiles.com/packages/lf20_l3kpjnpj.json",
  profile:       "https://assets2.lottiefiles.com/packages/lf20_v1yudlcd.json",
  pwa:           "https://assets5.lottiefiles.com/packages/lf20_pcwuqiwb.json",
  checkin:       "https://assets5.lottiefiles.com/packages/lf20_fcfjwiyb.json",
  journal:       "https://assets6.lottiefiles.com/packages/lf20_oj3avzxk.json",
  book:          "https://assets1.lottiefiles.com/packages/lf20_puciaact.json",
  notifications: "https://assets1.lottiefiles.com/packages/lf20_6yuhewez.json",
  premium:       "https://assets3.lottiefiles.com/packages/lf20_qpkehuwq.json",
};

function LottiePlayer({
  url,
  fallback,
  className,
  loop = true,
}: {
  url: string;
  fallback?: React.ReactNode;
  className?: string;
  loop?: boolean;
}) {
  const [animData, setAnimData] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setAnimData(null);
    setFailed(false);
    setVisible(false);
    // Use XMLHttpRequest instead of fetch so browser extension monkey-patches
    // on window.fetch don't intercept this request and trigger global errors.
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "json";
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setAnimData(xhr.response);
        setTimeout(() => setVisible(true), 50);
      } else {
        setFailed(true);
      }
    };
    xhr.onerror = () => setFailed(true);
    try {
      xhr.send();
    } catch {
      setFailed(true);
    }
    return () => xhr.abort();
  }, [url]);

  return (
    <div className={`relative flex items-center justify-center ${className ?? ""}`}>
      {(!animData || !visible) && <div className="absolute inset-0 flex items-center justify-center">{fallback ?? null}</div>}
      {animData && (
        <div className={`transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
          <Lottie animationData={animData} loop={loop} className={className} />
        </div>
      )}
    </div>
  );
}

function PwaSkipButton({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return <div className="h-14" />;

  return (
    <button
      onClick={onClick}
      className="w-full h-14 rounded-full text-muted-foreground/60 text-xs font-medium transition-all duration-500 animate-in fade-in"
      data-testid="button-onboarding-skip-pwa"
    >
      Instalar depois
      <ArrowRight className="ml-1 inline" size={12} />
    </button>
  );
}

type StepId = "welcome" | "profile" | "pwa" | "checkin" | "journal" | "book" | "notifications" | "premium";

const STEP_ORDER: StepId[] = ["welcome", "profile", "pwa", "checkin", "journal", "book", "notifications", "premium"];

const INTERESTS = [
  { id: "fe", label: "Fé" },
  { id: "oracao", label: "Oração" },
  { id: "biblia", label: "Bíblia" },
  { id: "familia", label: "Família" },
  { id: "proposito", label: "Propósito" },
  { id: "paz", label: "Paz Interior" },
  { id: "gratidao", label: "Gratidão" },
  { id: "relacoes", label: "Relações" },
  { id: "cura", label: "Cura Emocional" },
  { id: "confianca", label: "Confiar em Deus" },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const savedStep = parseInt(localStorage.getItem("365encontros-onboarding-step") || "0", 10);
  const [stepIndex, setStepIndex] = useState(isNaN(savedStep) ? 0 : Math.min(savedStep, STEP_ORDER.length - 1));
  const [isAnimating, setIsAnimating] = useState(false);
  const savedPerm = typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem("365encontros-push-subscribed") === "true";
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "granted" | "denied">(savedPerm ? "granted" : "idle");
  const { canInstall, installed: pwaInstalled, promptInstall } = usePwaInstall();
  const [pwaAutoTriggered, setPwaAutoTriggered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"enter-right" | "enter-left" | "exit-left" | "exit-right" | "idle">("idle");
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const goTo = (newIndex: number) => {
    if (isAnimating || newIndex === stepIndex) return;
    const dir = newIndex > stepIndex ? "right" : "left";
    setIsAnimating(true);
    setSlideDirection(dir === "right" ? "exit-left" : "exit-right");

    setTimeout(() => {
      setStepIndex(newIndex);
      localStorage.setItem("365encontros-onboarding-step", String(newIndex));
      setSlideDirection(dir === "right" ? "enter-right" : "enter-left");
      setTimeout(() => {
        setSlideDirection("idle");
        setIsAnimating(false);
      }, 350);
    }, 250);
  };

  const next = () => {
    if (currentStep === "profile") saveProfile();
    if (stepIndex < STEP_ORDER.length - 1) goTo(stepIndex + 1);
  };

  const back = () => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  };

  const currentStep = STEP_ORDER[stepIndex];

  useEffect(() => {
    if (currentStep === "pwa" && canInstall && !pwaInstalled && !pwaAutoTriggered) {
      setPwaAutoTriggered(true);
      const timer = setTimeout(() => {
        promptInstall();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentStep, canInstall, pwaInstalled, pwaAutoTriggered, promptInstall]);

  const handleNotificationActivate = async () => {
    setNotifStatus("loading");
    try {
      const success = await subscribeToPush();
      setNotifStatus(success ? "granted" : "denied");
    } catch {
      setNotifStatus("denied");
    }
  };

  const [profileAge, setProfileAge] = useState<number | null>(null);
  const [profileInterests, setProfileInterests] = useState<string[]>([]);

  const toggleInterest = (id: string) => {
    setProfileInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const saveProfile = async () => {
    if (!profileAge && profileInterests.length === 0) return;
    const body: any = {};
    if (profileAge) body.birthYear = new Date().getFullYear() - profileAge;
    if (profileInterests.length > 0) body.interests = profileInterests;
    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
    } catch {
    }
  };

  const slideClass =
    slideDirection === "exit-left" ? "translate-x-[-30px] opacity-0 scale-95" :
    slideDirection === "exit-right" ? "translate-x-[30px] opacity-0 scale-95" :
    slideDirection === "enter-right" ? "animate-slide-in-right" :
    slideDirection === "enter-left" ? "animate-slide-in-left" :
    "translate-x-0 opacity-100 scale-100";

  return (
    <div className={`fixed inset-0 z-[100] bg-background flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0 scale-105"}`}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 4px 24px 0 rgba(30, 90, 30, 0.12); }
          50% { box-shadow: 0 8px 32px 4px rgba(30, 90, 30, 0.2); }
        }
        @keyframes staggerFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in-right { animation: slideInRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-slide-in-left { animation: slideInLeft 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-float { animation: floatUp 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
        .stagger-1 { animation: staggerFade 0.5s ease-out 0.1s both; }
        .stagger-2 { animation: staggerFade 0.5s ease-out 0.2s both; }
        .stagger-3 { animation: staggerFade 0.5s ease-out 0.3s both; }
        .stagger-4 { animation: staggerFade 0.5s ease-out 0.4s both; }
        .stagger-5 { animation: staggerFade 0.5s ease-out 0.5s both; }
      `}</style>

      <div className="flex-1 flex flex-col items-center overflow-y-auto px-6" style={{ paddingTop: "calc(var(--safe-top) + 1rem)", paddingBottom: "1rem" }}>
        <div className={`w-full max-w-sm flex flex-col items-center my-auto transition-all duration-300 ease-out ${slideClass}`}>

          {currentStep === "welcome" && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="animate-float">
                  <div className="w-32 h-44 rounded-r-xl rounded-l-sm shadow-2xl shadow-primary/20 overflow-hidden relative border-l-[6px] border-primary/30 transform -rotate-2 hover:rotate-0 transition-transform duration-700 animate-pulse-glow">
                    <img src={bookCover} alt="365 Encontros com Deus Pai" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
                  </div>
                </div>
                <div className="absolute -top-4 -right-6 w-16 h-16 pointer-events-none">
                  <LottiePlayer
                    url={STEP_ANIMATIONS.welcome}
                    fallback={<Sparkles size={24} className="text-primary/60 animate-pulse" />}
                    className="w-16 h-16"
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <h1 className="text-2xl font-serif text-foreground leading-tight stagger-1">
                  Bem-vindo a<br /><span className="text-primary">365 Encontros com Deus Pai</span>
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed px-2 stagger-2">
                  Um devocional diário para aprofundar a tua fé e encontrar Deus em cada dia do ano.
                </p>
                <p className="text-xs text-muted-foreground/70 italic px-4 stagger-3">
                  Baseado no livro de Jun Date
                </p>
              </div>
              <div className="w-full bg-primary/5 border border-primary/15 rounded-xl p-3 stagger-3">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <ShieldCheck size={13} className="text-primary" />
                  <span className="text-xs font-semibold text-primary">Seus dados estão protegidos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck size={14} className="text-primary/70" />
                    <span className="text-[10px] text-muted-foreground leading-tight">E-mail criptografado</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck size={14} className="text-primary/70" />
                    <span className="text-[10px] text-muted-foreground leading-tight">Senha protegida</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck size={14} className="text-primary/70" />
                    <span className="text-[10px] text-muted-foreground leading-tight">Cartão via Stripe</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === "profile" && (
            <div className="flex flex-col space-y-6 w-full">
              <div className="text-center space-y-2">
                <div className="w-24 h-24 mx-auto flex items-center justify-center">
                  <LottiePlayer
                    url={STEP_ANIMATIONS.profile}
                    fallback={
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <ShieldCheck size={28} className="text-primary" />
                      </div>
                    }
                    className="w-24 h-24"
                  />
                </div>
                <h2 className="text-2xl font-serif text-foreground">Conta-nos sobre ti</h2>
                <p className="text-sm text-muted-foreground">Ajuda-nos a personalizar a tua jornada espiritual</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qual a tua faixa etária?</p>
                <div className="flex flex-wrap gap-2">
                  {[18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35].map(age => (
                    <button
                      key={age}
                      onClick={() => setProfileAge(profileAge === age ? null : age)}
                      data-testid={`button-age-${age}`}
                      className={`w-12 h-10 rounded-xl text-sm font-medium transition-all ${
                        profileAge === age
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                  <button
                    onClick={() => setProfileAge(profileAge === 36 ? null : 36)}
                    data-testid="button-age-36plus"
                    className={`px-3 h-10 rounded-xl text-sm font-medium transition-all ${
                      profileAge === 36
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    36+
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">O que desejas aprofundar?</p>
                <p className="text-[11px] text-muted-foreground/70">Podes escolher vários</p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(interest => (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      data-testid={`button-interest-${interest.id}`}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                        profileInterests.includes(interest.id)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {interest.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === "pwa" && (() => {
            const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent || "");
            return (
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-full max-w-[300px] space-y-4 stagger-1">
                <div className="w-32 h-32 mx-auto flex items-center justify-center">
                  {pwaInstalled ? (
                    <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center scale-110">
                      <CheckCircle2 size={44} className="text-primary" />
                    </div>
                  ) : (
                    <LottiePlayer
                      url={STEP_ANIMATIONS.pwa}
                      fallback={
                        <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center animate-float">
                          <Smartphone size={44} className="text-primary" />
                        </div>
                      }
                      className="w-32 h-32"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl font-serif text-foreground">
                    {pwaInstalled ? "App Instalado!" : "Instale o App"}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pwaInstalled
                      ? "Tudo pronto! O app já está na sua tela inicial."
                      : "Este passo é essencial para receber lembretes diários e ter a melhor experiência."
                    }
                  </p>
                </div>

                {!pwaInstalled && (
                  <>
                    {canInstall ? (
                      <button
                        onClick={promptInstall}
                        className="w-full p-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        data-testid="button-install-pwa"
                      >
                        <Plus size={20} />
                        Instalar Agora
                      </button>
                    ) : (
                      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Siga os passos:</p>
                        {isIos ? (
                          <>
                            <div className="flex items-center gap-3 text-left stagger-2">
                              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                                <Share size={18} className="text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">1. Toque em <span className="text-blue-500">Compartilhar</span></p>
                                <p className="text-[10px] text-muted-foreground">O ícone fica na barra inferior do Safari</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-left stagger-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                                <Plus size={18} className="text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">2. <span className="text-primary">Adicionar à Tela de Início</span></p>
                                <p className="text-[10px] text-muted-foreground">Role para baixo no menu e toque nesta opção</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-left stagger-3">
                              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                                <Check size={18} className="text-green-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">3. Toque em <span className="text-green-500">Adicionar</span></p>
                                <p className="text-[10px] text-muted-foreground">Pronto! O app aparecerá na sua tela</p>
                              </div>
                            </div>
                            {!isSafari && (
                              <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium text-center">
                                  No iPhone, use o Safari para instalar o app
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 text-left stagger-2">
                              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                                <span className="text-primary text-lg font-bold">⋮</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">1. Toque no <span className="text-primary">menu ⋮</span> do navegador</p>
                                <p className="text-[10px] text-muted-foreground">Os 3 pontos no canto superior direito</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-left stagger-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                                <Plus size={18} className="text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">2. <span className="text-primary">Instalar app</span> ou <span className="text-primary">Adicionar à tela</span></p>
                                <p className="text-[10px] text-muted-foreground">Confirme para instalar</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 justify-center pt-1">
                      <div className="flex gap-1">
                        <Bell size={12} className="text-primary/60" />
                        <Smartphone size={12} className="text-primary/60" />
                        <Sparkles size={12} className="text-primary/60" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Notificações + Acesso rápido + Modo offline</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            );
          })()}

          {currentStep === "checkin" && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-32 h-32 mx-auto stagger-1">
                <LottiePlayer
                  url={STEP_ANIMATIONS.checkin}
                  fallback={
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto animate-float">
                      <Smile size={28} className="text-primary" />
                    </div>
                  }
                  className="w-32 h-32"
                />
              </div>
              <div className="w-full max-w-[280px] bg-card rounded-xl border border-border p-6 shadow-sm space-y-4 stagger-1">
                <p className="text-xs text-muted-foreground">Como você está hoje?</p>
                <div className="flex justify-center gap-3">
                  {["😔", "😐", "🙂", "😊", "🤩"].map((emoji, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-700 ${i === 3 ? "bg-primary/10 scale-110 ring-2 ring-primary/30" : "bg-muted/50 hover:scale-110"}`}
                      style={{ animation: `staggerFade 0.5s ease-out ${0.2 + i * 0.1}s both` }}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-amber-400 to-green-400 rounded-full transition-all duration-1000" />
                </div>
              </div>
              <div className="space-y-2 pt-2 stagger-2">
                <h2 className="text-2xl font-serif text-foreground">O Meu Coração Hoje</h2>
                <p className="text-sm text-muted-foreground leading-relaxed px-2">
                  Todo dia, entrega ao Pai como o teu coração está. Ele conhece-te e acolhe-te exatamente como estás.
                </p>
              </div>
            </div>
          )}

          {currentStep === "journal" && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-32 h-32 mx-auto stagger-1">
                <LottiePlayer
                  url={STEP_ANIMATIONS.journal}
                  fallback={
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center animate-float">
                      <PenLine size={28} className="text-primary" />
                    </div>
                  }
                  className="w-32 h-32"
                />
              </div>
              <div className="w-full max-w-[280px] bg-card rounded-xl border border-border p-6 shadow-sm space-y-4 stagger-1">
                <div className="text-left space-y-2">
                  {[4/5, 1, 3/5].map((w, i) => (
                    <div key={i} className="h-2 bg-foreground/10 rounded-full overflow-hidden" style={{ width: `${w * 100}%` }}>
                      <div className="h-full bg-primary/20 rounded-full" style={{ animation: `staggerFade 0.8s ease-out ${0.3 + i * 0.15}s both`, width: "0%", animationFillMode: "forwards" }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-center">
                  {["texto", "fotos", "desenho"].map((t, i) => (
                    <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium" style={{ animation: `staggerFade 0.4s ease-out ${0.5 + i * 0.1}s both` }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-2 stagger-2">
                <h2 className="text-2xl font-serif text-foreground">Diário com o Senhor</h2>
                <p className="text-sm text-muted-foreground leading-relaxed px-2">
                  Regista o que o Senhor falou ao teu coração. Adiciona fotos, desenhos e orações. O teu espaço íntimo com Deus.
                </p>
              </div>
            </div>
          )}

          {currentStep === "book" && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-32 h-32 mx-auto stagger-1">
                <LottiePlayer
                  url={STEP_ANIMATIONS.book}
                  fallback={
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center animate-float">
                      <BookOpen size={28} className="text-primary" />
                    </div>
                  }
                  className="w-32 h-32"
                />
              </div>
              <div className="w-full max-w-[280px] bg-card rounded-xl border border-border p-6 shadow-sm space-y-4 stagger-1">
                <div className="space-y-2">
                  {["1 JAN — Um novo começo com Deus", "2 JAN — Confiar também é um ato de fé", "3 JAN — Deus cuida de cada detalhe"].map((ch, i) => (
                    <div key={ch} className="flex items-center gap-2 text-left" style={{ animation: `staggerFade 0.4s ease-out ${0.3 + i * 0.12}s both` }}>
                      <div className="w-1 h-6 rounded-full bg-primary/30" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{ch}</p>
                        <p className="text-[10px] text-muted-foreground">Dia {i + 1} de 365</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-2 stagger-2">
                <h2 className="text-2xl font-serif text-foreground">365 Encontros com Deus Pai</h2>
                <p className="text-sm text-muted-foreground leading-relaxed px-2">
                  Um encontro diário com o Pai baseado no livro de Jun Date — versículo, reflexão profunda e momento de oração guiada, para cada dia do ano.
                </p>
              </div>
            </div>
          )}

          {currentStep === "notifications" && (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-full max-w-[280px] space-y-4 stagger-1">
                <div className="w-32 h-32 mx-auto flex items-center justify-center">
                  {notifStatus === "loading" ? (
                    <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
                      <Loader2 size={36} className="text-primary animate-spin" />
                    </div>
                  ) : notifStatus === "granted" ? (
                    <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center scale-110">
                      <CheckCircle2 size={36} className="text-primary" />
                    </div>
                  ) : (
                    <LottiePlayer
                      url={STEP_ANIMATIONS.notifications}
                      fallback={
                        <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center animate-float">
                          <BellRing size={36} className="text-primary" />
                        </div>
                      }
                      className="w-32 h-32"
                    />
                  )}
                </div>

                {notifStatus === "idle" && (
                  <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-start gap-3 text-left stagger-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Chamado matinal</p>
                        <p className="text-[10px] text-muted-foreground">Encontro com o Pai às 9h</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-left stagger-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <PenLine size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Momento de oração</p>
                        <p className="text-[10px] text-muted-foreground">Registo espiritual às 20h</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 stagger-2">
                <h2 className="text-2xl font-serif text-foreground">
                  {notifStatus === "granted" ? "O Senhor vai lembrar-te!" : notifStatus === "denied" ? "Sem problemas!" : "Convites Diários"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed px-2">
                  {notifStatus === "granted"
                    ? "Receberás lembretes gentis para os teus momentos de encontro com Deus Pai."
                    : notifStatus === "denied"
                    ? "Podes ativar as notificações mais tarde nas definições do teu dispositivo."
                    : "Ativa as notificações para receber o convite diário ao encontro com Deus. Prometemos ser o momento mais santo do teu dia."
                  }
                </p>
              </div>

              {notifStatus === "idle" && isPushSupported() && (
                <button
                  onClick={handleNotificationActivate}
                  className="w-full max-w-[280px] p-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  data-testid="button-activate-notifications"
                >
                  <Bell size={18} />
                  Ativar Notificações
                </button>
              )}

              {notifStatus === "loading" && (
                <div className="w-full max-w-[280px] p-4 rounded-xl bg-primary/10 text-primary font-medium text-sm flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Ativando...
                </div>
              )}

              {notifStatus === "granted" && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/push/test", { method: "POST", credentials: "include" });
                      const data = await res.json();
                      if (data.sent > 0) {
                        alert("Notificação enviada! Verifique seu dispositivo.");
                      } else {
                        alert("Nenhuma assinatura encontrada. Tente ativar novamente.");
                      }
                    } catch {
                      alert("Erro ao enviar notificação de teste.");
                    }
                  }}
                  className="w-full max-w-[280px] p-3 rounded-xl border border-primary/30 bg-primary/5 text-primary font-medium text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                  data-testid="button-test-notification"
                >
                  <BellRing size={16} />
                  Testar Notificação
                </button>
              )}
            </div>
          )}

          {currentStep === "premium" && (
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-36 h-36 mx-auto stagger-1">
                <LottiePlayer
                  url={STEP_ANIMATIONS.premium}
                  fallback={
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center animate-float">
                      <Crown size={32} className="text-primary" />
                    </div>
                  }
                  className="w-36 h-36"
                />
              </div>

              <div className="space-y-2 stagger-2">
                <h2 className="text-2xl font-serif text-foreground">Muito mais te espera</h2>
                <p className="text-sm text-muted-foreground leading-relaxed px-2">
                  Descobre tudo o que a plataforma tem para te oferecer
                </p>
              </div>

              <div className="w-full max-w-[320px] space-y-3 stagger-3">
                <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3 text-left" style={{ animation: `staggerFade 0.4s ease-out 0.3s both` }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Library size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Biblioteca</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      Acede a outros livros e devocionais para aprofundar ainda mais a tua caminhada com Deus.
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3 text-left" style={{ animation: `staggerFade 0.4s ease-out 0.42s both` }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Devocional Diário</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      Um encontro diário com o Pai — versículo, reflexão e oração guiada para cada dia do ano.
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3 text-left" style={{ animation: `staggerFade 0.4s ease-out 0.54s both` }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Comunidade</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      Conecta-te com outros crentes, partilha reflexões e cresce junto numa comunidade de fé.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 w-full flex justify-center pt-4 px-6 bg-background" style={{ paddingBottom: "calc(var(--safe-bottom) + 1.5rem)" }}>
        <div className="w-full max-w-sm space-y-4">
          <div className="flex justify-center gap-1.5">
            {STEP_ORDER.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === stepIndex ? "w-8 bg-primary" : i < stepIndex ? "w-2 bg-primary/40" : "w-2 bg-muted"}`}
                data-testid={`dot-step-${i}`}
              />
            ))}
          </div>

          {currentStep === "premium" ? (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  onComplete();
                  setTimeout(() => { window.location.href = "/premium"; }, 100);
                }}
                className="w-full h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-base font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all"
                data-testid="button-onboarding-premium"
              >
                <Crown size={18} />
                Ver Planos Premium
              </Button>
              <button
                onClick={onComplete}
                className="w-full text-sm text-muted-foreground font-medium hover:text-foreground transition-colors py-2"
                data-testid="button-onboarding-skip-premium"
              >
                Explorar o app primeiro
              </button>
              <button
                onClick={back}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                data-testid="button-onboarding-back"
              >
                <ArrowLeft size={12} />
                Voltar
              </button>
            </div>
          ) : (
            <>
              {currentStep === "pwa" && !pwaInstalled ? (
                <PwaSkipButton onClick={next} />
              ) : (
                <Button
                  onClick={next}
                  className="w-full h-14 rounded-full bg-primary text-primary-foreground text-base font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
                  data-testid="button-onboarding-next"
                >
                  {currentStep === "notifications" && notifStatus === "idle" ? "Pular" : "Continuar"}
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              )}

              {currentStep === "profile" && !profileAge && profileInterests.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center -mt-1">Podes saltar e preencher mais tarde</p>
              )}

              {stepIndex > 0 && (
                <button
                  onClick={back}
                  className="w-full text-xs text-muted-foreground font-medium hover:text-foreground transition-colors py-1 flex items-center justify-center gap-1"
                  data-testid="button-onboarding-back"
                >
                  <ArrowLeft size={12} />
                  Voltar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
