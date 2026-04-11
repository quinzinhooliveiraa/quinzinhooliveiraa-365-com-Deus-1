import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ChevronLeft, Users, Crown, Shield, UserPlus, Ban, Check,
  BarChart3, Clock, Star, XCircle, Search, Send, Trash2,
  MessageSquare, CheckCircle2, AlertCircle, ChevronDown,
  Bell, BellOff, Plus, ToggleLeft, ToggleRight, RefreshCw, Ticket, Copy, TrendingUp,
  BookOpen, Lock, ChevronRight, ChevronUp, Pencil, CreditCard,
  Bold, Italic, List, Download, X, ImageIcon, Lightbulb, Library, FileText, Eye, EyeOff
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

async function downloadCsv(url: string, filename: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return;
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isPremium: boolean;
  isActive: boolean;
  hasPremium: boolean;
  premiumReason: string;
  trialEndsAt: string | null;
  premiumUntil: string | null;
  invitedBy: string | null;
  createdAt: string;
  stripeSubscriptionId: string | null;
  isMasterAdmin?: boolean;
  lastActiveAt: string | null;
  pwaInstalled: boolean;
  trialBonusClaimed?: boolean;
  hasBook: boolean;
  bookUntil?: string | null;
}

const MASTER_EMAIL = "quinzinhooliveiraa@gmail.com";

function displayEmail(email: string): string {
  if (!email || email.startsWith("enc:")) return "[email protegido]";
  return email;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  trialUsers: number;
  grantedUsers: number;
  expiredUsers: number;
  blockedUsers: number;
  cardBonusUsers: number;
  bookPurchaseUsers: number;
}

