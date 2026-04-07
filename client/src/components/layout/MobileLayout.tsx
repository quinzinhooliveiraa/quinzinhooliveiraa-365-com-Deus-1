import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, PenLine, Users, LogOut, Sun, Moon, Monitor, Camera, Shield, MessageSquare, X, Send, PanelLeftClose, PanelLeftOpen, Bell, BellOff, Pencil, Check, Crown, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/NotificationCenter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isPushSupported, subscribeToPush, unsubscribeFromPush, isSubscribed as isPushSubscribed, refreshPushSubscription } from "@/utils/pushNotifications";
import { useTrack } from "@/hooks/useTrack";
import { getNavHidden, subscribeNavHidden } from "@/lib/navVisibility";

interface MobileLayoutProps {
  children: ReactNode;
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const sendMutation = useMutation({
    mutationFn: async (data: { type: string; subject: string; message: string }) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return res.json();
    },
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm border border-border shadow-2xl text-center animate-in zoom-in-95 duration-300">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-serif text-foreground mb-1">Que Deus abençoe!</h3>
          <p className="text-sm text-muted-foreground mb-4">A tua partilha foi recebida. Vamos ler com atenção e responder o mais brevemente possível.</p>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm" data-testid="button-close-feedback-sent">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-t-3xl sm:rounded-3xl w-full max-w-md border-t sm:border border-border shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="text-sm font-medium text-foreground">Enviar Feedback</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <div className="flex gap-1.5">
            {[
              { id: "feedback", label: "Feedback" },
              { id: "idea", label: "Ideia" },
              { id: "bug", label: "Bug" },
              { id: "support", label: "Suporte" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                  type === t.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted/50 text-muted-foreground border-border"
                }`}
                data-testid={`button-feedback-type-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto"
            className="w-full p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            data-testid="input-feedback-subject"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Partilha a tua ideia, questão ou sugestão com a equipa..."
            className="w-full min-h-[120px] p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            data-testid="textarea-feedback-message"
          />
          {sendMutation.isError && (
            <p className="text-xs text-red-500">Erro ao enviar. Tente novamente.</p>
          )}
        </div>
        <div className="p-4 border-t border-border shrink-0">
          <button
            onClick={() => sendMutation.mutate({ type, subject, message })}
            disabled={!subject.trim() || !message.trim() || sendMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="button-send-feedback"
          >
            <Send size={16} />
            {sendMutation.isPending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [location, setLocation] = useLocation();
  const { logout, user, refetch } = useAuth();
  const { theme, setTheme } = useTheme();
  const track = useTrack();
  const [showMenu, setShowMenu] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() => isPushSubscribed());
  const [pushLoading, setPushLoading] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("365encontros-sidebar-collapsed") === "true";
  });
  const [isDesktop, setIsDesktop] = useState(false);
  const [navHidden, setNavHidden] = useState(getNavHidden);

  useEffect(() => {
    return subscribeNavHidden(setNavHidden);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    const pageMap: Record<string, string> = {
      "/": "page:home",
      "/journal": "page:diário",
      "/book": "page:devocional",
      "/community": "page:comunidade",
      "/admin": "page:admin",
      "/premium": "page:premium",
    };
    const normalized = location.split("?")[0].split("#")[0];
    const eventName = pageMap[normalized] || null;
    if (eventName) track(eventName);
  }, [location, user]);

  useEffect(() => {
    if (isPushSubscribed() && isPushSupported()) {
      refreshPushSubscription().catch(() => {});
    } else if (isPushSupported()) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        subscribeToPush().catch(() => {});
      } else if (typeof Notification === "undefined" || Notification.permission !== "denied") {
        const dismissed = localStorage.getItem("365encontros-push-banner-dismissed");
        if (!dismissed) {
          setShowPushBanner(true);
        }
      }
    }
  }, []);

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const ok = await unsubscribeFromPush();
        if (ok) setPushEnabled(false);
      } else {
        const ok = await subscribeToPush();
        setPushEnabled(ok);
      }
    } catch (err) {
      console.error("Push toggle error:", err);
    } finally {
      setPushLoading(false);
    }
  };

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("365encontros-sidebar-collapsed", String(next));
  };

  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    return localStorage.getItem("365encontros-profile-photo") || null;
  });

  useEffect(() => {
    if (user?.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
      localStorage.setItem("365encontros-profile-photo", user.profilePhoto);
    }
  }, [user?.profilePhoto]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim().length < 2) return;
    setNameSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (res.ok) {
        await refetch();
        setEditingName(false);
      }
    } catch {}
    setNameSaving(false);
  };

  const navItems = [
    { href: "/", icon: Home, label: "Hoje" },
    { href: "/journal", icon: PenLine, label: "Diário" },
    { href: "/book", icon: BookOpen, label: "Devocional" },
    { href: "/community", icon: Users, label: "Comunidade" },
  ];

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem("365encontros-user-name");
    localStorage.removeItem("365encontros-needs-onboarding");
    localStorage.removeItem("365encontros-profile-photo");
    window.location.reload();
  };

  const handleManagePlan = async () => {
    setShowMenu(false);
    if (user?.premiumReason === "paid" || user?.premiumReason === "granted") {
      try {
        const portalRes = await fetch("/api/stripe/portal", {
          method: "POST",
          credentials: "include",
        });
        if (portalRes.ok) {
          const portalData = await portalRes.json();
          if (portalData.url) {
            window.location.href = portalData.url;
            return;
          }
        }
      } catch {}
    }
    setLocation("/premium");
  };

  const getPlanLabel = () => {
    if (!user) return "";
    switch (user.premiumReason) {
      case "admin": return "Admin";
      case "paid": return "Premium";
      case "granted": return "Premium";
      case "trial": return "Período de teste";
      case "expired": return "Plano gratuito";
      case "blocked": return "Bloqueado";
      default: return "Plano gratuito";
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const canvas = document.createElement("canvas");
      const maxSize = 256;
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize; }
          else { w = (w / h) * maxSize; h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const photo = canvas.toDataURL("image/jpeg", 0.7);
          setProfilePhoto(photo);
          localStorage.setItem("365encontros-profile-photo", photo);
          fetch("/api/auth/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ profilePhoto: photo }),
          }).then(res => {
            if (res.ok) {
              return res.json().then(data => {
                queryClient.setQueryData(["/api/auth/me"], data);
              });
            }
          }).catch(() => {});
        }
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const themeOptions = [
    { id: "light", icon: Sun },
    { id: "dark", icon: Moon },
    { id: "system", icon: Monitor },
  ] as const;

  const userMenuContent = (
    <>
      <div className="p-4 flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden border border-border bg-muted">
            {profilePhoto ? (
              <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-foreground/60">{user?.name?.charAt(0).toUpperCase() || "?"}</span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow border-2 border-background"
            data-testid="button-change-photo"
          >
            <Camera size={9} className="text-primary-foreground" />
          </button>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                autoFocus
                className="flex-1 text-sm font-medium text-foreground bg-muted/50 border border-border rounded-lg px-2 py-1 min-w-0"
                placeholder="Seu nome"
                data-testid="input-edit-name"
              />
              <button
                onClick={handleSaveName}
                disabled={nameSaving || nameInput.trim().length < 2}
                className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 disabled:opacity-40"
                data-testid="button-save-name"
              >
                <Check size={14} className="text-primary-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <button
                onClick={() => { setNameInput(user?.name || ""); setEditingName(true); }}
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                data-testid="button-edit-name"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      <div className="mx-3 mb-3 p-1 bg-muted rounded-lg flex gap-0.5">
        {themeOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={cn(
                "flex-1 flex items-center justify-center py-1.5 rounded-md transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`button-theme-${opt.id}`}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      <div className="border-t border-border">
        <button
          onClick={handleManagePlan}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          data-testid="button-manage-plan"
        >
          {user?.hasPremium ? <Crown size={15} className="text-amber-500" /> : <CreditCard size={15} />}
          <span className="flex-1 text-left">Gerenciar Plano</span>
          <span className={cn(
            "text-[11px] px-2 py-0.5 rounded-full font-medium",
            user?.premiumReason === "paid" || user?.premiumReason === "granted" || user?.premiumReason === "admin"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : user?.premiumReason === "trial"
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                : "bg-muted text-muted-foreground"
          )}>
            {getPlanLabel()}
          </span>
        </button>
        {isPushSupported() && (
          <button
            onClick={handleTogglePush}
            disabled={pushLoading}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            data-testid="button-toggle-push"
          >
            {pushEnabled ? <BellOff size={15} /> : <Bell size={15} />}
            {pushLoading ? "Processando..." : pushEnabled ? "Desativar Notificações" : "Ativar Notificações"}
          </button>
        )}
        <button
          onClick={() => { setShowMenu(false); setShowFeedback(true); }}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          data-testid="button-feedback"
        >
          <MessageSquare size={15} />
          Feedback / Suporte
        </button>
        {user?.role === "admin" && (
          <Link
            href="/admin"
            onClick={() => setShowMenu(false)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-amber-600 dark:text-amber-400 hover:bg-muted/50 transition-colors"
            data-testid="link-admin"
          >
            <Shield size={15} />
            Painel Admin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-red-500 hover:bg-muted/50 transition-colors"
          data-testid="button-logout"
        >
          <LogOut size={15} />
          Sair da conta
        </button>
      </div>
    </>
  );

  return (
    <div
      className={cn("bg-background text-foreground bg-noise flex overflow-x-hidden pt-safe", isDesktop ? "h-screen overflow-hidden" : location === "/community" ? "h-dvh overflow-hidden" : "min-h-screen")}
    >
      {isDesktop && !sidebarCollapsed && (
        <aside
          className="hidden md:flex flex-col h-screen bg-background border-r border-border z-50 shrink-0 w-[220px]"
        >
          <div className="flex items-center gap-2 px-4 h-14 border-b border-border justify-between">
            <div className="flex flex-col leading-none">
              <span className="font-serif font-bold text-sm text-foreground">365 Encontros</span>
              <span className="font-serif text-xs text-primary font-semibold">com Deus Pai</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 hover-elevate rounded-lg transition-colors text-muted-foreground"
              data-testid="button-toggle-sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <nav className="flex-1 py-4 space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all duration-200",
                    sidebarCollapsed ? "justify-center p-3" : "px-4 py-3",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`sidebar-link-${item.label.toLowerCase()}`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border px-2 py-3 space-y-1">
            <div className="flex items-center gap-2 px-2">
              <NotificationCenter />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl transition-all hover:bg-muted",
                  sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"
                )}
                data-testid="button-user-menu"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden border border-border bg-muted shrink-0">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-foreground/70">{user?.name?.charAt(0).toUpperCase() || "?"}</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-sm text-foreground truncate">{user?.name}</span>
                )}
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute left-full bottom-0 ml-2 bg-background border border-border rounded-xl shadow-lg z-50 w-56 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                    {userMenuContent}
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      )}

      <div className={cn("flex-1 bg-background overflow-x-hidden", isDesktop ? (location === "/community" ? "h-screen overflow-hidden flex" : "h-screen overflow-y-auto flex justify-center") : location === "/community" ? "flex flex-col min-h-0 overflow-hidden" : "min-h-screen")}>
        <div className={cn("w-full bg-background relative overflow-x-hidden flex flex-col transition-all", isDesktop ? (location === "/community" ? "flex-1 min-h-0" : "") : location === "/community" ? "flex-1 min-h-0" : "min-h-screen")}>
          
          {/* Desktop sidebar toggle — shows only when sidebar is hidden */}
          {isDesktop && sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="hidden md:flex fixed top-3 left-3 z-[60] items-center gap-2 px-2 py-1.5 rounded-lg bg-background border border-border hover-elevate shadow-sm"
              data-testid="button-expand-sidebar"
            >
              <PanelLeftOpen size={14} className="text-muted-foreground" />
              <div className="w-6 h-6 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                {profilePhoto
                  ? <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                  : <span className="text-muted-foreground">{user?.name?.charAt(0).toUpperCase() || "?"}</span>
                }
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          {showFeedback && <FeedbackDialog onClose={() => setShowFeedback(false)} />}

          {showPushBanner && (
            <div className="mx-4 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bell size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Ativar notificações neste dispositivo?</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Recebe lembretes e novidades diretamente aqui.</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={async () => {
                    setPushLoading(true);
                    const ok = await subscribeToPush();
                    setPushEnabled(ok);
                    setPushLoading(false);
                    setShowPushBanner(false);
                    if (!ok) {
                      localStorage.setItem("365encontros-push-banner-dismissed", "true");
                    }
                  }}
                  disabled={pushLoading}
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  data-testid="button-push-banner-enable"
                >
                  {pushLoading ? "..." : "Ativar"}
                </button>
                <button
                  onClick={() => {
                    setShowPushBanner(false);
                    localStorage.setItem("365encontros-push-banner-dismissed", "true");
                  }}
                  className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-push-banner-dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <main
            className={cn(
              "flex-1 overflow-x-hidden min-w-0 w-full",
              location === "/community"
                ? "overflow-hidden flex flex-col min-h-0"
                : cn("overflow-y-auto", isDesktop ? "pb-6" : "pb-24")
            )}
          >
            {children}
          </main>
          
          {!isDesktop && !navHidden && (
            <nav className="fixed bottom-0 left-0 right-0 bg-background backdrop-blur-lg border-t border-border pb-safe z-50 shadow-[0_-2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
              <div className="flex items-center h-16 px-1">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center flex-1 h-full space-y-1">
                      <Icon 
                        size={22} 
                        strokeWidth={isActive ? 2 : 1.5}
                        className={cn(
                          "transition-all duration-300",
                          isActive ? "text-primary scale-110 drop-shadow-[0_0_8px_rgba(184,134,44,0.5)] dark:drop-shadow-[0_0_8px_rgba(201,160,64,0.5)]" : "text-foreground/50"
                        )} 
                      />
                      <span className={cn(
                        "text-[10px] transition-colors",
                        isActive ? "text-primary font-medium" : "text-foreground/50"
                      )}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}

                {/* Profile tab */}
                <div className="relative flex-1 flex flex-col items-center justify-center h-full">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex flex-col items-center justify-center gap-1 w-full h-full"
                    data-testid="button-profile-tab"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden border transition-all duration-300",
                      showMenu ? "border-primary ring-2 ring-primary/30 scale-110" : "border-foreground/20"
                    )}>
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className={cn("transition-colors", showMenu ? "text-primary" : "text-foreground/50")}>
                          {user?.name?.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] transition-colors",
                      showMenu ? "text-primary font-medium" : "text-foreground/50"
                    )}>Perfil</span>
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 bottom-full mb-2 bg-background border border-border rounded-xl shadow-xl z-50 w-64 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {userMenuContent}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