interface FeedbackTicket {
  id: number;
  userId: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

function StatusBadge({ user }: { user: AdminUser }) {
  if (!user.isActive) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">Bloqueado</span>;
  }
  if (user.role === "admin") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium">Admin</span>;
  }
  if (user.premiumReason === "paid") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">Premium</span>;
  }
  if (user.premiumReason === "granted") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">Liberado</span>;
  }
  if (user.premiumReason === "trial") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">Trial</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Expirado</span>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function UserCard({ user, onUpdate, onDelete, currentUserIsMaster, allUsers }: { user: AdminUser; onUpdate: (id: string, data: any) => void; onDelete: (id: string) => void; currentUserIsMaster: boolean; allUsers: AdminUser[] }) {
  const [expanded, setExpanded] = useState(false);
  const [stripeInfo, setStripeInfo] = useState<{ hasCard: boolean; brand?: string | null; last4?: string | null; expMonth?: number | null; expYear?: number | null } | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showTrialPicker, setShowTrialPicker] = useState(false);
  const [trialDays, setTrialDays] = useState(14);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedNewMaster, setSelectedNewMaster] = useState("");
  const [transferConfirmText, setTransferConfirmText] = useState("");
  const [transferError, setTransferError] = useState("");
  const [showGrantPremium, setShowGrantPremium] = useState(false);
  const [grantDays, setGrantDays] = useState(30);
  const [grantConfirm, setGrantConfirm] = useState(false);
  const [grantConfirmText, setGrantConfirmText] = useState("");
  const [grantingBonus, setGrantingBonus] = useState(false);
  const [grantingBook, setGrantingBook] = useState(false);
  const [showGrantBook, setShowGrantBook] = useState(false);
  const [grantBookDays, setGrantBookDays] = useState(7);
  const [adminConfirmAction, setAdminConfirmAction] = useState<"grant" | "revoke" | null>(null);
  const [adminConfirmText, setAdminConfirmText] = useState("");
  const [showFixEmail, setShowFixEmail] = useState(false);
  const [fixEmailText, setFixEmailText] = useState("");
  const [fixingEmail, setFixingEmail] = useState(false);

  const emailIsProtected = !user.email || user.email.startsWith("enc:");

  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const premiumEnd = user.premiumUntil ? new Date(user.premiumUntil) : null;
  const createdAt = new Date(user.createdAt);
  const isMainAdmin = user.isMasterAdmin === true;

  const getPlanLabel = () => {
    if (user.premiumReason === "paid" && user.stripeSubscriptionId) return "Assinatura Stripe";
    if (user.premiumReason === "granted") return "Liberado pelo Admin";
    if (user.premiumReason === "trial") return "Trial Grátis";
    if (user.premiumReason === "admin") return "Admin";
    return "Sem plano";
  };

  return (
    <div className="border border-border rounded-xl bg-background">
      <button
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          if (next && stripeInfo === null && !loadingStripe) {
            setLoadingStripe(true);
            fetch(`/api/admin/users/${user.id}/stripe-info`, { credentials: "include" })
              .then(r => r.json())
              .then(d => setStripeInfo(d))
              .catch(() => setStripeInfo({ hasCard: false }))
              .finally(() => setLoadingStripe(false));
          }
        }}
        className="w-full p-3 flex items-center gap-2.5 text-left hover:bg-muted/50 transition-colors rounded-xl"
        data-testid={`user-card-${user.id}`}
      >
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground/60 shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{user.name}</p>
            <StatusBadge user={user} />
            {user.pwaInstalled && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500" title="PWA instalado" />}
            {user.lastActiveAt && (Date.now() - new Date(user.lastActiveAt).getTime()) > 7 * 24 * 60 * 60 * 1000 && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-medium">Inativo</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <p className="text-[11px] text-muted-foreground truncate">{displayEmail(user.email)}</p>
            {emailIsProtected && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowFixEmail(!showFixEmail); setFixEmailText(""); }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="Corrigir email"
                data-testid={`button-fix-email-${user.id}`}
              >
                <Pencil size={10} />
              </button>
            )}
          </div>
        </div>
        <ChevronLeft size={14} className={`text-muted-foreground transition-transform shrink-0 ${expanded ? "-rotate-90" : "rotate-180"}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3 animate-in fade-in duration-200">
          {showFixEmail && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <input
                type="email"
                value={fixEmailText}
                onChange={e => setFixEmailText(e.target.value)}
                placeholder="email@exemplo.com"
                className="flex-1 text-[11px] px-2 py-1 rounded bg-background border border-border text-foreground"
                data-testid={`input-fix-email-${user.id}`}
                autoFocus
              />
              <button
                disabled={fixingEmail || !fixEmailText.includes("@")}
                onClick={async () => {
                  setFixingEmail(true);
                  try {
                    const res = await fetch(`/api/admin/users/${user.id}/fix-email`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ email: fixEmailText.trim() }),
                    });
                    if (res.ok) {
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                      setShowFixEmail(false);
                    }
                  } finally {
                    setFixingEmail(false);
                  }
                }}
                className="text-[11px] px-2.5 py-1 rounded bg-orange-500 text-white font-medium disabled:opacity-50"
                data-testid={`button-confirm-fix-email-${user.id}`}
              >
                {fixingEmail ? "..." : "Salvar"}
              </button>
              <button
                onClick={() => setShowFixEmail(false)}
                className="text-[11px] px-2 py-1 rounded bg-muted text-muted-foreground"
              >
                ×
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="min-w-0">
              <span className="text-muted-foreground">Plano:</span>
              <p className="text-foreground font-medium truncate">{getPlanLabel()}</p>
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground">Vencimento:</span>
              <p className="text-foreground font-medium truncate">
                {premiumEnd ? premiumEnd.toLocaleDateString("pt-BR") : trialEnd ? trialEnd.toLocaleDateString("pt-BR") + " (trial)" : user.isPremium ? "Ilimitado" : "—"}
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground">Cadastro:</span>
              <p className="text-foreground">{createdAt.toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground">Última atividade:</span>
              <p className="text-foreground">
                {user.lastActiveAt ? (() => {
                  const diff = Date.now() - new Date(user.lastActiveAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 5) return "Agora";
                  if (mins < 60) return `${mins}min atrás`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h atrás`;
                  const days = Math.floor(hrs / 24);
                  return days === 1 ? "Ontem" : `${days} dias atrás`;
                })() : "—"}
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground">Livro:</span>
              <p className={`font-medium ${user.hasBook ? "text-emerald-500" : "text-muted-foreground"}`}>
                {user.hasBook
                  ? user.bookUntil && new Date(user.bookUntil) > new Date()
                    ? `Temp. até ${new Date(user.bookUntil).toLocaleDateString("pt-PT")}`
                    : "Comprado"
                  : "Não"}
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground">Cartão:</span>
              {loadingStripe ? (
                <p className="text-muted-foreground">…</p>
              ) : stripeInfo?.hasCard ? (
                <p className="text-green-500 font-medium">
                  {stripeInfo.brand ? stripeInfo.brand.charAt(0).toUpperCase() + stripeInfo.brand.slice(1) : ""} •••• {stripeInfo.last4}
                  {stripeInfo.expMonth && stripeInfo.expYear ? <span className="text-muted-foreground font-normal"> {stripeInfo.expMonth}/{String(stripeInfo.expYear).slice(-2)}</span> : null}
                </p>
              ) : (
                <p className="text-muted-foreground font-medium">Não</p>
              )}
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground">PWA:</span>
              <p className={`font-medium ${user.pwaInstalled ? "text-green-500" : "text-muted-foreground"}`}>
                {user.pwaInstalled ? "Instalado" : "Não"}
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground">Convite:</span>
              <p className="text-foreground truncate">{user.invitedBy || "—"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isMainAdmin && (
              <>
                {user.isPremium || user.premiumReason === "paid" ? (
                  <button
                    onClick={() => onUpdate(user.id, { isPremium: false, premiumUntil: null })}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    data-testid={`button-revoke-premium-${user.id}`}
                  >
                    <XCircle size={12} /> Revogar Premium
                  </button>
                ) : (
                  <button
                    onClick={() => setShowGrantPremium(!showGrantPremium)}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 hover:bg-yellow-500/20 transition-colors flex items-center gap-1"
                    data-testid={`button-grant-premium-${user.id}`}
                  >
                    <Star size={12} /> Liberar Premium
                  </button>
                )}

                {showGrantPremium && (
                  <div className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 space-y-2">
                    {!grantConfirm ? (
                      <>
                        <p className="text-[11px] text-muted-foreground">Por quantos dias?</p>
                        <div className="flex gap-2 flex-wrap">
                          {[30, 90, 180, 365].map(d => (
                            <button
                              key={d}
                              onClick={() => setGrantDays(d)}
                              className={`text-[10px] px-2 py-1 rounded-md border ${grantDays === d ? "bg-yellow-500 text-white border-yellow-500" : "border-border text-muted-foreground hover:bg-muted"}`}
                              data-testid={`button-grant-days-${d}`}
                            >
                              {d}d
                            </button>
                          ))}
                          <button
                            onClick={() => setGrantDays(0)}
                            className={`text-[10px] px-2 py-1 rounded-md border ${grantDays === 0 ? "bg-yellow-500 text-white border-yellow-500" : "border-border text-muted-foreground hover:bg-muted"}`}
                            data-testid="button-grant-unlimited"
                          >
                            Ilimitado
                          </button>
                        </div>
                        <button
                          onClick={() => { setGrantConfirm(true); setGrantConfirmText(""); }}
                          className="w-full text-[11px] px-3 py-1.5 rounded-lg bg-yellow-500 text-white font-medium"
                          data-testid={`button-confirm-grant-${user.id}`}
                        >
                          Liberar — {grantDays > 0 ? `${grantDays} dias` : "Ilimitado"}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-muted-foreground">
                          Escreve <strong className="text-foreground">"confirmar"</strong> para liberar premium a <strong className="text-foreground">{user.name}</strong>:
                        </p>
                        <input
                          type="text"
                          value={grantConfirmText}
                          onChange={e => setGrantConfirmText(e.target.value)}
                          placeholder="confirmar"
                          className="w-full text-[11px] px-2 py-1.5 rounded-md border border-border bg-background"
                          data-testid={`input-grant-confirm-${user.id}`}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setGrantConfirm(false); setGrantConfirmText(""); }}
                            className="flex-1 text-[11px] px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                            data-testid={`button-cancel-grant-${user.id}`}
                          >
                            Cancelar
                          </button>
                          <button
                            disabled={grantConfirmText !== "confirmar"}
                            onClick={() => {
                              const premiumUntil = grantDays > 0 ? new Date(Date.now() + grantDays * 86400000).toISOString() : null;
                              onUpdate(user.id, { isPremium: true, premiumUntil });
                              setShowGrantPremium(false);
                              setGrantConfirm(false);
                              setGrantConfirmText("");
                            }}
                            className="flex-1 text-[11px] px-3 py-1.5 rounded-lg bg-yellow-500 text-white font-medium disabled:opacity-40"
                            data-testid={`button-confirm-grant-final-${user.id}`}
                          >
                            Confirmar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {user.hasBook ? (
                  <>
                    <button
                      disabled={grantingBook}
                      onClick={async () => {
                        setGrantingBook(true);
                        try {
                          await apiRequest("DELETE", `/api/admin/users/${user.id}/revoke-book`);
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                        } finally { setGrantingBook(false); }
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
                      data-testid={`button-revoke-book-${user.id}`}
                    >
                      <BookOpen size={12} /> Revogar Livro
                    </button>
                    {user.bookUntil && new Date(user.bookUntil) > new Date() && (
                      <span className="text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        até {new Date(user.bookUntil).toLocaleDateString("pt-PT")}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      disabled={grantingBook}
                      onClick={() => setShowGrantBook(!showGrantBook)}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                      data-testid={`button-grant-book-${user.id}`}
                    >
                      <BookOpen size={12} /> Liberar Livro
                    </button>
                    {showGrantBook && (
                      <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                        <p className="text-[11px] text-muted-foreground">Por quanto tempo?</p>
                        <div className="flex gap-2 flex-wrap">
                          {[7, 30, 90, 365].map(d => (
                            <button
                              key={d}
                              onClick={() => setGrantBookDays(d)}
                              className={`text-[10px] px-2 py-1 rounded-md border ${grantBookDays === d ? "bg-emerald-500 text-white border-emerald-500" : "border-border text-muted-foreground hover:bg-muted"}`}
                              data-testid={`button-grant-book-days-${d}`}
                            >
                              {d}d
                            </button>
                          ))}
                          <button
                            onClick={() => setGrantBookDays(0)}
                            className={`text-[10px] px-2 py-1 rounded-md border ${grantBookDays === 0 ? "bg-emerald-500 text-white border-emerald-500" : "border-border text-muted-foreground hover:bg-muted"}`}
                            data-testid="button-grant-book-permanent"
                          >
                            Permanente
                          </button>
                        </div>
                        <button
                          disabled={grantingBook}
                          onClick={async () => {
                            setGrantingBook(true);
                            try {
                              await apiRequest("POST", `/api/admin/users/${user.id}/grant-book`, { days: grantBookDays });
                              queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                              setShowGrantBook(false);
                            } finally { setGrantingBook(false); }
                          }}
                          className="w-full text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-40"
                          data-testid={`button-confirm-grant-book-${user.id}`}
                        >
                          Liberar — {grantBookDays > 0 ? `${grantBookDays} dias` : "Permanente"}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {user.isActive ? (
                  <button
                    onClick={() => onUpdate(user.id, { isActive: false })}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                    data-testid={`button-block-${user.id}`}
                  >
                    <Ban size={12} /> Bloquear
                  </button>
                ) : (
                  <button
                    onClick={() => onUpdate(user.id, { isActive: true })}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 hover:bg-green-500/20 transition-colors flex items-center gap-1"
                    data-testid={`button-unblock-${user.id}`}
                  >
                    <Check size={12} /> Desbloquear
                  </button>
                )}

                {showTrialPicker ? (
                  <div className="w-full flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <span className="text-[11px] text-blue-600 whitespace-nowrap">Estender por</span>
                    <select
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                      className="text-[11px] px-2 py-1 rounded bg-background border border-border text-foreground"
                    >
                      <option value={7}>7 dias</option>
                      <option value={14}>14 dias</option>
                      <option value={16}>16 dias</option>
                      <option value={30}>30 dias</option>
                      <option value={60}>60 dias</option>
                      <option value={90}>90 dias</option>
                    </select>
                    <button
                      onClick={() => {
                        const newEnd = new Date();
                        newEnd.setDate(newEnd.getDate() + trialDays);
                        onUpdate(user.id, { trialEndsAt: newEnd.toISOString() });
                        setShowTrialPicker(false);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded bg-blue-500 text-white font-medium"
                      data-testid={`button-confirm-trial-${user.id}`}
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setShowTrialPicker(false)}
                      className="text-[11px] px-2 py-1 rounded bg-muted text-muted-foreground"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowTrialPicker(true)}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                      data-testid={`button-extend-trial-${user.id}`}
                    >
                      <Clock size={12} /> Estender Trial
                    </button>
                    {trialEnd && trialEnd > new Date() && (
                      <button
                        onClick={() => onUpdate(user.id, { trialEndsAt: new Date(0).toISOString() })}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500/20 transition-colors flex items-center gap-1"
                        data-testid={`button-end-trial-${user.id}`}
                      >
                        <XCircle size={12} /> Encerrar Trial
                      </button>
                    )}
                    <button
                      disabled={grantingBonus}
                      onClick={async () => {
                        setGrantingBonus(true);
                        try {
                          await fetch(`/api/admin/users/${user.id}/grant-trial-bonus`, { method: "POST", credentials: "include" });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                        } finally {
                          setGrantingBonus(false);
                        }
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 hover:bg-green-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                      data-testid={`button-grant-bonus-${user.id}`}
                    >
                      <Star size={12} /> {grantingBonus ? "..." : "+16 dias bónus"}
                    </button>
                  </>
                )}

                {isMainAdmin ? (
                  <span className="text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 font-semibold flex items-center gap-1">
                    <Crown size={12} /> Admin Master
                  </span>
                ) : adminConfirmAction ? (
                  <div className="w-full bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2">
                    <p className="text-[11px] text-muted-foreground">
                      Escreve <strong className="text-foreground">"confirmar"</strong> para{" "}
                      {adminConfirmAction === "grant" ? (
                        <>tornar <strong className="text-foreground">{user.name}</strong> admin</>
                      ) : (
                        <>remover admin de <strong className="text-foreground">{user.name}</strong></>
                      )}:
                    </p>
                    <input
                      type="text"
                      value={adminConfirmText}
                      onChange={e => setAdminConfirmText(e.target.value)}
                      placeholder="confirmar"
                      className="w-full text-[11px] px-2 py-1.5 rounded-md border border-border bg-background"
                      data-testid={`input-admin-confirm-${user.id}`}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setAdminConfirmAction(null); setAdminConfirmText(""); }}
                        className="flex-1 text-[11px] px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`button-cancel-admin-${user.id}`}
                      >
                        Cancelar
                      </button>
                      <button
                        disabled={adminConfirmText !== "confirmar"}
                        onClick={() => {
                          onUpdate(user.id, { role: adminConfirmAction === "grant" ? "admin" : "user" });
                          setAdminConfirmAction(null);
                          setAdminConfirmText("");
                        }}
                        className="flex-1 text-[11px] px-3 py-1.5 rounded-lg bg-purple-500 text-white font-medium disabled:opacity-40"
                        data-testid={`button-confirm-admin-${user.id}`}
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ) : user.role !== "admin" ? (
                  <button
                    onClick={() => { setAdminConfirmAction("grant"); setAdminConfirmText(""); }}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 hover:bg-purple-500/20 transition-colors flex items-center gap-1"
                    data-testid={`button-promote-admin-${user.id}`}
                  >
                    <Shield size={12} /> Tornar Admin
                  </button>
                ) : (
                  <button
                    onClick={() => { setAdminConfirmAction("revoke"); setAdminConfirmText(""); }}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    data-testid={`button-demote-admin-${user.id}`}
                  >
                    <Shield size={12} /> Remover Admin
                  </button>
                )}

                {isMainAdmin && currentUserIsMaster ? (
                  <>
                    <button
                      onClick={() => setShowTransferDialog(true)}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                      data-testid={`button-delete-master-${user.id}`}
                    >
                      <Trash2 size={12} /> Apagar Minha Conta
                    </button>
                    {showTransferDialog && (
                      <div className="w-full p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertCircle size={16} />
                          <p className="text-xs font-semibold">Transferir Admin Master</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Antes de apagar sua conta, escolha quem será o novo Admin Master. Esta ação é irreversível.
                        </p>
                        <select
                          value={selectedNewMaster}
                          onChange={(e) => { setSelectedNewMaster(e.target.value); setTransferError(""); }}
                          className="w-full text-xs px-3 py-2 rounded-lg bg-background border border-border text-foreground"
                          data-testid="select-new-master"
                        >
                          <option value="">Selecione o novo Admin Master...</option>
                          {allUsers.filter(u => u.id !== user.id && u.isActive).map(u => (
                            <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                        {selectedNewMaster && (
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-1">
                              Digite <strong>"apagar"</strong> para confirmar:
                            </p>
                            <input
                              type="text"
                              value={transferConfirmText}
                              onChange={(e) => setTransferConfirmText(e.target.value)}
                              placeholder="apagar"
                              className="w-full text-xs px-3 py-2 rounded-lg bg-background border border-border text-foreground"
                              data-testid="input-transfer-confirm"
                            />
                          </div>
                        )}
                        {transferError && (
                          <p className="text-[11px] text-red-500">{transferError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!selectedNewMaster) {
                                setTransferError("Selecione o novo Admin Master");
                                return;
                              }
                              if (transferConfirmText !== "apagar") {
                                setTransferError('Digite "apagar" para confirmar');
                                return;
                              }
                              try {
                                const res = await fetch(`/api/admin/users/${user.id}`, {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ newMasterEmail: selectedNewMaster }),
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  window.location.href = "/";
                                } else {
                                  setTransferError(data.message || "Erro ao transferir");
                                }
                              } catch {
                                setTransferError("Erro de conexão");
                              }
                            }}
                            disabled={!selectedNewMaster || transferConfirmText !== "apagar"}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            data-testid="button-confirm-transfer-delete"
                          >
                            <Trash2 size={12} /> Confirmar e Apagar
                          </button>
                          <button
                            onClick={() => { setShowTransferDialog(false); setSelectedNewMaster(""); setTransferConfirmText(""); setTransferError(""); }}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : !isMainAdmin && (
                  <>
                    {confirmDelete ? (
                      <div className="mt-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                          Esta ação é irreversível. Todos os dados serão apagados.
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Escreve <strong className="text-foreground">"apagar"</strong> para confirmar:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={e => setDeleteConfirmText(e.target.value)}
                          placeholder="apagar"
                          className="w-full text-[11px] px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:border-red-400"
                          data-testid={`input-delete-confirm-${user.id}`}
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => { onDelete(user.id); setConfirmDelete(false); setDeleteConfirmText(""); }}
                            disabled={deleteConfirmText !== "apagar"}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            data-testid={`button-confirm-delete-${user.id}`}
                          >
                            <Trash2 size={12} /> Apagar definitivamente
                          </button>
                          <button
                            onClick={() => { setConfirmDelete(false); setDeleteConfirmText(""); }}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                        data-testid={`button-delete-${user.id}`}
                      >
                        <Trash2 size={12} /> Apagar Conta
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [grantPremium, setGrantPremium] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; grantPremium: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/invite", data);
      return res.json();
    },
    onSuccess: (data) => {
      setResult(`Conta criada! Senha temporária: ${data.tempPassword}`);
      setName("");
      setEmail("");
      setGrantPremium(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      onSuccess();
    },
  });

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome"
        className="w-full p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        data-testid="input-invite-name"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        className="w-full p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        data-testid="input-invite-email"
      />
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={grantPremium}
          onChange={(e) => setGrantPremium(e.target.checked)}
          className="rounded"
          data-testid="checkbox-invite-premium"
        />
        Liberar Premium
      </label>
      <button
        onClick={() => inviteMutation.mutate({ name, email, grantPremium })}
        disabled={!name.trim() || !email.trim() || inviteMutation.isPending}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        data-testid="button-send-invite"
      >
        <Send size={16} />
        {inviteMutation.isPending ? "Criando..." : "Convidar"}
      </button>
      {result && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 text-sm">
          {result}
        </div>
      )}
      {inviteMutation.isError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          Erro ao convidar. Verifique se o email já existe.
        </div>
      )}
    </div>
  );
}

function FeedbackStatusBadge({ status }: { status: string }) {
  if (status === "open") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">Aberto</span>;
  }
  if (status === "in_progress") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">Em Andamento</span>;
  }
  if (status === "resolved") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">Resolvido</span>;
  }
  if (status === "closed") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Fechado</span>;
  }
  return null;
}

function FeedbackTypeBadge({ type }: { type: string }) {
  if (type === "bug") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">Bug</span>;
  }
  if (type === "idea") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium">Ideia</span>;
  }
  if (type === "support") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">Suporte</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Feedback</span>;
}

function FeedbackCard({ ticket, onUpdate }: { ticket: FeedbackTicket; onUpdate: (id: number, data: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(ticket.adminNote || "");
  const createdAt = new Date(ticket.createdAt);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
        data-testid={`feedback-card-${ticket.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
            <FeedbackTypeBadge type={ticket.type} />
            <FeedbackStatusBadge status={ticket.status} />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {ticket.userName} ({ticket.userEmail}) — {createdAt.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3 animate-in fade-in duration-200">
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-foreground whitespace-pre-wrap">
            {ticket.message}
          </div>

          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota do admin (opcional)..."
              className="w-full p-2.5 rounded-lg bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={2}
              data-testid={`textarea-admin-note-${ticket.id}`}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["open", "in_progress", "resolved", "closed"].map((s) => (
              <button
                key={s}
                onClick={() => onUpdate(ticket.id, { status: s, adminNote: note || undefined })}
                className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                  ticket.status === s
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
                }`}
                data-testid={`button-status-${s}-${ticket.id}`}
              >
                {s === "open" && <AlertCircle size={11} />}
                {s === "in_progress" && <Clock size={11} />}
                {s === "resolved" && <CheckCircle2 size={11} />}
                {s === "closed" && <XCircle size={11} />}
                {s === "open" ? "Aberto" : s === "in_progress" ? "Em Andamento" : s === "resolved" ? "Resolvido" : "Fechado"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function splitByFrases(text: string): string[] {
  const result: string[] = [];
  let buf = "";
  let i = 0;
  while (i < text.length) {
    buf += text[i];
    if (/[.!?]/.test(text[i]) && i + 1 < text.length) {
      let j = i + 1;
      while (j < text.length && text[j] === " ") j++;
      const nextChar = text[j];
      if (nextChar && /[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ"—]/.test(nextChar) && buf.trim().length >= 60) {
        result.push(buf.trim());
        buf = "";
        i = j;
        continue;
      }
    }
    i++;
  }
  if (buf.trim()) result.push(buf.trim());
  return result.filter(p => p.length > 0);
}

function processContent(raw: string): string[] {
  if (!raw.trim()) return [];
  if (raw.includes("\n\n")) {
    return raw.split(/\n\n+/).map(block =>
      block.split("\n").map(l => l.trim()).filter(l => l.length > 0).join(" ")
    ).filter(p => p.trim().length > 0);
  }
  if (!raw.includes("\n")) return splitByFrases(raw);
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const paragraphs: string[] = [];
  let current = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    current = current ? current + " " + line : line;
    const next = lines[i + 1];
    if (!next) { paragraphs.push(current); break; }
    const endsWithPunct = /[.!?]["»"']?$/.test(line);
    const nextStartsCap = /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ""—]/.test(next);
    if (endsWithPunct && nextStartsCap) { paragraphs.push(current); current = ""; }
  }
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs.filter(p => p.length > 0);
}

function renderInlineMarkdown(text: string, keyPrefix = "md"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match;
  let ki = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) nodes.push(<strong key={`${keyPrefix}-bi${ki++}`} style={{ fontWeight: 700 }}><em>{match[1]}</em></strong>);
    else if (match[2] !== undefined) nodes.push(<strong key={`${keyPrefix}-b${ki++}`} style={{ fontWeight: 700 }}>{match[2]}</strong>);
    else if (match[3] !== undefined) nodes.push(<em key={`${keyPrefix}-i${ki++}`}>{match[3]}</em>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Versão previsível para o editor admin:
// SOMENTE \n\n cria novo parágrafo. \n simples = continuação da linha (vira espaço).
// Linhas iniciadas com "- " formam lista de bullet points.
function processContentEditor(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/\n\n+/)
    .map(block => {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0 && lines.every(l => l.startsWith("- "))) return lines.join("\n");
      return lines.join(" ");
    })
    .filter(p => p.trim().length > 0);
}

function parseAdminSections(paras: string[]): {
  body: string[];
  dica: { instruction: string; quote: string } | null;
  oracao: string[];
} {
  const dicaIdx = paras.findIndex(p => /\bdica do dia\b/i.test(p));
  const oracaoIdx = paras.findIndex(p => /momento de ora/i.test(p));
  const bodyEnd = dicaIdx >= 0 ? dicaIdx : (oracaoIdx >= 0 ? oracaoIdx : paras.length);
  const body = paras.slice(0, bodyEnd);
  let dica: { instruction: string; quote: string } | null = null;
  if (dicaIdx >= 0) {
    const end = oracaoIdx >= 0 ? oracaoIdx : paras.length;
    const dicaText = paras.slice(dicaIdx, end).join(" ");
    const quoteMatch = dicaText.match(/[""«]([^""»]+)[""»]/);
    const instruction = dicaText.replace(/\bdica do dia\b/gi, "").replace(/diga em sil[eê]ncio[:\s]*/gi, "").replace(/[""«][^""»]+[""»]/g, "").trim();
    const quote = quoteMatch?.[1]?.trim() || "";
    if (quote || instruction) dica = { instruction, quote };
  }
  const oracaoRaw = oracaoIdx >= 0 ? paras.slice(oracaoIdx) : [];
  const oracao = oracaoRaw.map(p => p.replace(/^momento de ora[çc][aã]o\s*/gi, "").trim()).filter(p => p.length > 0);
  return { body, dica, oracao };
}

function chapterDateAdmin(order: number): { day: number; month: string } {
  const d = new Date(2025, 0, order);
  const month = d.toLocaleString("pt-BR", { month: "short" }).toUpperCase().replace(".", "");
  return { day: d.getDate(), month };
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "feedback" | "push" | "coupons" | "analytics" | "livro" | "biblioteca" | "precos">("users");
  const [bookEditId, setBookEditId] = useState<number | null>(null);
  const [bookForm, setBookForm] = useState({ order: 1, title: "", tag: "", excerpt: "", content: "", isPreview: false, imageUrl: "" });
  const [bookFormOpen, setBookFormOpen] = useState(false);
  const [bookPreview, setBookPreview] = useState(false);
  const bookTextareaRef = useRef<HTMLTextAreaElement>(null);

  type LibraryBookMeta = { id: number; title: string; author: string; description: string; coverImageData: string | null; priceDisplay: string; priceInCents: number; requiresPremium: boolean; isPublished: boolean; freePages: number; freePageNumbers: number[]; createdAt: string };
  const emptyLibForm = { title: "", author: "", description: "", priceDisplay: "Grátis", priceInCents: 0, requiresPremium: false, isPublished: false, coverImageData: "" as string, pdfData: "" as string, freePages: 3, freePageNumbers: [] as number[] };
  const [libFormOpen, setLibFormOpen] = useState(false);
  const [libEditId, setLibEditId] = useState<number | null>(null);
  const [libForm, setLibForm] = useState(emptyLibForm);
  const [libAccessType, setLibAccessType] = useState<"free" | "premium" | "paid">("free");
  const [libPriceReais, setLibPriceReais] = useState("");
  const [libPdfName, setLibPdfName] = useState("");
  const [libUploading, setLibUploading] = useState(false);
  const [libPageEditorBook, setLibPageEditorBook] = useState<LibraryBookMeta | null>(null);
  const [libPageEdits, setLibPageEdits] = useState<Record<number, string>>({});
  const [libPageTitleEdits, setLibPageTitleEdits] = useState<Record<number, string>>({});
  const [libPageSubtitleEdits, setLibPageSubtitleEdits] = useState<Record<number, string>>({});
  const [libPageTagEdits, setLibPageTagEdits] = useState<Record<number, string>>({});
  const [libPageOrderEdits, setLibPageOrderEdits] = useState<Record<number, number>>({});
  const [libPageSaving, setLibPageSaving] = useState<Record<number, boolean>>({});
  const [libPageDeleting, setLibPageDeleting] = useState<Record<number, boolean>>({});
  const [libPageConfirmDelete, setLibPageConfirmDelete] = useState<number | null>(null);
  const [libPageExpanded, setLibPageExpanded] = useState<number | null>(null);
  const [libPagePreview, setLibPagePreview] = useState<number | null>(null);
  const [libPagePdfUploading, setLibPagePdfUploading] = useState(false);
  const libPagePdfInputRef = useRef<HTMLInputElement>(null);
  const libPageTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  function applyFormatLibPage(pageNumber: number, tag: "**" | "*") {
    const el = libPageTextareaRefs.current[pageNumber];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const selected = value.slice(start, end);
    const newContent = value.slice(0, start) + tag + selected + tag + value.slice(end);
    setLibPageEdits(s => ({ ...s, [pageNumber]: newContent }));
    requestAnimationFrame(() => {
      el.focus();
      const cur = start + tag.length;
      el.setSelectionRange(cur, selected ? end + tag.length : cur);
    });
  }

  function applyBulletLibPage(pageNumber: number) {
    const el = libPageTextareaRefs.current[pageNumber];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const selected = value.slice(start, end);
    if (selected.trim()) {
      const newSelected = selected.split("\n")
        .map((l: string) => (l.trim() ? (l.trimStart().startsWith("- ") ? l : "- " + l.trim()) : l))
        .join("\n");
      const before = value.slice(0, start);
      const needsBreak = before.length > 0 && !before.endsWith("\n\n");
      const prefix = needsBreak ? "\n\n" : "";
      const newContent = before + prefix + newSelected + value.slice(end);
      setLibPageEdits(s => ({ ...s, [pageNumber]: newContent }));
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length + newSelected.length); });
    } else {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const prevLine = before.split("\n").pop() ?? "";
      const isInList = prevLine.trimStart().startsWith("- ");
      const insert = isInList ? "\n- " : (before.length > 0 && !before.endsWith("\n\n") ? "\n\n- " : "- ");
      const newContent = before + insert + after;
      setLibPageEdits(s => ({ ...s, [pageNumber]: newContent }));
      requestAnimationFrame(() => { el.focus(); const pos = start + insert.length; el.setSelectionRange(pos, pos); });
    }
  }

  async function deleteLibPage(bookId: number, pageNumber: number) {
    setLibPageDeleting(s => ({ ...s, [pageNumber]: true }));
    try {
      await fetch(`/api/admin/library/books/${bookId}/pages/${pageNumber}`, { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/library/books", bookId, "pages"] });
      setLibPageConfirmDelete(null);
      if (libPageExpanded === pageNumber) setLibPageExpanded(null);
    } finally {
      setLibPageDeleting(s => ({ ...s, [pageNumber]: false }));
    }
  }

  function applyFormat(tag: "**" | "*") {
    const el = bookTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const selected = value.slice(start, end);
    const newContent = value.slice(0, start) + tag + selected + tag + value.slice(end);
    setBookForm(f => ({ ...f, content: newContent }));
    requestAnimationFrame(() => {
      el.focus();
      const cur = selected ? start + tag.length : start + tag.length;
      el.setSelectionRange(cur, selected ? end + tag.length : cur);
    });
  }

  function applyBullet() {
    const el = bookTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const selected = value.slice(start, end);
    if (selected.trim()) {
      // Prefix each selected line with "- "
      const newSelected = selected
        .split("\n")
        .map(l => (l.trim() ? (l.trimStart().startsWith("- ") ? l : "- " + l.trim()) : l))
        .join("\n");
      const before = value.slice(0, start);
      const needsBreak = before.length > 0 && !before.endsWith("\n\n");
      const prefix = needsBreak ? "\n\n" : "";
      const newContent = before + prefix + newSelected + value.slice(end);
      setBookForm(f => ({ ...f, content: newContent }));
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length + newSelected.length); });
    } else {
      // Insert a new bullet item at cursor
      const before = value.slice(0, start);
      const after = value.slice(end);
      // If previous line is also a bullet, just add \n- ; otherwise add \n\n-
      const prevLine = before.split("\n").pop() ?? "";
      const isInList = prevLine.trimStart().startsWith("- ");
      const insert = isInList ? "\n- " : (before.length > 0 && !before.endsWith("\n\n") ? "\n\n- " : "- ");
      const newContent = before + insert + after;
      setBookForm(f => ({ ...f, content: newContent }));
      requestAnimationFrame(() => { el.focus(); const pos = start + insert.length; el.setSelectionRange(pos, pos); });
    }
  }
  const [bookExpandedId, setBookExpandedId] = useState<number | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [excludeAdmins, setExcludeAdmins] = useState(true);
  const [adminAlert, setAdminAlert] = useState<string | null>(null);
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const isCustomRange = !!(appliedStart && appliedEnd);

  function buildAnalyticsUrl(path: string) {
    const params = new URLSearchParams({ excludeAdmins: String(excludeAdmins) });
    if (isCustomRange) {
      params.set("startDate", appliedStart);
      params.set("endDate", appliedEnd);
    } else {
      params.set("days", String(analyticsDays));
    }
    return `${path}?${params.toString()}`;
  }

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: allUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: allFeedback = [] } = useQuery<FeedbackTicket[]>({
    queryKey: ["/api/admin/feedback"],
  });

  const { data: notifyPrefs } = useQuery<{ notifyNewUser: boolean; notifyNewSub: boolean }>({
    queryKey: ["/api/admin/notify-prefs"],
  });

  const { data: analyticsData } = useQuery<{
    eventCounts: { event: string; count: number }[];
    dailyActive: { date: string; count: number }[];
  }>({
    queryKey: ["/api/admin/analytics", analyticsDays, excludeAdmins, appliedStart, appliedEnd],
    queryFn: () => fetch(buildAnalyticsUrl("/api/admin/analytics"), { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "analytics",
  });

  const { data: topUsersRaw } = useQuery<{ userId: string; name: string; email: string; avatarUrl: string | null; count: number }[]>({
    queryKey: ["/api/admin/top-users", analyticsDays, excludeAdmins, appliedStart, appliedEnd],
    queryFn: () => fetch(buildAnalyticsUrl("/api/admin/top-users") + "&limit=50", { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "analytics",
  });
  const topUsers = Array.isArray(topUsersRaw) ? topUsersRaw : [];

  const todayDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const { data: hourlyDataRaw } = useQuery<{ hour: number; count: number }[]>({
    queryKey: ["/api/admin/analytics/hourly", todayDateStr, excludeAdmins],
    queryFn: () => fetch(`/api/admin/analytics/hourly?date=${todayDateStr}&excludeAdmins=${excludeAdmins}`, { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "analytics" && analyticsDays === 1 && !isCustomRange,
    refetchInterval: 60_000,
  });
  const hourlyData: { hour: number; count: number }[] = Array.isArray(hourlyDataRaw) ? hourlyDataRaw : [];

  const { data: demographics } = useQuery<{
    total: number;
    withAge: number;
    withInterests: number;
    ageRanges: { range: string; count: number }[];
    topInterests: { interest: string; count: number }[];
  }>({
    queryKey: ["/api/admin/demographics", excludeAdmins],
    queryFn: () => fetch(`/api/admin/demographics?excludeAdmins=${excludeAdmins}`, { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "analytics",
  });

  const { data: patterns } = useQuery<{
    hourlyPattern: { hour: number; count: number }[];
    weekdayPattern: { weekday: number; name: string; count: number }[];
    ageGroupActivity: { range: string; eventCount: number; userCount: number }[];
  }>({
    queryKey: ["/api/admin/analytics/patterns", analyticsDays, excludeAdmins, appliedStart, appliedEnd],
    queryFn: () => fetch(buildAnalyticsUrl("/api/admin/analytics/patterns"), { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "analytics",
  });

  const [showAllTopUsers, setShowAllTopUsers] = useState(false);

  const { data: pushStatus, refetch: refetchPushStatus } = useQuery<{ subscriptionCount: number; hasSubscription: boolean }>({
    queryKey: ["/api/admin/push-status"],
    refetchOnWindowFocus: true,
  });

  const { data: adminBookChapters = [], refetch: refetchBookChapters } = useQuery<{ id: number; order: number; title: string; tag: string | null; excerpt: string | null; content: string; isPreview: boolean }[]>({
    queryKey: ["/api/admin/book/chapters"],
    queryFn: () => fetch("/api/admin/book/chapters", { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "livro",
  });

  const { data: bookPurchases = [] } = useQuery<{ userId: string; name: string; email: string; amountCents: number; createdAt: string }[]>({
    queryKey: ["/api/admin/book/purchases"],
    queryFn: () => fetch("/api/admin/book/purchases", { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "livro",
  });

  const { data: adminLibBooks = [], refetch: refetchLibBooks } = useQuery<LibraryBookMeta[]>({
    queryKey: ["/api/admin/library/books"],
    queryFn: async () => {
      const r = await fetch("/api/admin/library/books", { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: activeTab === "biblioteca",
  });

  const { data: libEditorPages = [], isLoading: libEditorLoading } = useQuery<{ id: number; pageNumber: number; content: string }[]>({
    queryKey: ["/api/admin/library/books", libPageEditorBook?.id, "pages"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/library/books/${libPageEditorBook!.id}/pages`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!libPageEditorBook,
  });

  const { data: libEditPages = [] } = useQuery<{ id: number; pageNumber: number; title: string | null }[]>({
    queryKey: ["/api/admin/library/books", libEditId, "pages"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/library/books/${libEditId}/pages`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: libFormOpen && libEditId !== null,
  });

  const [bookPriceInput, setBookPriceInput] = useState("");
  const [newPlanForm, setNewPlanForm] = useState({ name: "", description: "", amount: "", interval: "month" as "month" | "year" });
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);

  const { data: adminSettings = {}, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => fetch("/api/admin/settings", { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "precos",
  });

  const { data: stripePlansRaw = [], isLoading: plansLoading } = useQuery<{
    product_id: string; product_name: string; product_description: string | null;
    price_id: string; unit_amount: number | null; currency: string;
    recurring: { interval: string; interval_count: number } | null;
  }[]>({
    queryKey: ["/api/stripe/products"],
    queryFn: () => fetch("/api/stripe/products", { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "precos",
  });
  const stripePlans = Array.isArray(stripePlansRaw) ? stripePlansRaw : [];

  const { data: chatChannels = [], isLoading: channelsLoading } = useQuery<{
    id: number; name: string; emoji: string; description: string | null; isPremium: boolean; isPrivate: boolean;
  }[]>({
    queryKey: ["/api/chat/channels"],
    queryFn: () => fetch("/api/chat/channels", { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "precos",
  });
  const channelsList = Array.isArray(chatChannels) ? chatChannels : [];

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Record<string, string>) => apiRequest("PATCH", "/api/admin/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Configurações guardadas!" });
    },
    onError: () => toast({ title: "Erro ao guardar configurações", variant: "destructive" }),
  });

  const createPlanMutation = useMutation({
    mutationFn: (data: { name: string; description: string; amount: string; interval: string }) =>
      apiRequest("POST", "/api/admin/stripe/plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/products"] });
      setShowNewPlanForm(false);
      setNewPlanForm({ name: "", description: "", amount: "", interval: "month" });
      toast({ title: "Plano criado com sucesso!" });
    },
    onError: (err: any) => toast({ title: err?.message || "Erro ao criar plano", variant: "destructive" }),
  });

  const archivePlanMutation = useMutation({
    mutationFn: (priceId: string) => apiRequest("DELETE", `/api/admin/stripe/plans/${priceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/products"] });
      toast({ title: "Plano arquivado." });
    },
    onError: () => toast({ title: "Erro ao arquivar plano", variant: "destructive" }),
  });

  const updateChannelPremiumMutation = useMutation({
    mutationFn: ({ id, isPremium }: { id: number; isPremium: boolean }) =>
      apiRequest("PATCH", `/api/chat/channels/${id}`, { is_premium: isPremium }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/channels"] });
      toast({ title: "Canal atualizado." });
    },
    onError: () => toast({ title: "Erro ao atualizar canal", variant: "destructive" }),
  });

  async function saveLibPage(bookId: number, pageNumber: number, content: string, title?: string, subtitle?: string, tag?: string, newPageNumber?: number) {
    setLibPageSaving(s => ({ ...s, [pageNumber]: true }));
    try {
      const r = await fetch(`/api/admin/library/books/${bookId}/pages/${pageNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, title: title ?? "", subtitle: subtitle ?? "", tag: tag ?? "", newPageNumber }),
      });
      if (!r.ok) throw new Error("Erro ao guardar");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/library/books", bookId, "pages"] });
      toast({ title: `Página ${pageNumber} guardada.` });
    } catch {
      toast({ title: "Erro ao guardar página", variant: "destructive" });
    } finally {
      setLibPageSaving(s => ({ ...s, [pageNumber]: false }));
    }
  }

  async function handleLibPagePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !libPageEditorBook) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Por favor seleciona um ficheiro PDF", variant: "destructive" });
      return;
    }
    setLibPagePdfUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => {
          const result = ev.target?.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await fetch(`/api/admin/library/books/${libPageEditorBook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pdfData: base64 }),
      });
      if (!r.ok) throw new Error("Erro ao carregar PDF");
      toast({ title: "PDF carregado!", description: "As páginas foram extraídas com sucesso." });
      setLibPageEdits({});
      setLibPageExpanded(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/library/books", libPageEditorBook.id, "pages"] });
    } catch (err) {
      toast({ title: "Erro ao carregar PDF", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLibPagePdfUploading(false);
      if (libPagePdfInputRef.current) libPagePdfInputRef.current.value = "";
    }
  }

  const createLibBookMutation = useMutation({
    mutationFn: (data: typeof emptyLibForm) => apiRequest("POST", "/api/admin/library/books", data),
    onSuccess: () => {
      refetchLibBooks();
      queryClient.invalidateQueries({ queryKey: ["/api/library/books"] });
      setLibFormOpen(false); setLibForm(emptyLibForm); setLibPdfName(""); setLibEditId(null); setLibAccessType("free"); setLibPriceReais("");
      toast({ title: "Livro criado com sucesso!" });
    },
    onError: (err: Error) => { toast({ title: "Erro ao criar livro", description: err.message, variant: "destructive" }); },
  });

  const updateLibBookMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof emptyLibForm> }) => apiRequest("PATCH", `/api/admin/library/books/${id}`, data),
    onSuccess: () => {
      refetchLibBooks();
      queryClient.invalidateQueries({ queryKey: ["/api/library/books"] });
      setLibFormOpen(false); setLibForm(emptyLibForm); setLibPdfName(""); setLibEditId(null); setLibAccessType("free"); setLibPriceReais("");
      toast({ title: "Livro atualizado!" });
    },
    onError: (err: Error) => { toast({ title: "Erro ao atualizar livro", description: err.message, variant: "destructive" }); },
  });

  const deleteLibBookMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/library/books/${id}`, {}),
    onSuccess: () => {
      refetchLibBooks();
      queryClient.invalidateQueries({ queryKey: ["/api/library/books"] });
      toast({ title: "Livro removido." });
    },
    onError: (err: Error) => { toast({ title: "Erro ao remover livro", description: err.message, variant: "destructive" }); },
  });

  function openLibEdit(book: LibraryBookMeta) {
    setLibEditId(book.id);
    setLibForm({ title: book.title, author: book.author, description: book.description, priceDisplay: book.priceDisplay, priceInCents: book.priceInCents, requiresPremium: book.requiresPremium, isPublished: book.isPublished, coverImageData: book.coverImageData || "", pdfData: "", freePages: book.freePages ?? 3, freePageNumbers: book.freePageNumbers ?? [] });
    if (book.requiresPremium) {
      setLibAccessType("premium");
      setLibPriceReais("");
    } else if (book.priceInCents > 0) {
      setLibAccessType("paid");
      setLibPriceReais((book.priceInCents / 100).toFixed(2).replace(".", ","));
    } else {
      setLibAccessType("free");
      setLibPriceReais("");
    }
    setLibPdfName("");
    setLibFormOpen(true);
  }

  function handleLibFileUpload(e: React.ChangeEvent<HTMLInputElement>, field: "pdfData" | "coverImageData") {
    const file = e.target.files?.[0];
    if (!file) return;
    setLibUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setLibForm(f => ({ ...f, [field]: base64 }));
      if (field === "pdfData") setLibPdfName(file.name);
      setLibUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function computeLibPricing() {
    if (libAccessType === "premium") {
      return { requiresPremium: true, priceInCents: 0, priceDisplay: "Só Premium" };
    } else if (libAccessType === "paid") {
      const reaisNum = parseFloat(libPriceReais.replace(",", ".")) || 0;
      const cents = Math.round(reaisNum * 100);
      const display = cents > 0 ? `R$${reaisNum.toFixed(2).replace(".", ",")}` : "Grátis";
      return { requiresPremium: false, priceInCents: cents, priceDisplay: display };
    } else {
      return { requiresPremium: false, priceInCents: 0, priceDisplay: "Grátis" };
    }
  }

  function submitLibForm() {
    const pricing = computeLibPricing();
    const data = { ...libForm, ...pricing };
    if (libEditId !== null) {
      const patch: Record<string, any> = { title: data.title, author: data.author, description: data.description, ...pricing, isPublished: data.isPublished, freePages: data.freePages, freePageNumbers: data.freePageNumbers };
      if (data.coverImageData) patch.coverImageData = data.coverImageData;
      if (data.pdfData) patch.pdfData = data.pdfData;
      updateLibBookMutation.mutate({ id: libEditId, data: patch });
    } else {
      createLibBookMutation.mutate(data);
    }
  }

  const notifyPrefsMutation = useMutation({
    mutationFn: async (data: { notifyNewUser?: boolean; notifyNewSub?: boolean }) => {
      const res = await fetch("/api/admin/notify-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notify-prefs"] });
    },
  });

  const [pushTestMsg, setPushTestMsg] = useState<string | null>(null);
  const [targetUserSearch, setTargetUserSearch] = useState("");
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUserName, setTargetUserName] = useState("");
  const [directTitle, setDirectTitle] = useState("365 Encontros com Deus Pai");
  const [directBody, setDirectBody] = useState("");
  const [directUrl, setDirectUrl] = useState("/");
  const [directSending, setDirectSending] = useState(false);
  const [directResult, setDirectResult] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const pushTestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/push-test", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao enviar");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPushTestMsg(data.sent > 0 ? `✅ Enviado para ${data.sent} dispositivo(s)` : "⚠️ Nenhum dispositivo recebeu");
      setTimeout(() => setPushTestMsg(null), 5000);
    },
    onError: (err: any) => {
      setPushTestMsg(`❌ ${err.message}`);
      setTimeout(() => setPushTestMsg(null), 6000);
    },
  });

  const handleSubscribePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await vapidRes.json();
      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = window.atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) applicationServerKey[i] = rawData.charCodeAt(i);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      const subJson = sub.toJSON() as any;
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        }),
      });
      refetchPushStatus();
      setPushTestMsg("✅ Inscrição renovada com sucesso!");
      setTimeout(() => setPushTestMsg(null), 4000);
    } catch (err: any) {
      setPushTestMsg(`❌ Erro ao inscrever: ${err.message}`);
      setTimeout(() => setPushTestMsg(null), 5000);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Erro ao atualizar");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setAdminAlert(null);
    },
    onError: (error: Error) => {
      setAdminAlert(error.message);
      setTimeout(() => setAdminAlert(null), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/feedback/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
    },
  });

  const handleUpdate = (id: string, data: any) => {
    updateMutation.mutate({ id, data });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleFeedbackUpdate = (id: number, data: any) => {
    updateFeedbackMutation.mutate({ id, data });
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = !searchTerm ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === "all") return true;
    if (filterStatus === "premium") return u.premiumReason === "paid" || u.premiumReason === "granted";
    if (filterStatus === "trial") return u.premiumReason === "trial";
    if (filterStatus === "expired") return u.premiumReason === "expired";
    if (filterStatus === "blocked") return !u.isActive;
    if (filterStatus === "admin") return u.role === "admin";
    return true;
  });

  const openFeedbackCount = allFeedback.filter(f => f.status === "open").length;

  const filteredTargetUsers = targetUserSearch.trim().length > 0
    ? allUsers.filter(u =>
        u.name.toLowerCase().includes(targetUserSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(targetUserSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSendDirect = async () => {
    if (!targetUserId || !directBody.trim()) return;
    setDirectSending(true);
    setDirectResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: directTitle, body: directBody, url: directUrl, targetUserId }),
      });
      const data = await res.json();
      if (data.sent > 0) {
        setDirectResult(`✅ Enviado para ${data.sent} dispositivo(s) de ${targetUserName}`);
        setDirectBody("");
      } else {
        setDirectResult(`⚠️ ${targetUserName} não tem dispositivos inscritos`);
      }
    } catch {
      setDirectResult("❌ Erro ao enviar. Tente novamente.");
    }
    setDirectSending(false);
    setTimeout(() => setDirectResult(null), 6000);
  };

  return (
    <div className="w-full box-border px-4 pt-0 pb-24 space-y-5 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="p-2 -ml-2 rounded-full hover:bg-muted shrink-0" data-testid="button-back-admin">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-serif text-foreground truncate">Painel Admin</h1>
          <p className="text-xs text-muted-foreground truncate">Gerencie usuários, feedbacks e acessos</p>
        </div>
      </div>

      {adminAlert && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200" data-testid="admin-alert">
          <AlertCircle size={14} />
          {adminAlert}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {([
          { id: "users", icon: <Users size={14} />, label: "Usuários" },
          { id: "analytics", icon: <TrendingUp size={14} />, label: "Analytics" },
          { id: "feedback", icon: <MessageSquare size={14} />, label: "Chamados", badge: openFeedbackCount },
          { id: "push", icon: <Send size={14} />, label: "Push" },
          { id: "coupons", icon: <Ticket size={14} />, label: "Cupões" },
          { id: "livro", icon: <BookOpen size={14} />, label: "Devocional" },
          { id: "biblioteca", icon: <Library size={14} />, label: "Biblioteca" },
          { id: "precos", icon: <CreditCard size={14} />, label: "Preços" },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-shrink-0 flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${
              activeTab === tab.id
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground border border-border"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon}
            <span className="text-[9px] font-medium leading-none">{tab.label}</span>
            {"badge" in tab && tab.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <>
          {stats && (
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon={Users} label="Total" value={stats.totalUsers} color="text-foreground" />
              <StatCard icon={TrendingUp} label="Ativos 30d" value={stats.activeUsers} color="text-green-500" />
              <StatCard icon={Star} label="Premium" value={stats.premiumUsers} color="text-yellow-500" />
              <StatCard icon={Clock} label="Trial" value={stats.trialUsers} color="text-blue-500" />
              <StatCard icon={Check} label="Liberados" value={stats.grantedUsers} color="text-green-500" />
              <StatCard icon={XCircle} label="Expirados" value={stats.expiredUsers} color="text-muted-foreground" />
              <StatCard icon={Ban} label="Bloqueados" value={stats.blockedUsers} color="text-red-500" />
              <StatCard icon={CreditCard} label="Cartão 30d" value={stats.cardBonusUsers ?? 0} color="text-violet-500" />
              <StatCard icon={BookOpen} label="Livro" value={stats.bookPurchaseUsers ?? 0} color="text-amber-500" />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              data-testid="button-toggle-invite"
            >
              <UserPlus size={16} />
              Convidar
            </button>
            <button
              onClick={() => downloadCsv("/api/admin/export/users.csv", `usuarios_${new Date().toISOString().slice(0,10)}.csv`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium"
              data-testid="btn-export-users"
            >
              <Download size={16} />
              Exportar CSV
            </button>
          </div>

          {showInvite && (
            <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <h3 className="text-sm font-medium text-foreground">Convidar Pessoa</h3>
              <InviteForm onSuccess={() => {}} />
            </div>
          )}

          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                data-testid="input-search-users"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: "all", label: "Todos" },
                { id: "trial", label: "Trial" },
                { id: "premium", label: "Premium" },
                { id: "expired", label: "Expirados" },
                { id: "blocked", label: "Bloqueados" },
                { id: "admin", label: "Admins" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`text-[11px] px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0 transition-colors ${
                    filterStatus === f.id
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
                  }`}
                  data-testid={`filter-${f.id}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{filteredUsers.length} usuário(s)</p>
            {filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} onUpdate={handleUpdate} onDelete={handleDelete} currentUserIsMaster={authUser?.isMasterAdmin === true} allUsers={allUsers} />
            ))}
          </div>
        </>
      )}

      {activeTab === "feedback" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-foreground" />
              <h2 className="text-sm font-medium text-foreground">
                {allFeedback.length} chamado(s) — {openFeedbackCount} aberto(s)
              </h2>
            </div>
            <button
              onClick={() => downloadCsv("/api/admin/export/feedback.csv", `feedback_${new Date().toISOString().slice(0,10)}.csv`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium"
              data-testid="btn-export-feedback"
            >
              <Download size={13} />
              Exportar CSV
            </button>
          </div>

          {allFeedback.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare size={32} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum chamado recebido ainda.</p>
            </div>
          ) : (
            allFeedback.map((ticket) => (
              <FeedbackCard key={ticket.id} ticket={ticket} onUpdate={handleFeedbackUpdate} />
            ))
          )}
        </div>
      )}

      {activeTab === "push" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell size={16} />
              Alertas do Admin
            </h3>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${pushStatus?.hasSubscription ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
              <span className={`w-2 h-2 rounded-full ${pushStatus?.hasSubscription ? "bg-green-500" : "bg-red-500"}`} />
              {pushStatus === undefined
                ? "Verificando inscrição..."
                : pushStatus.hasSubscription
                ? `${pushStatus.subscriptionCount} dispositivo(s) inscrito(s) — notificações ativas`
                : "Nenhuma inscrição ativa — notificações não serão entregues"}
            </div>

            {!pushStatus?.hasSubscription && (
              <button
                onClick={handleSubscribePush}
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                data-testid="button-push-subscribe"
              >
                Reativar Notificações neste Dispositivo
              </button>
            )}

            {pushStatus?.hasSubscription && (
              <button
                onClick={() => pushTestMutation.mutate()}
                disabled={pushTestMutation.isPending}
                className="w-full py-2 rounded-xl bg-muted text-foreground text-sm font-medium disabled:opacity-50"
                data-testid="button-push-test"
              >
                {pushTestMutation.isPending ? "Enviando..." : "Testar Notificação"}
              </button>
            )}

            {pushTestMsg && (
              <p className="text-xs text-center text-muted-foreground">{pushTestMsg}</p>
            )}

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between py-2 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">Novo usuário</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Receber notificação quando alguém criar conta</p>
                </div>
                <button
                  onClick={() => notifyPrefsMutation.mutate({ notifyNewUser: !notifyPrefs?.notifyNewUser })}
                  className="transition-colors shrink-0"
                  data-testid="toggle-notify-new-user"
                >
                  {notifyPrefs?.notifyNewUser ? (
                    <ToggleRight size={28} className="text-primary" />
                  ) : (
                    <ToggleLeft size={28} className="text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between py-2 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">Pagamentos e cartões</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Nova assinatura, cartão adicionado e renovações</p>
                </div>
                <button
                  onClick={() => notifyPrefsMutation.mutate({ notifyNewSub: !notifyPrefs?.notifyNewSub })}
                  className="transition-colors shrink-0"
                  data-testid="toggle-notify-new-sub"
                >
                  {notifyPrefs?.notifyNewSub ? (
                    <ToggleRight size={28} className="text-primary" />
                  ) : (
                    <ToggleLeft size={28} className="text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Send size={16} />
              Enviar para Usuário Específico
            </h3>

            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome ou email..."
                  value={targetUserId ? targetUserName : targetUserSearch}
                  onChange={(e) => {
                    if (targetUserId) {
                      setTargetUserId(null);
                      setTargetUserName("");
                    }
                    setTargetUserSearch(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => { if (!targetUserId) setShowUserDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
                  className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="input-target-user-search"
                />
                {targetUserId && (
                  <button
                    onClick={() => { setTargetUserId(null); setTargetUserName(""); setTargetUserSearch(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XCircle size={14} />
                  </button>
                )}
              </div>

              {showUserDropdown && filteredTargetUsers.length > 0 && !targetUserId && (
                <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {filteredTargetUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setTargetUserId(u.id);
                        setTargetUserName(u.name);
                        setTargetUserSearch("");
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center gap-2.5"
                      data-testid={`target-user-option-${u.id}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{displayEmail(u.email)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {targetUserId && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <input
                  type="text"
                  placeholder="Título"
                  value={directTitle}
                  onChange={e => setDirectTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="input-direct-title"
                />
                <textarea
                  placeholder="Mensagem..."
                  value={directBody}
                  onChange={e => setDirectBody(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  data-testid="input-direct-body"
                />
                <input
                  type="text"
                  placeholder="URL (ex: /journey)"
                  value={directUrl}
                  onChange={e => setDirectUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="input-direct-url"
                />
                <button
                  onClick={handleSendDirect}
                  disabled={directSending || !directBody.trim()}
                  className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  data-testid="button-send-direct"
                >
                  <Send size={14} />
                  {directSending ? "Enviando..." : `Enviar para ${targetUserName}`}
                </button>
                {directResult && (
                  <p className="text-xs text-center text-muted-foreground animate-in fade-in duration-200">{directResult}</p>
                )}
              </div>
            )}
          </div>

          <PushNotificationPanel />
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-foreground">Uso do App</h2>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => downloadCsv(`/api/admin/export/analytics.csv?days=${analyticsDays}`, `analytics_${analyticsDays}d_${new Date().toISOString().slice(0,10)}.csv`)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-medium mr-1"
                data-testid="btn-export-analytics"
              >
                <Download size={12} />
                CSV
              </button>
              {([1, 7, 30, 90] as const).map(d => (
                <button
                  key={d}
                  data-testid={`btn-analytics-${d}d`}
                  onClick={() => { setAnalyticsDays(d); setAppliedStart(""); setAppliedEnd(""); setCustomStart(""); setCustomEnd(""); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${!isCustomRange && analyticsDays === d ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
                >
                  {d === 1 ? "Hoje" : `${d}d`}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Período personalizado</p>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customStart}
                max={customEnd || todayStr}
                onChange={e => setCustomStart(e.target.value)}
                data-testid="input-analytics-start"
                className="flex-1 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground"
              />
              <span className="text-xs text-muted-foreground shrink-0">até</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={todayStr}
                onChange={e => setCustomEnd(e.target.value)}
                data-testid="input-analytics-end"
                className="flex-1 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground"
              />
              <button
                onClick={() => { if (customStart && customEnd) { setAppliedStart(customStart); setAppliedEnd(customEnd); } }}
                disabled={!customStart || !customEnd}
                data-testid="btn-analytics-apply"
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-40 shrink-0"
              >
                Aplicar
              </button>
            </div>
            {isCustomRange && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-primary font-medium">📅 {appliedStart.slice(5)} → {appliedEnd.slice(5)}</span>
                <button
                  onClick={() => { setAppliedStart(""); setAppliedEnd(""); setCustomStart(""); setCustomEnd(""); }}
                  className="text-[11px] text-muted-foreground underline"
                  data-testid="btn-analytics-clear"
                >limpar</button>
              </div>
            )}
          </div>

          <button
            onClick={() => setExcludeAdmins(v => !v)}
            data-testid="toggle-exclude-admins"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors w-full justify-between border ${
              excludeAdmins
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <span>Excluir admins dos dados</span>
            <span className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${excludeAdmins ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <span className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${excludeAdmins ? "translate-x-4" : "translate-x-0"}`} />
            </span>
          </button>

          {/* Hourly chart — only when "Hoje" is selected */}
          {!isCustomRange && analyticsDays === 1 && (() => {
            const totalToday = hourlyData.reduce((s, h) => s + h.count, 0);
            const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
            const peakHour = hourlyData.reduce((best, h) => h.count > best.count ? h : best, hourlyData[0] ?? { hour: 0, count: 0 });
            const nowBrt = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
            const currentHour = nowBrt.getHours();
            const fmt = (h: number) => `${String(h).padStart(2, "0")}h`;
            const labelHours = [0, 3, 6, 9, 12, 15, 18, 21];
            return (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Utilizadores ativos — hoje por hora</p>
                    {peakHour.count > 0 && (
                      <p className="text-[10px] text-primary font-medium mt-0.5">
                        Pico às {fmt(peakHour.hour)} · {peakHour.count} utilizador{peakHour.count !== 1 ? "es" : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{totalToday}</p>
                    <p className="text-[9px] text-muted-foreground">total hoje</p>
                  </div>
                </div>
                <div className="flex items-end gap-px h-24">
                  {hourlyData.map((h) => {
                    const pct = (h.count / maxCount) * 100;
                    const isPeak = h.count > 0 && h.count === peakHour.count;
                    const isCurrent = h.hour === currentHour;
                    const isFuture = h.hour > currentHour;
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center group relative" style={{ height: "100%", justifyContent: "flex-end" }}>
                        {h.count > 0 && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-foreground text-background text-[8px] px-1 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {fmt(h.hour)}: {h.count}
                          </div>
                        )}
                        <div
                          className={`w-full rounded-t-[2px] transition-colors ${
                            isPeak
                              ? "bg-primary ring-1 ring-primary/40"
                              : isCurrent
                              ? "bg-primary/70"
                              : isFuture || h.count === 0
                              ? "bg-muted/30"
                              : "bg-primary/45 hover:bg-primary/65"
                          }`}
                          style={{ height: `${h.count === 0 ? 2 : Math.max(pct, 6)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5 px-0">
                  {hourlyData.map((h) => (
                    <span key={h.hour} className={`flex-1 text-center ${labelHours.includes(h.hour) ? (h.hour === peakHour.hour && peakHour.count > 0 ? "text-primary font-bold" : "text-muted-foreground") : "opacity-0 select-none"}`} style={{ fontSize: "8px" }}>
                      {labelHours.includes(h.hour) ? fmt(h.hour) : "."}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Daily chart — all periods except "Hoje" */}
          {(isCustomRange || analyticsDays !== 1) && analyticsData?.dailyActive && analyticsData.dailyActive.length > 0 && (() => {
            const max = Math.max(...analyticsData.dailyActive.map(x => x.count), 1);
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
            const total = analyticsData.dailyActive.reduce((s, d) => s + d.count, 0);
            const todayCount = analyticsData.dailyActive.find(d => d.date === today)?.count ?? 0;
            return (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground">Utilizadores ativos por dia</p>
                  <div className="flex gap-3 text-right">
                    <div>
                      <p className="text-sm font-bold text-foreground">{todayCount}</p>
                      <p className="text-[9px] text-muted-foreground">hoje</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{total}</p>
                      <p className="text-[9px] text-muted-foreground">total {analyticsDays}d</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-px h-20">
                  {analyticsData.dailyActive.map((d, i) => {
                    const pct = (d.count / max) * 100;
                    const isToday = d.date === today;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative" style={{ height: "100%", justifyContent: "flex-end" }}>
                        {d.count > 0 && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-[8px] px-1 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {d.date.slice(5)}: {d.count}
                          </div>
                        )}
                        <div
                          className={`w-full rounded-sm transition-colors ${isToday ? "bg-primary" : d.count === 0 ? "bg-muted/40" : "bg-primary/60 hover:bg-primary/80"}`}
                          style={{ height: `${d.count === 0 ? 2 : Math.max(pct, 6)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5">
                  <span>{analyticsData.dailyActive[0]?.date.slice(5)}</span>
                  <span className="text-primary font-medium">hoje</span>
                  <span>{analyticsData.dailyActive[analyticsData.dailyActive.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            );
          })()}

          {/* Hourly pattern — all periods */}
          {patterns?.hourlyPattern && (() => {
            const hp = patterns.hourlyPattern;
            const maxHp = Math.max(...hp.map(h => h.count), 1);
            const peakHp = hp.reduce((best, h) => h.count > best.count ? h : best, hp[0] ?? { hour: 0, count: 0 });
            const fmt = (h: number) => `${String(h).padStart(2, "0")}h`;
            const labelHours = [0, 3, 6, 9, 12, 15, 18, 21];
            const totalEvents = hp.reduce((s, h) => s + h.count, 0);
            return (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Horário de uso — padrão do período</p>
                    {peakHp.count > 0 && (
                      <p className="text-[10px] text-primary font-medium mt-0.5">
                        Pico às {fmt(peakHp.hour)} · {peakHp.count.toLocaleString()} eventos
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{totalEvents.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">eventos totais</p>
                  </div>
                </div>
                <div className="flex items-end gap-px h-20">
                  {hp.map(h => {
                    const pct = (h.count / maxHp) * 100;
                    const isPeak = h.count > 0 && h.count === peakHp.count;
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center group relative" style={{ height: "100%", justifyContent: "flex-end" }}>
                        {h.count > 0 && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-[8px] px-1 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {fmt(h.hour)}: {h.count}
                          </div>
                        )}
                        <div
                          className={`w-full rounded-t-[2px] ${isPeak ? "bg-primary" : h.count === 0 ? "bg-muted/30" : "bg-primary/50 hover:bg-primary/70"}`}
                          style={{ height: `${h.count === 0 ? 2 : Math.max(pct, 5)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5 px-0">
                  {hp.map(h => (
                    <span key={h.hour} className={`flex-1 text-center ${labelHours.includes(h.hour) ? (h.hour === peakHp.hour && peakHp.count > 0 ? "text-primary font-bold" : "text-muted-foreground") : "opacity-0 select-none"}`} style={{ fontSize: "8px" }}>
                      {labelHours.includes(h.hour) ? fmt(h.hour) : "."}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Weekday pattern */}
          {patterns?.weekdayPattern && (() => {
            const wp = patterns.weekdayPattern;
            const maxWp = Math.max(...wp.map(d => d.count), 1);
            const peakWp = wp.reduce((best, d) => d.count > best.count ? d : best, wp[0] ?? { weekday: 0, name: "", count: 0 });
            return (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground">Dias da semana mais ativos</p>
                  {peakWp.count > 0 && (
                    <p className="text-[10px] text-primary font-medium">{peakWp.name} é o mais ativo</p>
                  )}
                </div>
                <div className="flex items-end gap-1.5 h-16">
                  {wp.map(d => {
                    const pct = (d.count / maxWp) * 100;
                    const isPeak = d.count > 0 && d.count === peakWp.count;
                    return (
                      <div key={d.weekday} className="flex-1 flex flex-col items-center gap-1 group relative" style={{ height: "100%", justifyContent: "flex-end" }}>
                        {d.count > 0 && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-[8px] px-1 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {d.count.toLocaleString()}
                          </div>
                        )}
                        <div
                          className={`w-full rounded-t-sm ${isPeak ? "bg-primary" : d.count === 0 ? "bg-muted/30" : "bg-primary/50 hover:bg-primary/70"}`}
                          style={{ height: `${d.count === 0 ? 4 : Math.max(pct, 8)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  {wp.map(d => (
                    <span key={d.weekday} className={`flex-1 text-center text-[9px] ${d.count === peakWp.count && d.count > 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Funcionalidades mais usadas</p>
            {!analyticsData || analyticsData.eventCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Ainda sem dados suficientes</p>
            ) : (
              <div className="space-y-2">
                {analyticsData.eventCounts.map((item, i) => {
                  const max = analyticsData.eventCounts[0]?.count || 1;
                  const pct = (item.count / max) * 100;
                  const label = item.event.replace("page:", "📱 ").replace("journal:", "📝 ").replace("journey:", "🗺️ ").replace("card:", "🃏 ").replace("mood:", "😊 ");
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground capitalize">{label}</span>
                        <span className="text-xs font-semibold text-foreground">{item.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {analyticsData?.dailyActive.reduce((sum, d) => sum + d.count, 0) || 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">sessões únicas</p>
              <p className="text-[9px] text-muted-foreground">{isCustomRange ? `${appliedStart.slice(5)} → ${appliedEnd.slice(5)}` : analyticsDays === 1 ? "hoje" : `últimos ${analyticsDays}d`}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {analyticsData?.eventCounts.reduce((sum, e) => sum + e.count, 0) || 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">ações totais</p>
              <p className="text-[9px] text-muted-foreground">{isCustomRange ? `${appliedStart.slice(5)} → ${appliedEnd.slice(5)}` : analyticsDays === 1 ? "hoje" : `últimos ${analyticsDays}d`}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Usuários mais frequentes</p>
              {topUsers.length > 10 && (
                <button
                  onClick={() => setShowAllTopUsers(v => !v)}
                  className="text-[10px] text-primary font-medium"
                  data-testid="btn-toggle-top-users"
                >
                  {showAllTopUsers ? "ver menos" : `ver todos (${topUsers.length})`}
                </button>
              )}
            </div>
            {topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Ainda sem dados suficientes</p>
            ) : (() => {
              const displayed = showAllTopUsers ? topUsers : topUsers.slice(0, 10);
              const maxCount = topUsers[0]?.count || 1;
              return (
                <div className="space-y-2">
                  {displayed.map((u, i) => {
                    const barPct = (u.count / maxCount) * 100;
                    return (
                      <div key={u.userId} data-testid={`top-user-${i}`}>
                        <div className="flex items-center gap-2.5 mb-0.5">
                          <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{displayEmail(u.email)}</p>
                          </div>
                          <span className="text-xs font-bold text-primary shrink-0">{u.count}</span>
                        </div>
                        <div className="ml-11 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/50 rounded-full" style={{ width: `${barPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Perfil do Público</h3>
              {demographics && (
                <span className="text-[10px] text-muted-foreground">
                  {demographics.withAge}/{demographics.total} responderam
                </span>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Distribuição de idades</p>
              {!demographics || demographics.withAge === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Ainda sem dados</p>
              ) : (
                <div className="space-y-1.5">
                  {demographics.ageRanges.map((item) => {
                    const max = Math.max(...demographics.ageRanges.map(r => r.count));
                    const pct = max > 0 ? (item.count / max) * 100 : 0;
                    return (
                      <div key={item.range} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-10 shrink-0">{item.range}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-foreground w-5 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {patterns?.ageGroupActivity && (() => {
              const aga = patterns.ageGroupActivity.filter(a => a.eventCount > 0);
              if (aga.length === 0) return null;
              const maxEvents = Math.max(...aga.map(a => a.eventCount), 1);
              const topAge = aga.reduce((best, a) => a.eventCount > best.eventCount ? a : best, aga[0]);
              return (
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground">Atividade por faixa etária</p>
                    {topAge && <p className="text-[10px] text-primary font-medium">{topAge.range} é a mais ativa</p>}
                  </div>
                  <div className="space-y-1.5">
                    {patterns.ageGroupActivity.map(a => {
                      const pct = maxEvents > 0 ? (a.eventCount / maxEvents) * 100 : 0;
                      const isTop = a.range === topAge?.range;
                      return (
                        <div key={a.range} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-10 shrink-0">{a.range}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isTop ? "bg-primary" : "bg-primary/50"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-right w-16 shrink-0">
                            <span className="text-[10px] font-semibold text-foreground">{a.eventCount.toLocaleString()}</span>
                            <span className="text-[9px] text-muted-foreground ml-1">ev · {a.userCount}u</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">ev = eventos · u = usuários únicos no período</p>
                </div>
              );
            })()}

            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Principais interesses</p>
              {!demographics || demographics.topInterests.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Ainda sem dados</p>
              ) : (
                <div className="space-y-2">
                  {demographics.topInterests.slice(0, 6).map((item) => {
                    const max = demographics.topInterests[0]?.count || 1;
                    const pct = (item.count / max) * 100;
                    const emojis: Record<string, string> = {
                      "autoconhecimento": "🧠", "saude-mental": "💙", "relacoes": "❤️",
                      "carreira": "💼", "proposito": "✨", "criatividade": "🎨",
                      "familia": "👨‍👩‍👦", "amizades": "🤝", "financas": "💰", "espiritualidade": "🌟"
                    };
                    return (
                      <div key={item.interest} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground capitalize flex items-center gap-1">
                            <span>{emojis[item.interest] || "•"}</span>
                            {item.interest.replace(/-/g, " ")}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{item.count}</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "coupons" && <CouponsPanel />}

      {activeTab === "livro" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Capítulos do Livro</h2>
            <button
              onClick={() => { setBookEditId(null); setBookForm({ order: (adminBookChapters.length || 0) + 1, title: "", tag: "", excerpt: "", content: "", isPreview: false, imageUrl: "" }); setBookFormOpen(true); }}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground flex items-center gap-1 font-medium"
              data-testid="btn-new-chapter"
            >
              <Plus size={12} />
              Novo Capítulo
            </button>
          </div>

          {bookFormOpen && (
            <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-semibold text-foreground">{bookEditId ? "Editar Capítulo" : "Novo Capítulo"}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ordem</label>
                  <input type="number" value={bookForm.order} onChange={e => setBookForm(f => ({ ...f, order: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60" data-testid="input-chapter-order" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Referência Bíblica</label>
                  <input type="text" value={bookForm.tag} onChange={e => setBookForm(f => ({ ...f, tag: e.target.value }))} placeholder="ex: Salmos 90, 12" className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60" data-testid="input-chapter-tag" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Título do Capítulo</label>
                <input type="text" value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} placeholder="APRENDA A VIVER UM DIA DE CADA VEZ" className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60" data-testid="input-chapter-title" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Versículo (texto citado)</label>
                <input type="text" value={bookForm.excerpt} onChange={e => setBookForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="ex: Ensinai-nos a contar os nossos dias..." className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60" data-testid="input-chapter-excerpt" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Imagem do capítulo (opcional)</label>
                <div className="mt-1 space-y-2">
                  {bookForm.imageUrl ? (
                    <div className="relative">
                      <img src={bookForm.imageUrl} alt="Imagem do capítulo" className="w-full max-h-48 object-cover rounded-lg border border-border" />
                      <button
                        type="button"
                        onClick={() => setBookForm(f => ({ ...f, imageUrl: "" }))}
                        className="absolute top-2 right-2 p-1 bg-background/90 rounded-full border border-border shadow-sm"
                        data-testid="btn-remove-chapter-image"
                      >
                        <X size={13} className="text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover-elevate" data-testid="btn-upload-chapter-image">
                      <ImageIcon size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">Clicar para fazer upload de imagem</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setBookForm(f => ({ ...f, imageUrl: ev.target?.result as string ?? "" }));
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }} />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Conteúdo completo</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{bookForm.content.length} car. · {processContentEditor(bookForm.content).length} parág.</span>
                    <div className="flex rounded-md overflow-hidden border border-border text-[10px] font-medium">
                      <button
                        type="button"
                        onClick={() => setBookPreview(false)}
                        className={`px-2 py-1 transition-colors ${!bookPreview ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookPreview(true)}
                        className={`px-2 py-1 transition-colors ${bookPreview ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      >
                        Pré-visualizar
                      </button>
                    </div>
                  </div>
                </div>

                {!bookPreview && (
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-muted-foreground">
                      <code className="bg-muted px-1 rounded">Enter Enter</code> = parágrafo &nbsp;·&nbsp;
                      <code className="bg-muted px-1 rounded">*i*</code> <em>itálico</em> &nbsp;·&nbsp;
                      <code className="bg-muted px-1 rounded">**n**</code> <strong>negrito</strong> &nbsp;·&nbsp;
                      <code className="bg-muted px-1 rounded">- item</code> lista
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); applyFormat("**"); }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-muted hover:bg-muted-foreground/20 text-foreground font-bold text-xs"
                        title="Negrito (**texto**)"
                      >
                        <Bold size={13} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); applyFormat("*"); }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-muted hover:bg-muted-foreground/20 text-foreground text-xs"
                        title="Itálico (*texto*)"
                      >
                        <Italic size={13} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); applyBullet(); }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-muted hover:bg-muted-foreground/20 text-foreground text-xs"
                        title="Lista (- item)"
                      >
                        <List size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {bookPreview ? (
                  <div
                    className="w-full border border-border rounded-lg bg-[#fafaf8] dark:bg-[#111111] overflow-y-auto"
                    style={{ minHeight: 400, maxHeight: 640, padding: "24px 20px", color: "inherit" }}
                  >
                    {/* Date badge + verse box */}
                    <div className="flex items-start gap-3 mb-5">
                      {(() => {
                        const { day, month } = chapterDateAdmin(bookForm.order);
                        return (
                          <div className="flex flex-col items-center shrink-0">
                            <div className="rounded-lg px-3 py-1.5 bg-green-800 dark:bg-green-600">
                              <span className="font-black text-2xl leading-none text-white">{day}</span>
                            </div>
                            <span className="text-[11px] font-black mt-1 text-green-800 dark:text-green-500">{month}</span>
                          </div>
                        );
                      })()}
                      {(bookForm.excerpt || bookForm.tag) && (
                        <div className="flex-1 rounded-xl px-3 py-3 border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                          {bookForm.excerpt && (
                            <p className="font-serif text-[13px] italic text-stone-700 dark:text-stone-300 leading-relaxed">"{bookForm.excerpt}"</p>
                          )}
                          {bookForm.tag && (
                            <p className="text-[11px] font-bold mt-2 text-right text-green-800 dark:text-green-500">{bookForm.tag}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Title with decorative lines */}
                    {bookForm.title && (
                      <div className="text-center py-3 mb-4 border-t-2 border-b-2 border-green-800 dark:border-green-600">
                        <h2 className="font-serif font-black text-stone-800 dark:text-stone-100 uppercase leading-tight text-[16px]" style={{ letterSpacing: "0.04em" }}>
                          {bookForm.title}
                        </h2>
                      </div>
                    )}

                    {/* Content sections */}
                    {(() => {
                      const paras = processContentEditor(bookForm.content);
                      const { body, dica, oracao } = parseAdminSections(paras);
                      if (paras.length === 0) return (
                        <p className="text-sm text-stone-400 italic text-center py-8">Nenhum conteúdo para exibir.</p>
                      );
                      return (
                        <>
                          {body.map((para, i) => {
                            const mb = i < body.length - 1 ? "0.85em" : "0";
                            if (para.trimStart().startsWith("- ")) {
                              const items = para.split("\n").map(l => l.trim()).filter(l => l.startsWith("- ")).map(l => l.slice(2));
                              return (
                                <ul key={i} className="font-serif text-stone-800 dark:text-stone-100"
                                  style={{ fontSize: "16px", lineHeight: "1.72", paddingLeft: "1.4em", marginBottom: mb, listStyleType: "disc" }}>
                                  {items.map((item, j) => <li key={j}>{renderInlineMarkdown(item, `p${i}li${j}`)}</li>)}
                                </ul>
                              );
                            }
                            return (
                              <p key={i} className="font-serif text-stone-800 dark:text-stone-100"
                                style={{ fontSize: "16px", lineHeight: "1.72", textAlign: "justify", hyphens: "auto", marginBottom: mb, textIndent: i === 0 ? "0" : "1.6em" }}>
                                {renderInlineMarkdown(para, `p${i}`)}
                              </p>
                            );
                          })}

                          {dica && (
                            <div className="mt-5 rounded-xl p-4 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-800 dark:bg-green-700 flex items-center justify-center shrink-0 mt-0.5">
                                  <Lightbulb size={14} color="#fff" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-green-800 dark:text-green-400">Dica do Dia</p>
                                  {dica.instruction && <p className="font-serif text-[13px] text-stone-700 dark:text-stone-300 leading-snug mb-1">{dica.instruction}</p>}
                                  {dica.quote && <p className="font-serif text-[14px] font-bold text-stone-800 dark:text-stone-100 italic">"{dica.quote}"</p>}
                                </div>
                              </div>
                            </div>
                          )}

                          {oracao.length > 0 && (
                            <div className="mt-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                                <span className="font-serif font-black text-[12px] uppercase tracking-[0.18em] text-stone-800 dark:text-stone-100">Momento de Oração</span>
                                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                              </div>
                              {oracao.map((p, i) => (
                                <p key={i} className="font-serif text-stone-700 dark:text-stone-300"
                                  style={{ fontSize: "15px", lineHeight: "1.75", marginBottom: i < oracao.length - 1 ? "0.75em" : "0" }}>
                                  {renderInlineMarkdown(p, `o${i}`)}
                                </p>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <textarea
                    ref={bookTextareaRef}
                    value={bookForm.content}
                    onChange={e => setBookForm(f => ({ ...f, content: e.target.value }))}
                    rows={20}
                    placeholder="Colar o texto completo do capítulo aqui..."
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 resize-y font-mono"
                    style={{ minHeight: 400 }}
                    data-testid="input-chapter-content"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBookForm(f => ({ ...f, isPreview: !f.isPreview }))}
                  className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${bookForm.isPreview ? "bg-primary" : "bg-muted-foreground/30"}`}
                  data-testid="toggle-chapter-preview"
                >
                  <span className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${bookForm.isPreview ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <span className="text-xs text-muted-foreground">Pré-visualização gratuita</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!bookForm.title.trim()) return;
                    const url = bookEditId ? `/api/admin/book/chapters/${bookEditId}` : "/api/admin/book/chapters";
                    const method = bookEditId ? "PATCH" : "POST";
                    await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bookForm) });
                    setBookFormOpen(false);
                    setBookEditId(null);
                    refetchBookChapters();
                  }}
                  disabled={!bookForm.title.trim() || !bookForm.content.trim()}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50"
                  data-testid="btn-save-chapter"
                >
                  {bookEditId ? "Guardar" : "Criar"}
                </button>
                <button onClick={() => { setBookFormOpen(false); setBookEditId(null); }} className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {adminBookChapters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ainda sem capítulos. Adiciona o primeiro.</p>
            ) : (
              adminBookChapters.map(ch => (
                <div key={ch.id} className={`bg-card border rounded-xl overflow-hidden ${ch.content.length < 50 ? "border-red-500/40" : "border-border"}`} data-testid={`admin-chapter-${ch.id}`}>
                  <div className="flex items-center gap-3 p-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{ch.order}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${ch.content.length < 50 ? "text-red-500" : "text-foreground"}`}>{ch.title}</p>
                      {ch.tag && <p className="text-[10px] text-primary">{ch.tag}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/book/chapters/${ch.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPreview: !ch.isPreview }) });
                          refetchBookChapters();
                          queryClient.invalidateQueries({ queryKey: ["/api/book/chapters"] });
                        }}
                        className={`text-[9px] px-2 py-1 rounded-full font-semibold border transition-colors ${ch.isPreview ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" : "bg-muted text-muted-foreground border-border hover:bg-muted/70"}`}
                        data-testid={`btn-toggle-preview-${ch.id}`}
                        title={ch.isPreview ? "Clica para bloquear" : "Clica para libertar"}
                      >
                        {ch.isPreview ? "Grátis" : "Bloqueado"}
                      </button>
                      <span className="text-[10px] text-muted-foreground">{ch.content.length}c</span>
                      <button
                        onClick={() => { setBookEditId(ch.id); setBookForm({ order: ch.order, title: ch.title, tag: ch.tag || "", excerpt: ch.excerpt || "", content: processContent(ch.content).join("\n\n"), isPreview: ch.isPreview, imageUrl: (ch as any).imageUrl || "" }); setBookPreview(false); setBookFormOpen(true); setBookExpandedId(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="p-1.5 rounded-lg bg-primary/5 hover:bg-primary/15 transition-colors"
                        data-testid={`btn-edit-chapter-${ch.id}`}
                        title="Editar"
                      >
                        <Pencil size={12} className="text-primary" />
                      </button>
                      <button
                        onClick={() => setBookExpandedId(bookExpandedId === ch.id ? null : ch.id)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        {bookExpandedId === ch.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  {bookExpandedId === ch.id && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                      {ch.excerpt && <p className="text-xs italic text-muted-foreground">"{ch.excerpt}"</p>}
                      {ch.content.length < 50 ? (
                        <p className="text-xs text-red-500 font-medium">⚠ Conteúdo vazio — clica no lápis para editar.</p>
                      ) : (
                        <p className="text-xs text-foreground/70 line-clamp-3 whitespace-pre-wrap">{ch.content}</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={async () => {
                            if (!confirm("Apagar este capítulo?")) return;
                            await fetch(`/api/admin/book/chapters/${ch.id}`, { method: "DELETE", credentials: "include" });
                            refetchBookChapters();
                          }}
                          className="flex items-center gap-1 text-xs text-red-500 font-medium px-2 py-1 rounded-lg bg-red-500/10"
                          data-testid={`btn-delete-chapter-${ch.id}`}
                        >
                          <Trash2 size={11} />
                          Apagar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Compradores</h3>
              <button
                onClick={() => downloadCsv("/api/admin/export/book-purchases.csv", `compras_livro_${new Date().toISOString().slice(0,10)}.csv`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium"
                data-testid="btn-export-book-purchases"
              >
                <Download size={13} />
                Exportar CSV
              </button>
            </div>
            {bookPurchases.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Ainda sem compras registadas.</p>
            ) : (
              <div className="space-y-2">
                {bookPurchases.map((p, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`book-purchase-${i}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{displayEmail(p.email)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-primary">R${(p.amountCents / 100).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "biblioteca" && libPageEditorBook && (
        <div className="space-y-3">
          {/* Hidden PDF input */}
          <input
            ref={libPagePdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleLibPagePdfUpload}
            data-testid="input-lib-page-pdf"
          />

          {/* Header */}
          <div className="flex items-center gap-3 pb-1">
            <button
              onClick={() => { setLibPageEditorBook(null); setLibPageEdits({}); setLibPageSaving({}); setLibPageExpanded(null); }}
              className="p-1.5 rounded-lg border border-border"
              data-testid="btn-back-lib-pages"
            >
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Páginas do PDF</h2>
              <p className="text-xs text-muted-foreground truncate">{libPageEditorBook.title}</p>
            </div>
            <button
              onClick={() => libPagePdfInputRef.current?.click()}
              disabled={libPagePdfUploading}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
              data-testid="btn-upload-lib-pdf"
            >
              {libPagePdfUploading
                ? <><RefreshCw size={11} className="animate-spin" /> A processar...</>
                : <><Download size={11} /> {libEditorPages.length > 0 ? "Substituir PDF" : "Carregar PDF"}</>
              }
            </button>
          </div>

          {/* Loading */}
          {libEditorLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {!libEditorLoading && libEditorPages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <FileText size={28} className="text-muted-foreground opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Sem páginas extraídas</p>
                <p className="text-xs text-muted-foreground">Carrega um ficheiro PDF para extrair e editar as páginas.</p>
              </div>
              <button
                onClick={() => libPagePdfInputRef.current?.click()}
                disabled={libPagePdfUploading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                data-testid="btn-upload-lib-pdf-empty"
              >
                {libPagePdfUploading
                  ? <><RefreshCw size={14} className="animate-spin" /> A processar PDF...</>
                  : <><Download size={14} /> Carregar PDF</>
                }
              </button>
            </div>
          )}

          {/* Pages list */}
          {!libEditorLoading && libEditorPages.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {libEditorPages.map((page) => {
                const editedContent = libPageEdits[page.pageNumber] ?? page.content;
                const editedTitle = libPageTitleEdits[page.pageNumber] ?? (page.title ?? "");
                const editedSubtitle = libPageSubtitleEdits[page.pageNumber] ?? (page.subtitle ?? "");
                const editedTag = libPageTagEdits[page.pageNumber] ?? (page.tag ?? "");
                const editedOrder = libPageOrderEdits[page.pageNumber] ?? page.pageNumber;
                const isDirty = editedContent !== page.content
                  || editedTitle !== (page.title ?? "")
                  || editedSubtitle !== (page.subtitle ?? "")
                  || editedTag !== (page.tag ?? "")
                  || editedOrder !== page.pageNumber;
                const isSaving = libPageSaving[page.pageNumber] ?? false;
                const isExpanded = libPageExpanded === page.pageNumber;
                const charCount = editedContent.length;
                const paraCount = editedContent.split(/\n\n+/).filter((p: string) => p.trim()).length || 1;
                const preview = editedContent.replace(/\n/g, " ").slice(0, 60).trim();

                return (
                  <div key={page.pageNumber}
                    className={`border-b border-border last:border-0 ${isExpanded ? "bg-background" : ""}`}
                    data-testid={`card-lib-page-${page.pageNumber}`}>

                    {/* Row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Page number */}
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-muted-foreground">{page.pageNumber}</span>
                      </div>

                      {/* Title + preview */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setLibPageExpanded(isExpanded ? null : page.pageNumber)}>
                        {editedTitle ? (
                          <>
                            <p className="text-sm font-semibold text-foreground truncate leading-snug">{editedTitle}</p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{preview || "Sem conteúdo"}</p>
                          </>
                        ) : (
                          <p className="text-sm text-foreground truncate leading-snug">
                            {preview || <span className="text-muted-foreground italic">Página vazia</span>}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{charCount}c</span>
                          {isDirty && <span className="text-[10px] text-amber-500 font-medium">● não guardado</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isDirty && (
                          <button
                            onClick={() => saveLibPage(libPageEditorBook.id, page.pageNumber, editedContent, editedTitle, editedSubtitle, editedTag, editedOrder !== page.pageNumber ? editedOrder : undefined)}
                            disabled={isSaving}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-1 font-medium"
                            data-testid={`btn-save-lib-page-${page.pageNumber}`}
                          >
                            {isSaving ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                            {isSaving ? "..." : "Guardar"}
                          </button>
                        )}
                        {libPageConfirmDelete === page.pageNumber ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteLibPage(libPageEditorBook.id, page.pageNumber)}
                              disabled={libPageDeleting[page.pageNumber]}
                              className="text-[10px] px-2 py-1 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50 flex items-center gap-1"
                              data-testid={`btn-confirm-delete-lib-page-${page.pageNumber}`}
                            >
                              {libPageDeleting[page.pageNumber] ? <RefreshCw size={10} className="animate-spin" /> : <Trash2 size={10} />}
                              Apagar
                            </button>
                            <button
                              onClick={() => setLibPageConfirmDelete(null)}
                              className="p-1.5 rounded-lg border border-border"
                              data-testid={`btn-cancel-delete-lib-page-${page.pageNumber}`}
                            >
                              <X size={12} className="text-muted-foreground" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setLibPageConfirmDelete(page.pageNumber)}
                            className="p-1.5 rounded-lg border border-border"
                            title="Apagar página"
                            data-testid={`btn-delete-lib-page-${page.pageNumber}`}
                          >
                            <Trash2 size={13} className="text-red-400" />
                          </button>
                        )}
                        <button
                          onClick={() => setLibPageExpanded(isExpanded ? null : page.pageNumber)}
                          className="p-1.5 rounded-lg border border-border"
                          title={isExpanded ? "Fechar" : "Editar"}
                          data-testid={`btn-edit-lib-page-${page.pageNumber}`}
                        >
                          {isExpanded
                            ? <ChevronUp size={14} className="text-muted-foreground" />
                            : <Pencil size={13} className="text-muted-foreground" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 mt-1">
                        {/* Ordem + Referência (grid 2 cols, igual ao devocional) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ordem</label>
                            <input
                              type="number"
                              value={editedOrder}
                              onChange={e => setLibPageOrderEdits(s => ({ ...s, [page.pageNumber]: Number(e.target.value) }))}
                              className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                              data-testid={`input-lib-page-order-${page.pageNumber}`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Referência Bíblica</label>
                            <input
                              type="text"
                              value={editedTag}
                              onChange={e => setLibPageTagEdits(s => ({ ...s, [page.pageNumber]: e.target.value }))}
                              placeholder="ex: Salmos 90, 12"
                              className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                              data-testid={`input-lib-page-tag-${page.pageNumber}`}
                            />
                          </div>
                        </div>

                        {/* Título */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Título da página</label>
                          <input
                            type="text"
                            value={editedTitle}
                            onChange={e => setLibPageTitleEdits(s => ({ ...s, [page.pageNumber]: e.target.value }))}
                            placeholder="Ex: APRENDA A VIVER UM DIA DE CADA VEZ"
                            className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                            data-testid={`input-lib-page-title-${page.pageNumber}`}
                          />
                        </div>

                        {/* Subtítulo / Versículo */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Versículo (texto citado)</label>
                          <input
                            type="text"
                            value={editedSubtitle}
                            onChange={e => setLibPageSubtitleEdits(s => ({ ...s, [page.pageNumber]: e.target.value }))}
                            placeholder="ex: Ensinai-nos a contar os nossos dias..."
                            className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                            data-testid={`input-lib-page-subtitle-${page.pageNumber}`}
                          />
                        </div>

                        {/* Row 1: Conteúdo label + char count + edit/preview tabs */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium shrink-0">Conteúdo</label>
                            <span className="text-[10px] text-muted-foreground">{charCount} car. · {paraCount} parág.</span>
                          </div>
                          <div className="flex rounded-md overflow-hidden border border-border text-[10px] font-medium shrink-0">
                            <button
                              type="button"
                              onClick={() => setLibPagePreview(null)}
                              className={`px-2 py-1 transition-colors ${libPagePreview !== page.pageNumber ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setLibPagePreview(page.pageNumber)}
                              className={`px-2 py-1 transition-colors ${libPagePreview === page.pageNumber ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                            >
                              Pré-visualizar
                            </button>
                          </div>
                        </div>

                        {/* Row 2: hints + format buttons (only in edit mode) */}
                        {libPagePreview !== page.pageNumber && (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              <code className="bg-muted px-1 rounded">Enter Enter</code> = parágrafo &nbsp;·&nbsp;
                              <code className="bg-muted px-1 rounded">*i*</code> <em>itálico</em> &nbsp;·&nbsp;
                              <code className="bg-muted px-1 rounded">**n**</code> <strong>negrito</strong> &nbsp;·&nbsp;
                              <code className="bg-muted px-1 rounded">- item</code> lista
                            </p>
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onMouseDown={e => { e.preventDefault(); applyFormatLibPage(page.pageNumber, "**"); }}
                                className="w-7 h-7 flex items-center justify-center rounded bg-muted hover:bg-muted-foreground/20 text-foreground font-bold text-xs"
                                title="Negrito (**texto**)"
                              >
                                <Bold size={13} />
                              </button>
                              <button
                                type="button"
                                onMouseDown={e => { e.preventDefault(); applyFormatLibPage(page.pageNumber, "*"); }}
                                className="w-7 h-7 flex items-center justify-center rounded bg-muted hover:bg-muted-foreground/20 text-foreground text-xs"
                                title="Itálico (*texto*)"
                              >
                                <Italic size={13} />
                              </button>
                              <button
                                type="button"
                                onMouseDown={e => { e.preventDefault(); applyBulletLibPage(page.pageNumber); }}
                                className="w-7 h-7 flex items-center justify-center rounded bg-muted hover:bg-muted-foreground/20 text-foreground text-xs"
                                title="Lista (- item)"
                              >
                                <List size={13} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Textarea (edit) or preview */}
                        {libPagePreview === page.pageNumber ? (
                          <div
                            className="w-full border border-border rounded-lg bg-[#fafaf8] dark:bg-[#111111] overflow-y-auto"
                            style={{ minHeight: 320, maxHeight: 560, padding: "20px 18px" }}
                          >
                            {(() => {
                              const paras = processContentEditor(editedContent);
                              const { body, dica, oracao } = parseAdminSections(paras);
                              if (paras.length === 0) return (
                                <p className="text-sm text-stone-400 italic text-center py-8">Nenhum conteúdo para pré-visualizar.</p>
                              );
                              return (
                                <>
                                  {body.map((para, i) => {
                                    const mb = i < body.length - 1 ? "0.85em" : "0";
                                    if (para.trimStart().startsWith("- ")) {
                                      const items = para.split("\n").map(l => l.trim()).filter(l => l.startsWith("- ")).map(l => l.slice(2));
                                      return (
                                        <ul key={i} className="font-serif text-stone-800 dark:text-stone-100"
                                          style={{ fontSize: "15px", lineHeight: "1.72", paddingLeft: "1.4em", marginBottom: mb, listStyleType: "disc" }}>
                                          {items.map((item, j) => <li key={j}>{renderInlineMarkdown(item, `lp${i}li${j}`)}</li>)}
                                        </ul>
                                      );
                                    }
                                    // Title detection: first para, short, no final punct, all caps or short
                                    const isFirst = i === 0;
                                    const isAllCaps = para === para.toUpperCase() && /[A-ZÁÉÍÓÚ]/.test(para);
                                    const isTitle = isFirst && para.length <= 80 && !/[.!?]$/.test(para.trim()) && (isAllCaps || para.length <= 50);
                                    if (isTitle) return (
                                      <div key={i} className="text-center py-2 mb-4 border-t-2 border-b-2 border-green-800 dark:border-green-600">
                                        <p className="font-serif font-black text-stone-800 dark:text-stone-100 uppercase leading-tight text-[14px]" style={{ letterSpacing: "0.04em" }}>{para}</p>
                                      </div>
                                    );
                                    return (
                                      <p key={i} className="font-serif text-stone-800 dark:text-stone-100"
                                        style={{ fontSize: "15px", lineHeight: "1.72", textAlign: "justify", hyphens: "auto", marginBottom: mb, textIndent: i === 0 ? "0" : "1.6em" }}>
                                        {renderInlineMarkdown(para, `lp${i}`)}
                                      </p>
                                    );
                                  })}
                                  {dica && (
                                    <div className="mt-4 rounded-xl p-3 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800">
                                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-800 dark:text-green-400 mb-1">Dica do Dia</p>
                                      {dica.instruction && <p className="font-serif text-[13px] text-stone-700 dark:text-stone-300 leading-snug mb-1">{dica.instruction}</p>}
                                      {dica.quote && <p className="font-serif text-[13px] font-bold text-stone-800 dark:text-stone-100 italic">"{dica.quote}"</p>}
                                    </div>
                                  )}
                                  {oracao.length > 0 && (
                                    <div className="mt-4 rounded-xl p-3 border border-border dark:border-stone-700">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="h-px flex-1 bg-green-800/20 dark:bg-green-600/20" />
                                        <span className="font-serif font-black text-[10px] uppercase tracking-[0.18em] text-stone-700 dark:text-stone-300">Momento de Oração</span>
                                        <div className="h-px flex-1 bg-green-800/20 dark:bg-green-600/20" />
                                      </div>
                                      {oracao.map((p, i) => (
                                        <p key={i} className="font-serif text-stone-800 dark:text-stone-100" style={{ fontSize: "14px", lineHeight: "1.75", marginBottom: i < oracao.length - 1 ? "0.5em" : 0 }}>
                                          {renderInlineMarkdown(p, `lo${i}`)}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <textarea
                            ref={el => { libPageTextareaRefs.current[page.pageNumber] = el; }}
                            value={editedContent}
                            onChange={e => setLibPageEdits(s => ({ ...s, [page.pageNumber]: e.target.value }))}
                            rows={12}
                            className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm text-foreground resize-y font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                            data-testid={`textarea-lib-page-${page.pageNumber}`}
                            placeholder="Conteúdo desta página..."
                            autoFocus
                          />
                        )}

                        {/* Row: action buttons */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => { setLibPageEdits(s => ({ ...s, [page.pageNumber]: page.content })); setLibPagePreview(null); }}
                            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                            disabled={!isDirty}
                          >
                            Repor original
                          </button>
                          <button
                            onClick={async () => { await saveLibPage(libPageEditorBook.id, page.pageNumber, editedContent, editedTitle, editedSubtitle, editedTag, editedOrder !== page.pageNumber ? editedOrder : undefined); setLibPageExpanded(null); setLibPagePreview(null); }}
                            disabled={!isDirty || isSaving}
                            className="text-[11px] px-4 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 flex items-center gap-1.5 font-medium"
                            data-testid={`btn-save-close-lib-page-${page.pageNumber}`}
                          >
                            {isSaving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                            {isSaving ? "A guardar..." : isDirty ? "Guardar e fechar" : "Sem alterações"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "biblioteca" && !libPageEditorBook && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Biblioteca de Livros</h2>
            <button
              onClick={() => { setLibEditId(null); setLibForm(emptyLibForm); setLibPdfName(""); setLibAccessType("free"); setLibPriceReais(""); setLibFormOpen(true); }}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground flex items-center gap-1 font-medium"
              data-testid="btn-new-lib-book"
            >
              <Plus size={12} />
              Novo Livro
            </button>
          </div>

          {libFormOpen && (
            <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-semibold text-foreground">{libEditId ? "Editar Livro" : "Novo Livro"}</p>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Título *</label>
                <input type="text" value={libForm.title} onChange={e => setLibForm(f => ({ ...f, title: e.target.value }))} placeholder="Nome do livro" className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60" data-testid="input-lib-title" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Autor</label>
                <input type="text" value={libForm.author} onChange={e => setLibForm(f => ({ ...f, author: e.target.value }))} placeholder="Nome do autor" className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60" data-testid="input-lib-author" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Descrição</label>
                <textarea value={libForm.description} onChange={e => setLibForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Breve descrição do livro..." className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 resize-none" data-testid="input-lib-description" />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">Acesso</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["free", "premium", "paid"] as const).map(type => {
                    const labels = { free: "Grátis", premium: "Só Premium", paid: "Pago" };
                    const isActive = libAccessType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLibAccessType(type)}
                        className={`py-2 rounded-lg text-xs font-medium border transition-colors ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}
                        data-testid={`btn-lib-access-${type}`}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>
                {libAccessType === "free" && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">Qualquer utilizador pode ler este livro completo.</p>
                )}
                {libAccessType === "premium" && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">Apenas membros Premium têm acesso completo.</p>
                )}
                {libAccessType === "paid" && (
                  <div className="mt-2">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Preço (R$)</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={libPriceReais}
                        onChange={e => setLibPriceReais(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm"
                        data-testid="input-lib-price-reais"
                      />
                    </div>
                  </div>
                )}
                {(libAccessType === "premium" || libAccessType === "paid") && (
                  <div className="mt-2 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Páginas gratuitas (prévia)
                    </label>
                    {libEditId === null ? (
                      <p className="text-[10px] text-muted-foreground">Guarda o livro primeiro e depois edita para selecionar as páginas gratuitas.</p>
                    ) : libEditPages.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">Este livro ainda não tem páginas carregadas.</p>
                    ) : (
                      <>
                        <p className="text-[10px] text-muted-foreground">
                          {libForm.freePageNumbers.length === 0
                            ? "Nenhuma página selecionada — todo o conteúdo requer acesso"
                            : `${libForm.freePageNumbers.length} página(s) gratuita(s) selecionada(s)`}
                        </p>
                        <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                          {libEditPages.map(pg => {
                            const isFree = libForm.freePageNumbers.includes(pg.pageNumber);
                            return (
                              <label
                                key={pg.pageNumber}
                                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover-elevate"
                                data-testid={`check-free-page-${pg.pageNumber}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isFree}
                                  onChange={() => {
                                    setLibForm(f => ({
                                      ...f,
                                      freePageNumbers: isFree
                                        ? f.freePageNumbers.filter(n => n !== pg.pageNumber)
                                        : [...f.freePageNumbers, pg.pageNumber].sort((a, b) => a - b),
                                    }));
                                  }}
                                  className="accent-primary"
                                />
                                <span className="text-xs text-muted-foreground w-8 flex-shrink-0">#{pg.pageNumber}</span>
                                <span className="text-xs text-foreground truncate">{pg.title || `Página ${pg.pageNumber}`}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLibForm(f => ({ ...f, freePageNumbers: libEditPages.map(p => p.pageNumber) }))}
                            className="text-[10px] text-primary underline"
                            data-testid="btn-select-all-free-pages"
                          >
                            Selecionar todas
                          </button>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <button
                            type="button"
                            onClick={() => setLibForm(f => ({ ...f, freePageNumbers: [] }))}
                            className="text-[10px] text-muted-foreground underline"
                            data-testid="btn-clear-free-pages"
                          >
                            Limpar seleção
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={libForm.isPublished} onChange={e => setLibForm(f => ({ ...f, isPublished: e.target.checked }))} data-testid="check-lib-published" />
                  <span className="text-xs text-foreground">Publicar (visível para utilizadores)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Capa (imagem)</label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover-elevate">
                    <ImageIcon size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{libForm.coverImageData ? "Capa carregada" : "Selecionar imagem"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleLibFileUpload(e, "coverImageData")} data-testid="input-lib-cover" />
                  </label>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">PDF do livro</label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover-elevate">
                    <FileText size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">{libPdfName || (libEditId ? "Substituir PDF" : "Selecionar PDF")}</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={e => handleLibFileUpload(e, "pdfData")} data-testid="input-lib-pdf" />
                  </label>
                </div>
              </div>

              {libUploading && <p className="text-xs text-muted-foreground animate-pulse">A ler ficheiro...</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={submitLibForm}
                  disabled={!libForm.title || libUploading || createLibBookMutation.isPending || updateLibBookMutation.isPending}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="btn-save-lib-book"
                >
                  {(createLibBookMutation.isPending || updateLibBookMutation.isPending) && (
                    <RefreshCw size={12} className="animate-spin" />
                  )}
                  {libEditId ? "Guardar alterações" : "Criar livro"}
                </button>
                <button onClick={() => { setLibFormOpen(false); setLibEditId(null); setLibForm(emptyLibForm); setLibPdfName(""); setLibAccessType("free"); setLibPriceReais(""); }} className="px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground" data-testid="btn-cancel-lib-book">Cancelar</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {adminLibBooks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum livro na biblioteca ainda.</p>
            )}
            {adminLibBooks.map(book => (
              <div key={book.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" data-testid={`card-lib-book-${book.id}`}>
                {book.coverImageData ? (
                  <img src={`data:image/jpeg;base64,${book.coverImageData}`} alt={book.title} className="w-10 h-14 object-cover rounded-md shrink-0" />
                ) : (
                  <div className="w-10 h-14 bg-muted rounded-md flex items-center justify-center shrink-0">
                    <Library size={16} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
                  {book.author && <p className="text-xs text-muted-foreground truncate">{book.author}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap gap-y-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{book.priceDisplay}</span>
                    {book.requiresPremium && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Premium</span>}
                    {book.requiresPremium && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {(book.freePages ?? 0) === 0 ? "Sem prévia" : `${book.freePages} cap. grátis`}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${book.isPublished ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>{book.isPublished ? "Publicado" : "Rascunho"}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => updateLibBookMutation.mutate({ id: book.id, data: { isPublished: !book.isPublished } })}
                    className="p-1.5 rounded-lg border border-border"
                    title={book.isPublished ? "Despublicar" : "Publicar"}
                    data-testid={`btn-toggle-lib-${book.id}`}
                  >
                    {book.isPublished ? <EyeOff size={13} className="text-muted-foreground" /> : <Eye size={13} className="text-muted-foreground" />}
                  </button>
                  <button
                    onClick={() => openLibEdit(book)}
                    className="p-1.5 rounded-lg border border-border"
                    title="Editar"
                    data-testid={`btn-edit-lib-${book.id}`}
                  >
                    <Pencil size={13} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { setLibPageEditorBook(book); setLibPageEdits({}); setLibPageSaving({}); }}
                    className="p-1.5 rounded-lg border border-border"
                    title="Editar Páginas"
                    data-testid={`btn-edit-pages-lib-${book.id}`}
                  >
                    <FileText size={13} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { if (confirm("Apagar este livro?")) deleteLibBookMutation.mutate(book.id); }}
                    className="p-1.5 rounded-lg border border-border"
                    title="Apagar"
                    data-testid={`btn-delete-lib-${book.id}`}
                  >
                    <Trash2 size={13} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ScheduledNotif {
  id: number;
  title: string;
  body: string;
  url: string;
  intervalHours: number;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

interface AutoNotif {
  id: number;
  type: string;
  title: string;
  body: string;
  url: string;
  isActive: boolean;
  triggerHours: number;
  totalSent?: number;
  lastSentAt?: string | null;
}

const AUTO_TYPE_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  morning_prompt: { label: "Devocional da Manhã", description: "De manhã (7h-11h), convida a abrir o devocional do dia", icon: "☀️" },
  evening_reflection: { label: "Reflexão da Noite", description: "À noite, convida a escrever no diário se ainda não escreveu hoje", icon: "🌙" },
  daily_reflection: { label: "Lembrete Diário", description: "Enviado quando o utilizador não escreveu no diário hoje", icon: "📝" },
  mood_checkin: { label: "Registo Diário", description: "Enviado quando o utilizador não fez o registo de hoje", icon: "🌟" },
  streak_risk: { label: "Ausência no Diário", description: "Enviado após 2+ dias sem escrever no diário", icon: "🔥" },
  streak_celebration: { label: "Celebração de Encontros", description: "Enviado a cada 7 reflexões no mês", icon: "🎉" },
  journey_nudge: { label: "Lembrete do Devocional", description: "Enviado após 3-7 dias sem fazer check-in", icon: "📖" },
  reengagement: { label: "Reengajamento", description: "Enviado após 5+ dias completamente inativo", icon: "💛" },
  daily_motivation: { label: "Reflexão do Dia", description: "Envia a frase motivacional do dia como notificação push", icon: "✨" },
  daily_reminder: { label: "Lembrete Espiritual", description: "Enviado de manhã (7h-10h) com um versículo ou reflexão personalizada", icon: "🕊️" },
  journey_start: { label: "Convite à Comunidade", description: "Convida o utilizador a participar na Comunidade (10h-20h)", icon: "🤝" },
};

const INTERVAL_OPTIONS = [
  { value: 6, label: "A cada 6 horas" },
  { value: 12, label: "A cada 12 horas" },
  { value: 24, label: "Diária (24h)" },
  { value: 48, label: "A cada 2 dias" },
  { value: 72, label: "A cada 3 dias" },
  { value: 168, label: "Semanal" },
];

function RecoveryNotificationCard() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const { data: abandoned, isLoading } = useQuery<{ total: number; users: { id: string; name: string; email: string; hasPush: boolean }[] }>({
    queryKey: ["/api/admin/abandoned-checkouts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/abandoned-checkouts", { credentials: "include" });
      if (!res.ok) return { total: 0, users: [] };
      return res.json();
    },
  });

  const withPush = abandoned?.users.filter(u => u.hasPush) ?? [];
  const withoutPush = abandoned?.users.filter(u => !u.hasPush) ?? [];
  const willReceive = withPush.filter(u => !excludedIds.has(u.id));

  const toggleExclude = (id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/send-recovery-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ excludeUserIds: Array.from(excludedIds) }),
      });
      const data = await res.json();
      setResult(`Enviado para ${data.sent} dispositivo(s). ${data.skipped > 0 ? `${data.skipped} ignorado(s).` : ""}`);
    } catch {
      setResult("Erro ao enviar.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-foreground" />
        <h2 className="text-sm font-medium text-foreground">Recuperação de Checkout</h2>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Utilizadores que iniciaram o registo do cartão mas não completaram. Desmarca quem não deve receber a notificação.
        </p>
        {isLoading ? (
          <p className="text-[11px] text-muted-foreground">A verificar Stripe...</p>
        ) : (
          <div className="space-y-2">
            {abandoned && abandoned.users.length > 0 ? (
              <div className="space-y-1">
                {abandoned.users.map(u => {
                  const isExcluded = excludedIds.has(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => u.hasPush && toggleExclude(u.id)}
                      data-testid={`recovery-user-${u.id}`}
                      className={`flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-md transition-colors ${u.hasPush ? "cursor-pointer hover-elevate" : "opacity-50 cursor-default"} bg-muted/50`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${u.hasPush && !isExcluded ? "bg-primary border-primary" : "border-border bg-transparent"}`}>
                        {u.hasPush && !isExcluded && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 ${isExcluded ? "line-through text-muted-foreground" : "text-foreground"}`}>{u.name}</span>
                      <span className="text-muted-foreground text-[10px] truncate max-w-[120px]">{displayEmail(u.email)}</span>
                      <span className={u.hasPush ? "text-green-500 text-[10px]" : "text-muted-foreground text-[10px]"}>
                        {u.hasPush ? "push ativo" : "sem push"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Nenhum checkout abandonado encontrado.</p>
            )}
            {withoutPush.length > 0 && (
              <p className="text-[10px] text-muted-foreground">{withoutPush.length} utilizador(es) sem push — não receberão notificação.</p>
            )}
            {excludedIds.size > 0 && (
              <p className="text-[10px] text-orange-500">{excludedIds.size} excluído(s) manualmente.</p>
            )}
          </div>
        )}
        {result && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{result}</p>
        )}
        <button
          onClick={handleSend}
          disabled={sending || isLoading || willReceive.length === 0}
          className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
          data-testid="button-send-recovery"
        >
          {sending ? "Enviando..." : `Enviar Notificação${willReceive.length > 0 ? ` (${willReceive.length})` : ""}`}
        </button>
      </div>
    </div>
  );
}

function BookRecoveryNotificationCard() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [customTitle, setCustomTitle] = useState("O devocional 365 Encontros com Deus Pai espera por ti");
  const [customBody, setCustomBody] = useState("Adquire o livro e leva a tua relação mais longe. Acede agora.");
  const [customUrl, setCustomUrl] = useState("/livro");
  const [showCustomize, setShowCustomize] = useState(false);

  const { data: bookData, isLoading } = useQuery<{ total: number; users: { id: string; name: string; email: string; hasPush: boolean }[] }>({
    queryKey: ["/api/admin/book-no-access-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/book-no-access-users", { credentials: "include" });
      if (!res.ok) return { total: 0, users: [] };
      return res.json();
    },
  });

  const withPush = bookData?.users.filter(u => u.hasPush) ?? [];
  const withoutPush = bookData?.users.filter(u => !u.hasPush) ?? [];
  const willReceive = withPush.filter(u => !excludedIds.has(u.id));

  const toggleExclude = (id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/send-book-recovery-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ excludeUserIds: Array.from(excludedIds), title: customTitle, body: customBody, url: customUrl }),
      });
      const data = await res.json();
      setResult(`Enviado para ${data.sent} dispositivo(s). ${data.skipped > 0 ? `${data.skipped} ignorado(s).` : ""}`);
    } catch {
      setResult("Erro ao enviar.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-foreground" />
        <h2 className="text-sm font-medium text-foreground">Recuperação de Carrinho — Livro</h2>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Utilizadores que iniciaram o checkout do livro mas não completaram o pagamento. Desmarca quem não deve receber.
        </p>

        <button
          onClick={() => setShowCustomize(!showCustomize)}
          className="text-[11px] text-muted-foreground underline underline-offset-2"
          data-testid="button-customize-book-recovery"
        >
          {showCustomize ? "Ocultar mensagem" : "Personalizar mensagem"}
        </button>

        {showCustomize && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Título</label>
              <input
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 bg-background border border-border rounded-lg text-[11px]"
                data-testid="input-book-recovery-title"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Mensagem</label>
              <textarea
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 bg-background border border-border rounded-lg text-[11px] resize-none min-h-12"
                data-testid="input-book-recovery-body"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Link</label>
              <input
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 bg-background border border-border rounded-lg text-[11px]"
                data-testid="input-book-recovery-url"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-[11px] text-muted-foreground">A verificar utilizadores...</p>
        ) : (
          <div className="space-y-2">
            {bookData && bookData.users.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {bookData.users.map(u => {
                  const isExcluded = excludedIds.has(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => u.hasPush && toggleExclude(u.id)}
                      data-testid={`book-recovery-user-${u.id}`}
                      className={`flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-md transition-colors ${u.hasPush ? "cursor-pointer hover-elevate" : "opacity-50 cursor-default"} bg-muted/50`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${u.hasPush && !isExcluded ? "bg-primary border-primary" : "border-border bg-transparent"}`}>
                        {u.hasPush && !isExcluded && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 truncate ${isExcluded ? "line-through text-muted-foreground" : "text-foreground"}`}>{u.name}</span>
                      <span className="text-muted-foreground text-[10px] truncate max-w-[100px]">{displayEmail(u.email)}</span>
                      <span className={u.hasPush ? "text-green-500 text-[10px] shrink-0" : "text-muted-foreground text-[10px] shrink-0"}>
                        {u.hasPush ? "push ativo" : "sem push"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Todos os utilizadores já têm acesso ao livro.</p>
            )}
            {withoutPush.length > 0 && (
              <p className="text-[10px] text-muted-foreground">{withoutPush.length} utilizador(es) sem push — não receberão notificação.</p>
            )}
            {excludedIds.size > 0 && (
              <p className="text-[10px] text-orange-500">{excludedIds.size} excluído(s) manualmente.</p>
            )}
          </div>
        )}
        {result && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{result}</p>
        )}
        <button
          onClick={handleSend}
          disabled={sending || isLoading || willReceive.length === 0}
          className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
          data-testid="button-send-book-recovery"
        >
          {sending ? "Enviando..." : `Enviar Notificação${willReceive.length > 0 ? ` (${willReceive.length})` : ""}`}
        </button>
      </div>
    </div>
  );
}

function ReconcileTrialBonusCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ fixed: number; alreadyOk: number; users: { name: string; email: string; days: number }[] } | null>(null);

  const handleReconcile = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/reconcile-trial-bonus", { method: "POST", credentials: "include" });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-foreground" />
        <h2 className="text-sm font-medium text-foreground">Corrigir Dias em Falta</h2>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Procura no Stripe todos os utilizadores que adicionaram cartão mas não receberam os dias gratuitos. Corrige automaticamente.
        </p>
        {result && (
          <div className="space-y-2">
            {result.fixed === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum utilizador em falta — todos estão correctos ({result.alreadyOk} já tinham o bónus).</p>
            ) : (
              <>
                <p className="text-[11px] text-green-500 font-medium">{result.fixed} utilizador(es) corrigido(s):</p>
                <div className="space-y-1">
                  {result.users.map((u, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-muted/50">
                      <span className="text-foreground">{u.name}</span>
                      <span className="text-green-500">+{u.days} dias</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <button
          onClick={handleReconcile}
          disabled={running}
          className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
          data-testid="button-reconcile-trial"
        >
          {running ? "A verificar Stripe..." : "Verificar e Corrigir"}
        </button>
      </div>
    </div>
  );
}

function PushNotificationPanel() {
  const [pushTitle, setPushTitle] = useState("365 Encontros com Deus Pai");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("365 Encontros com Deus Pai");
  const [newBody, setNewBody] = useState("");
  const [newUrl, setNewUrl] = useState("/");
  const [newInterval, setNewInterval] = useState(24);
  const [showNewForm, setShowNewForm] = useState(false);

  interface PushCampaignData {
    id: number;
    title: string;
    body: string;
    url: string;
    sentCount: number;
    failedCount: number;
    clickedCount: number;
    createdAt: string;
  }

  const { data: campaigns = [], refetch: refetchCampaigns } = useQuery<PushCampaignData[]>({
    queryKey: ["/api/admin/push-campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/admin/push-campaigns", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: scheduled = [], refetch: refetchScheduled } = useQuery<ScheduledNotif[]>({
    queryKey: ["/api/notifications/scheduled"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/scheduled", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleSendNow = async () => {
    if (!pushBody.trim()) return;
    setPushSending(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: pushTitle, body: pushBody, url: pushUrl }),
      });
      const data = await res.json();
      setPushResult(`Enviado para ${data.sent} dispositivo(s). ${data.failed > 0 ? `${data.failed} falhou.` : ""}`);
      setPushBody("");
      refetchCampaigns();
    } catch {
      setPushResult("Erro ao enviar.");
    } finally {
      setPushSending(false);
    }
  };

  const handleCreateScheduled = async () => {
    if (!newBody.trim()) return;
    try {
      await fetch("/api/notifications/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle, body: newBody, url: newUrl, intervalHours: newInterval }),
      });
      setNewBody("");
      setNewTitle("365 Encontros com Deus Pai");
      setNewUrl("/");
      setNewInterval(24);
      setShowNewForm(false);
      refetchScheduled();
    } catch {}
  };

  const handleToggleActive = async (notif: ScheduledNotif) => {
    await fetch(`/api/notifications/scheduled/${notif.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !notif.isActive }),
    });
    refetchScheduled();
  };

  const handleDeleteScheduled = async (id: number) => {
    await fetch(`/api/notifications/scheduled/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    refetchScheduled();
  };

  return (
    <div className="space-y-6">
      <AutoNotificationsPanel />

      <RecoveryNotificationCard />

      <BookRecoveryNotificationCard />

      <ReconcileTrialBonusCard />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Send size={16} className="text-foreground" />
          <h2 className="text-sm font-medium text-foreground">Enviar Agora</h2>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Título</label>
            <input
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
              placeholder="365 Encontros com Deus Pai"
              data-testid="input-push-title"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Mensagem</label>
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 resize-none min-h-16"
              placeholder="Hora de fazer seu check-in!"
              data-testid="input-push-body"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Link</label>
            <input
              value={pushUrl}
              onChange={(e) => setPushUrl(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
              placeholder="/"
              data-testid="input-push-url"
            />
          </div>
          {pushResult && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{pushResult}</p>
          )}
          <button
            onClick={handleSendNow}
            disabled={pushSending || !pushBody.trim()}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
            data-testid="button-send-push"
          >
            {pushSending ? "Enviando..." : "Enviar para Todos"}
          </button>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-foreground" />
            <h2 className="text-sm font-medium text-foreground">Histórico de Envios</h2>
          </div>
          <div className="space-y-2">
            {campaigns.map((c) => {
              const clickRate = c.sentCount > 0 ? Math.round((c.clickedCount / c.sentCount) * 100) : 0;
              return (
                <div key={c.id} className="bg-card border border-border rounded-xl p-3 space-y-2" data-testid={`campaign-${c.id}`}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.body}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {new Date(c.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Send size={10} className="text-green-500" />
                      <span className="text-foreground font-medium">{c.sentCount}</span>
                      <span className="text-muted-foreground">enviados</span>
                    </div>
                    {c.failedCount > 0 && (
                      <div className="flex items-center gap-1">
                        <XCircle size={10} className="text-red-500" />
                        <span className="text-foreground font-medium">{c.failedCount}</span>
                        <span className="text-muted-foreground">falharam</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-blue-500" />
                      <span className="text-foreground font-medium">{c.clickedCount}</span>
                      <span className="text-muted-foreground">cliques ({clickRate}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-foreground" />
            <h2 className="text-sm font-medium text-foreground">Notificações Recorrentes</h2>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground flex items-center gap-1 font-medium"
            data-testid="button-new-scheduled"
          >
            <Plus size={12} />
            Nova
          </button>
        </div>

        {showNewForm && (
          <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Título</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                placeholder="365 Encontros com Deus Pai"
                data-testid="input-sched-title"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Mensagem</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 resize-none min-h-16"
                placeholder="Ex: Que tal refletir um pouco hoje?"
                data-testid="input-sched-body"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Link</label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                placeholder="/"
                data-testid="input-sched-url"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Frequência</label>
              <select
                value={newInterval}
                onChange={(e) => setNewInterval(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                data-testid="select-sched-interval"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateScheduled}
                disabled={!newBody.trim()}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
                data-testid="button-save-scheduled"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {scheduled.length === 0 && !showNewForm ? (
          <div className="py-8 text-center">
            <Bell size={28} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação recorrente configurada.</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">Crie lembretes automáticos para seus usuários.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduled.map((notif) => {
              const intervalLabel = INTERVAL_OPTIONS.find((o) => o.value === notif.intervalHours)?.label || `A cada ${notif.intervalHours}h`;
              const lastSent = notif.lastSentAt ? new Date(notif.lastSentAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Nunca";

              return (
                <div
                  key={notif.id}
                  className={`border rounded-xl p-3 space-y-2 transition-colors ${
                    notif.isActive ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
                  }`}
                  data-testid={`scheduled-notif-${notif.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{notif.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(notif)}
                      className="shrink-0 mt-0.5"
                      data-testid={`button-toggle-notif-${notif.id}`}
                    >
                      {notif.isActive ? (
                        <ToggleRight size={24} className="text-primary" />
                      ) : (
                        <ToggleLeft size={24} className="text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                    <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap min-w-0">
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock size={10} /> {intervalLabel}
                      </span>
                      <span className="shrink-0">Último: {lastSent}</span>
                      {notif.url !== "/" && (
                        <span className="text-primary truncate max-w-[80px]">{notif.url}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteScheduled(notif.id)}
                      className="text-red-400 hover:text-red-500 transition-colors shrink-0"
                      data-testid={`button-delete-notif-${notif.id}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AutoNotificationsPanel() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const { data: autoNotifs = [], refetch } = useQuery<AutoNotif[]>({
    queryKey: ["/api/notifications/auto"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/auto", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleToggle = async (notif: AutoNotif) => {
    await fetch(`/api/notifications/auto/${notif.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !notif.isActive }),
    });
    refetch();
  };

  const handleSaveEdit = async (notif: AutoNotif) => {
    await fetch(`/api/notifications/auto/${notif.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: editTitle, body: editBody }),
    });
    setEditingId(null);
    refetch();
  };

  const startEdit = (notif: AutoNotif) => {
    setEditingId(notif.id);
    setEditTitle(notif.title);
    setEditBody(notif.body);
  };

  if (autoNotifs.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-foreground" />
          <h2 className="text-sm font-medium text-foreground">Notificações Inteligentes</h2>
        </div>
        <div className="py-6 text-center bg-card border border-border rounded-xl">
          <Bell size={28} className="text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">A carregar notificações automáticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-foreground" />
        <h2 className="text-sm font-medium text-foreground">Notificações Inteligentes</h2>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Enviadas automaticamente com base no comportamento de cada utilizador.
      </p>

      <div className="space-y-2">
        {autoNotifs.map((notif) => {
          const meta = AUTO_TYPE_LABELS[notif.type] || { label: notif.type, description: "", icon: "🔔" };
          const isEditing = editingId === notif.id;
          const lastSent = notif.lastSentAt
            ? new Date(notif.lastSentAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
            : "Nunca";

          return (
            <div
              key={notif.id}
              className={`border rounded-xl p-3 space-y-2 transition-colors ${
                notif.isActive ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
              }`}
              data-testid={`auto-notif-${notif.type}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta.icon}</span>
                    <p className="text-sm font-medium text-foreground">{meta.label}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{meta.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(notif)}
                  className="shrink-0 mt-0.5"
                  data-testid={`button-toggle-auto-${notif.type}`}
                >
                  {notif.isActive ? (
                    <ToggleRight size={24} className="text-primary" />
                  ) : (
                    <ToggleLeft size={24} className="text-muted-foreground" />
                  )}
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-2 pt-1">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    placeholder="Título"
                    data-testid={`input-auto-title-${notif.type}`}
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs resize-none min-h-12"
                    placeholder="Mensagem"
                    data-testid={`input-auto-body-${notif.type}`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(notif)}
                      className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
                      data-testid={`button-save-auto-${notif.type}`}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => startEdit(notif)}
                  className="bg-muted/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <p className="text-[11px] font-medium text-muted-foreground">{notif.title}</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">{notif.body}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap min-w-0">
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock size={10} /> {notif.triggerHours}h mín.
                  </span>
                  <span className="shrink-0">Último: {lastSent}</span>
                </div>
                <span className="bg-muted/50 px-2 py-0.5 rounded-full font-medium shrink-0">
                  {notif.totalSent || 0} env.
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

function CouponsPanel() {
  const queryClient = useQueryClient();
  const [couponForm, setCouponForm] = useState({ code: "", type: "premium_days", value: "30", maxUses: "", expiresAt: "", note: "" });
  const [couponFormOpen, setCouponFormOpen] = useState(false);

  const { data: coupons = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/coupons"],
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/coupons", data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      setCouponForm({ code: "", type: "premium_days", value: "30", maxUses: "", expiresAt: "", note: "" });
      setCouponFormOpen(false);
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/coupons/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] }),
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/coupons/${id}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Ticket size={16} />
          Cupões de desconto
        </h3>
        <button
          onClick={() => setCouponFormOpen(!couponFormOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-foreground text-background text-[13px] font-medium"
          data-testid="btn-create-coupon"
        >
          <Plus size={14} />
          Criar cupão
        </button>
      </div>

      {couponFormOpen && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h4 className="text-sm font-semibold">Novo cupão</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] text-muted-foreground mb-1 block">Código</label>
              <input
                value={couponForm.code}
                onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="ex: AMIGOS20"
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm font-mono"
                data-testid="input-coupon-code"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Tipo</label>
              <select
                value={couponForm.type}
                onChange={e => setCouponForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm"
                data-testid="select-coupon-type"
              >
                <option value="premium_days">Dias de premium</option>
                <option value="full_premium">Premium completo</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">
                {couponForm.type === "premium_days" ? "Nº de dias" : "Valor (ignorado)"}
              </label>
              <input
                type="number"
                value={couponForm.value}
                onChange={e => setCouponForm(f => ({ ...f, value: e.target.value }))}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm"
                data-testid="input-coupon-value"
                min="1"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Máx. utilizações (vazio = ilimitado)</label>
              <input
                type="number"
                value={couponForm.maxUses}
                onChange={e => setCouponForm(f => ({ ...f, maxUses: e.target.value }))}
                placeholder="Ilimitado"
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm"
                data-testid="input-coupon-max-uses"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Expira em (vazio = nunca)</label>
              <input
                type="date"
                value={couponForm.expiresAt}
                onChange={e => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm"
                data-testid="input-coupon-expires"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-muted-foreground mb-1 block">Nota interna (opcional)</label>
              <input
                value={couponForm.note}
                onChange={e => setCouponForm(f => ({ ...f, note: e.target.value }))}
                placeholder="ex: Campanha de verão"
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm"
                data-testid="input-coupon-note"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCouponFormOpen(false)}
              className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground"
            >
              Cancelar
            </button>
            <button
              onClick={() => createCouponMutation.mutate({
                code: couponForm.code,
                type: couponForm.type,
                value: Number(couponForm.value),
                maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null,
                expiresAt: couponForm.expiresAt || null,
                note: couponForm.note || null,
              })}
              disabled={!couponForm.code || !couponForm.value || createCouponMutation.isPending}
              className="flex-1 py-2 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50"
              data-testid="btn-save-coupon"
            >
              {createCouponMutation.isPending ? "A criar..." : "Criar cupão"}
            </button>
          </div>
        </div>
      )}

      {coupons.length === 0 ? (
        <div className="py-12 text-center">
          <Ticket size={32} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum cupão criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c: any) => (
            <div key={c.id} className="bg-card rounded-2xl border border-border p-4 space-y-2" data-testid={`coupon-card-${c.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-foreground tracking-wider">{c.code}</span>
                    <button
                      onClick={() => navigator.clipboard?.writeText(c.code)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Copiar código"
                    >
                      <Copy size={12} />
                    </button>
                    {c.isActive ? (
                      <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">Ativo</span>
                    ) : (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Inativo</span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {c.type === "premium_days" ? `${c.value} dias de premium` : "Premium completo"}
                    {" · "}
                    {c.usedCount} uso{c.usedCount !== 1 ? "s" : ""}
                    {c.maxUses !== null ? ` / ${c.maxUses}` : " (ilimitado)"}
                  </p>
                  {c.note && <p className="text-[11px] text-muted-foreground/70 italic">{c.note}</p>}
                  {c.expiresAt && (
                    <p className="text-[11px] text-muted-foreground">
                      Expira: {new Date(c.expiresAt).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleCouponMutation.mutate({ id: c.id, isActive: !c.isActive })}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`toggle-coupon-${c.id}`}
                  >
                    {c.isActive ? <ToggleRight size={24} className="text-primary" /> : <ToggleLeft size={24} />}
                  </button>
                  <button
                    onClick={() => { if (confirm("Apagar cupão?")) deleteCouponMutation.mutate(c.id); }}
                    className="text-red-400 hover:text-red-500 transition-colors"
                    data-testid={`delete-coupon-${c.id}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "precos" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Preço do Livro Devocional</h2>
            </div>
            {settingsLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Valor (em reais, ex: 19.90)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full border border-border rounded-md pl-9 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder={(parseInt(adminSettings.book_price_cents ?? "1990", 10) / 100).toFixed(2)}
                      value={bookPriceInput}
                      onChange={e => setBookPriceInput(e.target.value)}
                      data-testid="input-book-price"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Atual: R$ {(parseInt(adminSettings.book_price_cents ?? "1990", 10) / 100).toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const cents = Math.round(parseFloat(bookPriceInput) * 100);
                    if (!cents || isNaN(cents) || cents < 0) {
                      toast({ title: "Valor inválido", variant: "destructive" });
                      return;
                    }
                    updateSettingsMutation.mutate({ book_price_cents: String(cents) });
                    setBookPriceInput("");
                  }}
                  disabled={updateSettingsMutation.isPending || !bookPriceInput}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
                  data-testid="button-save-book-price"
                >
                  <Check size={14} />
                  Guardar
                </button>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Planos de Assinatura (Stripe)</h2>
              </div>
              <button
                onClick={() => setShowNewPlanForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium"
                data-testid="button-toggle-new-plan"
              >
                {showNewPlanForm ? <X size={12} /> : <Plus size={12} />}
                {showNewPlanForm ? "Cancelar" : "Novo Plano"}
              </button>
            </div>

            {showNewPlanForm && (
              <div className="p-3 rounded-lg border border-border space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Criar novo plano no Stripe</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Nome do Plano *</label>
                    <input
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="ex: Premium Mensal"
                      value={newPlanForm.name}
                      onChange={e => setNewPlanForm(p => ({ ...p, name: e.target.value }))}
                      data-testid="input-plan-name"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Descrição</label>
                    <input
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="ex: Acesso completo à plataforma"
                      value={newPlanForm.description}
                      onChange={e => setNewPlanForm(p => ({ ...p, description: e.target.value }))}
                      data-testid="input-plan-description"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Valor (R$) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full border border-border rounded-md pl-9 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="19.90"
                        value={newPlanForm.amount}
                        onChange={e => setNewPlanForm(p => ({ ...p, amount: e.target.value }))}
                        data-testid="input-plan-amount"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Período *</label>
                    <select
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={newPlanForm.interval}
                      onChange={e => setNewPlanForm(p => ({ ...p, interval: e.target.value as "month" | "year" }))}
                      data-testid="select-plan-interval"
                    >
                      <option value="month">Mensal</option>
                      <option value="year">Anual</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => createPlanMutation.mutate(newPlanForm)}
                  disabled={createPlanMutation.isPending || !newPlanForm.name || !newPlanForm.amount}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
                  data-testid="button-create-plan"
                >
                  {createPlanMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  Criar Plano no Stripe
                </button>
              </div>
            )}

            {plansLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : stripePlans.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum plano ativo no Stripe. Configura o Stripe para ver os planos.
              </p>
            ) : (
              <div className="space-y-2">
                {stripePlans.map(plan => (
                  <div key={plan.price_id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border" data-testid={`plan-row-${plan.price_id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{plan.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {((plan.unit_amount ?? 0) / 100).toFixed(2).replace(".", ",")}
                        {plan.recurring ? ` / ${plan.recurring.interval === "month" ? "mês" : "ano"}` : ""}
                        {plan.product_description ? ` · ${plan.product_description}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono truncate">{plan.price_id}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Arquivar o plano "${plan.product_name}"? Utilizadores existentes não serão afetados.`)) {
                          archivePlanMutation.mutate(plan.price_id);
                        }
                      }}
                      disabled={archivePlanMutation.isPending}
                      className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                      title="Arquivar plano"
                      data-testid={`button-archive-plan-${plan.price_id}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Comunidades — Acesso Premium</h2>
            </div>
            <p className="text-xs text-muted-foreground">Canais marcados como premium só são acessíveis por utilizadores com assinatura ativa.</p>
            {channelsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : channelsList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum canal encontrado.</p>
            ) : (
              <div className="space-y-2">
                {channelsList.map(ch => (
                  <div key={ch.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border" data-testid={`channel-row-${ch.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{ch.emoji}</span>
                        <p className="text-sm font-medium truncate">{ch.name}</p>
                        {ch.isPremium && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">Premium</span>
                        )}
                      </div>
                      {ch.description && <p className="text-xs text-muted-foreground truncate ml-6">{ch.description}</p>}
                    </div>
                    <button
                      onClick={() => updateChannelPremiumMutation.mutate({ id: ch.id, isPremium: !ch.isPremium })}
                      disabled={updateChannelPremiumMutation.isPending}
                      className="flex-shrink-0"
                      title={ch.isPremium ? "Remover acesso premium" : "Tornar premium"}
                      data-testid={`toggle-channel-premium-${ch.id}`}
                    >
                      {ch.isPremium
                        ? <ToggleRight size={24} className="text-primary" />
                        : <ToggleLeft size={24} className="text-muted-foreground" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
