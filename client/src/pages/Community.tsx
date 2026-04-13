import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { setNavHidden } from "@/lib/navVisibility";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import PremiumPaywall from "@/components/PremiumPaywall";
import {
  Hash, Lock, Mic, Send, Plus, Users, MessageCircle, X,
  Play, Pause, Square, Image as ImageIcon, Radio,
  Crown, Trash2, UserPlus, UserCheck, Wifi, PhoneOff,
  ChevronRight, ChevronDown, AlertCircle, ArrowLeft, Pencil, Check, Settings, CornerUpLeft,
  PanelLeftClose, PanelLeftOpen, Ban
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LiveComment = {
  id: string; userId: string; userName: string;
  userPhoto: string | null; text: string;
};

type ChatChannel = {
  id: number; name: string; description: string | null;
  emoji: string | null; isPrivate: boolean; isPremium: boolean; createdBy: string | null; createdAt: string;
};
type ChatMessage = {
  id: number; channelId: number; userId: string; text: string | null;
  imageData: string | null; audioData: string | null; type: string;
  replyToId: number | null; replyToText: string | null; replyToAuthor: string | null;
  deleted: boolean; createdAt: string; authorName: string; authorPhoto: string | null;
};
type DmConversation = {
  id: number; user1Id: string; user2Id: string;
  lastMessageAt: string | null; createdAt: string;
  otherUser: { id: string; name: string; profilePhoto: string | null };
};
type DmMessage = {
  id: number; conversationId: number; senderId: string; text: string | null;
  imageData: string | null; audioData: string | null; type: string;
  replyToId: number | null; replyToText: string | null; replyToAuthor: string | null;
  deleted: boolean; createdAt: string; senderName: string; senderPhoto: string | null;
};
type LiveSession = {
  id: number; hostId: string; channelId: number | null; title: string; status: string;
  viewerCount: number; startedAt: string; hostName: string; hostPhoto: string | null; channelName: string | null;
};
type Member = { id: string; name: string; profilePhoto: string | null; role: string; };
type ChannelAdmin = { id: number; channelId: number; userId: string; addedBy: string | null; createdAt: string; name: string | null; profilePhoto: string | null; };

type ActiveView =
  | { type: "channel"; channelId: number; channelName: string }
  | { type: "dm"; conversationId: number; otherUserId: string; otherUserName: string }
  | { type: "members" };

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ audioData }: { audioData: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioData);
    audioRef.current = audio;
    audio.onended = () => { setPlaying(false); setProgress(0); };
    audio.ontimeupdate = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    return () => { audio.pause(); };
  }, [audioData]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 min-w-[180px] max-w-xs">
      <Button size="icon" variant="ghost" onClick={toggle} data-testid="button-audio-play">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <Mic className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

// ─── Audio Recorder ───────────────────────────────────────────────────────────

function AudioRecorder({ onAudio, onCancel }: { onAudio: (data: string) => void; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream);
      mediaRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }).catch(() => { setError("Permissão de microfone negada"); });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const stop = () => {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const togglePlay = () => {
    if (!preview) return;
    if (!audioRef.current) {
      const a = new Audio(preview);
      a.onended = () => setPlaying(false);
      audioRef.current = a;
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  if (error) return (
    <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-md text-sm text-destructive">
      <AlertCircle className="w-4 h-4" /> {error}
      <Button size="icon" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
    </div>
  );

  /* ── Preview: ouvir antes de enviar ── */
  if (preview) return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 rounded-md border border-border">
      <Button size="icon" variant="ghost" onClick={togglePlay} data-testid="button-preview-play">
        {playing
          ? <Square className="w-4 h-4 text-primary" />
          : <Play className="w-4 h-4 text-primary" />}
      </Button>
      <span className="text-xs text-muted-foreground flex-1">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </span>
      <Button size="icon" variant="ghost" onClick={onCancel} data-testid="button-cancel-audio-preview" title="Descartar">
        <X className="w-4 h-4 text-muted-foreground" />
      </Button>
      <Button size="icon" onClick={() => onAudio(preview)} data-testid="button-send-audio-preview" title="Enviar">
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );

  /* ── A gravar ── */
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/40 rounded-md border border-red-200 dark:border-red-800">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
      <span className="text-sm text-red-600 dark:text-red-400 font-mono tabular-nums flex-1">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </span>
      <Button size="icon" variant="ghost" onClick={stop} data-testid="button-stop-recording" title="Parar">
        <Square className="w-4 h-4 text-red-600" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onCancel} data-testid="button-cancel-recording" title="Cancelar">
        <X className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

type ReplyTo = { id: number; text: string; displayName: string };

function MessageBubble({ msg, currentUserId, isAdmin, onDelete, onEdit, onReply, onScrollToReply, showHeader = true }: {
  msg: ChatMessage | DmMessage;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onReply?: (reply: ReplyTo) => void;
  onScrollToReply?: (id: number) => void;
  showHeader?: boolean;
}) {
  const uid = "userId" in msg ? msg.userId : msg.senderId;
  const authorName = ("authorName" in msg ? msg.authorName : msg.senderName) as string | null;
  const authorPhoto = ("authorPhoto" in msg ? msg.authorPhoto : msg.senderPhoto) as string | null;
  const replyToText = ("replyToText" in msg ? msg.replyToText : null) as string | null;
  const replyToAuthor = ("replyToAuthor" in msg ? msg.replyToAuthor : null) as string | null;
  const isOwn = uid === currentUserId;
  const canDelete = isOwn || isAdmin;
  const canEdit = isOwn && msg.type === "text";
  const isDeleted = msg.type === "deleted" || (msg as any).deleted === true;

  /* ── Long-press context menu ── */
  const [menuOpen, setMenuOpen] = useState(false);
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);

  const startLongPress = () => {
    touchMovedRef.current = false;
    longTimer.current = setTimeout(() => {
      if (!touchMovedRef.current && !isDeleted) setMenuOpen(true);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current = null; }
  };
  const onPointerMove = () => { touchMovedRef.current = true; cancelLongPress(); };

  /* ── Right-swipe to reply ── */
  const REPLY_THRESHOLD = 60;
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizRef = useRef<boolean | null>(null);
  const replyTriggeredRef = useRef(false);
  const [replyOffset, setReplyOffset] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizRef.current = null;
    replyTriggeredRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (isHorizRef.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isHorizRef.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!isHorizRef.current) return;
    if (dx > 0 && !isDeleted) {
      setReplyOffset(Math.min(80, dx));
      if (dx >= REPLY_THRESHOLD && !replyTriggeredRef.current) {
        replyTriggeredRef.current = true;
        onReply?.({ id: msg.id, text: msg.text || "", displayName: authorName || "?" });
      }
    }
  };

  const handleTouchEnd = () => setReplyOffset(0);

  return (
    <div
      className="relative"
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerMove={onPointerMove}
      onContextMenu={e => { e.preventDefault(); if (!isDeleted) setMenuOpen(true); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid={`message-${msg.id}`}
    >
      {/* Backdrop to close menu */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Reply swipe indicator */}
      <div
        className="absolute left-2 top-0 bottom-0 flex items-center pointer-events-none md:hidden"
        style={{ opacity: Math.min(1, replyOffset / REPLY_THRESHOLD), visibility: replyOffset > 0 ? "visible" : "hidden" }}
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <CornerUpLeft className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Message row */}
      <div
        className={`flex gap-1.5 pl-2 pr-3 ${showHeader ? "pt-2 pb-0.5" : "pt-0.5 pb-0.5"} ${isOwn ? "flex-row-reverse" : "flex-row"}`}
        style={{ transform: `translateX(${replyOffset}px)`, transition: "none" }}
      >
        {showHeader ? (
          <Avatar className="w-7 h-7 mt-0.5 flex-shrink-0 self-start">
            <AvatarImage src={authorPhoto ?? undefined} />
            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-semibold">
              {authorName?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7 flex-shrink-0" />
        )}
        <div className={`flex flex-col max-w-[80%] ${isOwn ? "items-end" : "items-start"}`}>
          {showHeader && (
            <div className={`flex items-baseline gap-1.5 mb-0.5 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
              <span className="font-semibold text-xs leading-none text-foreground/80">
                {isOwn ? "Tu" : authorName}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(msg.createdAt), "HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
          {isDeleted ? (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl ${isOwn ? "bg-primary/30" : "bg-muted/60"}`}>
              <Ban className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <p className="text-xs italic text-muted-foreground">Esta mensagem foi apagada</p>
            </div>
          ) : (
            <div className={`relative px-3 py-1.5 ${showHeader ? (isOwn ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm") : "rounded-2xl"} ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {replyToText && msg.replyToId && (
                <div
                  className={`mb-2 pl-2 border-l-2 rounded-sm cursor-pointer transition-opacity active:opacity-60 ${isOwn ? "border-primary-foreground/40" : "border-primary/40"}`}
                  onClick={e => { e.stopPropagation(); onScrollToReply?.(msg.replyToId!); }}
                >
                  <p className={`text-[10px] font-bold leading-tight ${isOwn ? "text-primary-foreground/70" : "text-primary"}`}>{replyToAuthor}</p>
                  <p className={`text-xs leading-tight line-clamp-2 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{replyToText}</p>
                </div>
              )}
              {msg.type === "text" && msg.text && (
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
              )}
              {msg.type === "image" && msg.imageData && (
                <img src={msg.imageData} alt="imagem" className="max-w-xs max-h-64 rounded-md object-cover" />
              )}
              {msg.type === "audio" && msg.audioData && (
                <AudioPlayer audioData={msg.audioData} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Long-press context menu */}
      {menuOpen && !isDeleted && (canEdit || canDelete || onReply) && (
        <div
          className={`absolute z-50 bottom-full mb-1 ${isOwn ? "right-10" : "left-10"} bg-popover border border-border rounded-xl shadow-md flex items-center gap-0.5 p-1`}
          onPointerDown={e => e.stopPropagation()}
        >
          {onReply && (
            <button
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg hover-elevate text-xs text-muted-foreground"
              onClick={() => { onReply({ id: msg.id, text: msg.text || "", displayName: authorName || "?" }); setMenuOpen(false); }}
              data-testid={`button-reply-menu-${msg.id}`}
            >
              <CornerUpLeft className="w-4 h-4" />
              <span>Responder</span>
            </button>
          )}
          {canEdit && (
            <button
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg hover-elevate text-xs text-muted-foreground"
              onClick={() => { onEdit(msg.id, msg.text || ""); setMenuOpen(false); }}
              data-testid={`button-edit-menu-${msg.id}`}
            >
              <Pencil className="w-4 h-4" />
              <span>Editar</span>
            </button>
          )}
          {canDelete && (
            <button
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg hover-elevate text-xs text-destructive"
              onClick={() => { onDelete(msg.id); setMenuOpen(false); }}
              data-testid={`button-delete-menu-${msg.id}`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Apagar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 mt-1">
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-[10px] text-muted-foreground/70 px-1.5">
        {format(new Date(date), "d 'de' MMMM", { locale: ptBR })}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Image Cropper ────────────────────────────────────────────────────────────

function ImageCropper({ src, onConfirm, onCancel }: {
  src: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const dragRef = useRef<{ type: string; sx: number; sy: number; sc: { x: number; y: number; w: number; h: number } } | null>(null);
  const MIN = 40;

  const initCrop = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setCrop({ x: 0, y: 0, w: r.width, h: r.height });
  }, []);

  const onImgLoad = () => { setImgLoaded(true); initCrop(); };

  const applyDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const { type, sx, sy, sc } = dragRef.current;
    const dx = clientX - sx, dy = clientY - sy;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    let { x, y, w, h } = sc;
    if (type === 'move') {
      x = clamp(sc.x + dx, 0, r.width - sc.w);
      y = clamp(sc.y + dy, 0, r.height - sc.h);
    } else if (type === 'br') {
      w = clamp(sc.w + dx, MIN, r.width - sc.x);
      h = clamp(sc.h + dy, MIN, r.height - sc.y);
    } else if (type === 'bl') {
      const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN);
      w = sc.w - (nx - sc.x); x = nx;
      h = clamp(sc.h + dy, MIN, r.height - sc.y);
    } else if (type === 'tr') {
      const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN);
      h = sc.h - (ny - sc.y); y = ny;
      w = clamp(sc.w + dx, MIN, r.width - sc.x);
    } else if (type === 'tl') {
      const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN);
      const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN);
      w = sc.w - (nx - sc.x); x = nx;
      h = sc.h - (ny - sc.y); y = ny;
    }
    setCrop({ x, y, w, h });
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => applyDrag(e.clientX, e.clientY);
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [applyDrag]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragRef.current = { type, sx: clientX, sy: clientY, sc: { ...crop } };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    applyDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const confirmCrop = () => {
    const img = imgRef.current;
    if (!img || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const sx = img.naturalWidth / r.width;
    const sy = img.naturalHeight / r.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(crop.w * sx);
    canvas.height = Math.round(crop.h * sy);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy, 0, 0, canvas.width, canvas.height);
    onConfirm(canvas.toDataURL('image/jpeg', 0.92));
  };

  const corners = [
    { key: 'tl', style: { top: -6, left: -6 } },
    { key: 'tr', style: { top: -6, right: -6 } },
    { key: 'bl', style: { bottom: -6, left: -6 } },
    { key: 'br', style: { bottom: -6, right: -6 } },
  ] as const;

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col" data-testid="image-cropper">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onCancel} className="text-white/70 hover:text-white" data-testid="button-crop-cancel">
          <X className="w-5 h-5" />
        </button>
        <span className="text-white text-sm font-semibold">Cortar imagem</span>
        <button onClick={confirmCrop} className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-semibold" data-testid="button-crop-confirm">
          Aplicar
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
        <div ref={containerRef} className="relative select-none" style={{ touchAction: 'none' }}>
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onImgLoad}
            className="block max-w-[85vw] max-h-[65vh] object-contain"
            draggable={false}
          />
          {imgLoaded && (
            <>
              <div className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none" style={{ height: crop.y }} />
              <div className="absolute left-0 right-0 bg-black/60 pointer-events-none" style={{ top: crop.y + crop.h, bottom: 0 }} />
              <div className="absolute bg-black/60 pointer-events-none" style={{ top: crop.y, height: crop.h, left: 0, width: crop.x }} />
              <div className="absolute bg-black/60 pointer-events-none" style={{ top: crop.y, height: crop.h, left: crop.x + crop.w, right: 0 }} />

              <div
                className="absolute border-2 border-white cursor-move"
                style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                onMouseDown={e => startDrag(e, 'move')}
                onTouchStart={e => startDrag(e, 'move')}
                onTouchMove={handleTouchMove}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/25" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/25" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/25" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/25" />
                </div>
                {corners.map(({ key, style }) => (
                  <div
                    key={key}
                    className="absolute w-4 h-4 bg-white rounded-sm z-10"
                    style={{ ...style, cursor: `${key}-resize` }}
                    onMouseDown={e => startDrag(e, key)}
                    onTouchStart={e => startDrag(e, key)}
                    onTouchMove={handleTouchMove}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center pb-4 flex-shrink-0">
        <button onClick={initCrop} className="text-white/50 text-xs hover:text-white/80 transition-colors" data-testid="button-crop-reset">
          Repor seleção
        </button>
      </div>
    </div>
  );
}

// ─── Chat Input ───────────────────────────────────────────────────────────────

function ChatInput({ placeholder, onSend, disabled, editingMessage, onCancelEdit, onEditSave, replyTo, onCancelReply }: {
  placeholder: string;
  onSend: (payload: { text?: string; imageData?: string; audioData?: string; type: string; replyToId?: number; replyToText?: string; replyToAuthor?: string }) => void;
  disabled?: boolean;
  editingMessage?: { id: number; text: string } | null;
  onCancelEdit?: () => void;
  onEditSave?: (id: number, text: string) => void;
  replyTo?: ReplyTo | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [editingMessage]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (editingMessage && onEditSave) {
      onEditSave(editingMessage.id, trimmed);
      setText("");
    } else {
      onSend({
        text: trimmed, type: "text",
        ...(replyTo ? { replyToId: replyTo.id, replyToText: replyTo.text.substring(0, 150), replyToAuthor: replyTo.displayName } : {}),
      });
      setText("");
      onCancelReply?.();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === "Escape" && editingMessage) { onCancelEdit?.(); setText(""); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sendImage = () => {
    if (!imagePreview) return;
    onSend({ imageData: imagePreview, type: "image" });
    if (imageCaption.trim()) onSend({ text: imageCaption.trim(), type: "text" });
    setImagePreview(null);
    setImageCaption("");
  };

  return (
    <>
      {/* ── Image cropper ── */}
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onConfirm={dataUrl => { setCropSrc(null); setImagePreview(dataUrl); setImageCaption(""); }}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* ── Image preview modal ── */}
      {imagePreview && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/90" data-testid="image-preview-modal">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button onClick={() => { setImagePreview(null); setImageCaption(""); }} className="text-white/80 hover:text-white" data-testid="button-cancel-image-preview">
              <X className="w-6 h-6" />
            </button>
            <span className="text-white text-sm font-medium">Pré-visualização</span>
            <button onClick={sendImage} className="text-primary-foreground bg-primary rounded-lg px-4 py-1.5 text-sm font-semibold" data-testid="button-send-image-preview">
              Enviar
            </button>
          </div>
          {/* Image */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
            <img
              src={imagePreview}
              alt="Pré-visualização"
              className="max-w-full max-h-full object-contain rounded-lg"
              data-testid="img-preview"
            />
          </div>
          {/* Caption input */}
          <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0 bg-black/60">
            <input
              type="text"
              value={imageCaption}
              onChange={e => setImageCaption(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendImage(); }}
              placeholder="Adicionar legenda..."
              className="flex-1 bg-white/10 text-white placeholder:text-white/40 rounded-full px-4 py-2 text-sm outline-none"
              data-testid="input-image-caption"
            />
          </div>
        </div>
      )}
    <div className="border-t bg-background px-2 pt-1.5 flex-shrink-0 chat-input-bar">
      {/* Reply preview banner */}
      {replyTo && !editingMessage && (
        <div className="flex items-center justify-between px-2 py-1.5 mb-1 rounded-lg bg-muted/60 border-l-2 border-primary">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CornerUpLeft className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-primary">{replyTo.displayName}</span>
              <p className="text-xs text-muted-foreground truncate">{replyTo.text || "Mensagem"}</p>
            </div>
          </div>
          <button onClick={onCancelReply} className="p-1 rounded text-muted-foreground shrink-0" data-testid="button-cancel-reply">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Edit mode banner */}
      {editingMessage && (
        <div className="flex items-center justify-between px-1 py-1 mb-1 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs text-primary font-medium truncate">A editar mensagem</span>
          </div>
          <button onClick={() => { onCancelEdit?.(); setText(""); }} className="p-1 rounded text-muted-foreground" data-testid="button-cancel-edit">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {recording ? (
        <AudioRecorder
          onAudio={(audioData) => { onSend({ audioData, type: "audio" }); setRecording(false); }}
          onCancel={() => setRecording(false)}
        />
      ) : (
        <div className="flex items-end gap-1">
          {!editingMessage && (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()} disabled={disabled} data-testid="button-send-image">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setRecording(true)} disabled={disabled} data-testid="button-record-audio">
                <Mic className="w-4 h-4 text-muted-foreground" />
              </Button>
            </>
          )}
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={editingMessage ? "Edita a tua mensagem..." : placeholder}
            disabled={disabled}
            className="flex-1 min-h-[40px] max-h-32 resize-none text-sm"
            rows={1}
            data-testid="input-message"
          />
          <Button size="icon" onClick={send} disabled={!text.trim() || disabled} data-testid="button-send-message">
            {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
    </>
  );
}

// ─── Channel Chat ─────────────────────────────────────────────────────────────

function ChannelChat({ channel, currentUserId, isAdmin, wsRef, onBack, onStartDm }: {
  channel: { channelId: number; channelName: string };
  currentUserId: string;
  isAdmin: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onBack?: () => void;
  onStartDm?: (userId: string, userName: string) => void;
}) {
  const [showMembers, setShowMembers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const scrollToMessage = (id: number) => {
    const el = document.querySelector(`[data-testid="message-${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("msg-highlighted");
    setTimeout(() => el.classList.remove("msg-highlighted"), 2000);
  };

  const { isLoading } = useQuery({
    queryKey: ["/api/chat/channels", channel.channelId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chat/channels/${channel.channelId}/messages?limit=50`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? [...data].reverse() : []);
      return data;
    },
  });

  // WebSocket: listen for new messages in this channel
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    const handler = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "chat_message" && msg.channelId === channel.channelId) {
          if (msg.message.deleted) {
            setMessages(prev => prev.map(m => m.id === msg.message.id ? { ...m, ...msg.message } : m));
          } else {
            setMessages(prev => [...prev, msg.message]);
          }
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [channel.channelId, wsRef]);

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  }, [messages]);

  const [editingMessage, setEditingMessage] = useState<{ id: number; text: string } | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  const sendMutation = useMutation({
    mutationFn: (payload: { text?: string; imageData?: string; audioData?: string; type: string; replyToId?: number; replyToText?: string; replyToAuthor?: string }) =>
      apiRequest("POST", `/api/chat/channels/${channel.channelId}/messages`, payload),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/chat/messages/${id}`),
    onSuccess: (_, id) => setMessages(prev => prev.map(m => m.id === id ? { ...m, type: "deleted", deleted: true, text: null, imageData: null, audioData: null } : m)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) =>
      apiRequest("PATCH", `/api/chat/messages/${id}`, { text }),
    onSuccess: (_, { id, text }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, text } : m));
      setEditingMessage(null);
    },
  });

  const groupedByDay = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const day = format(new Date(msg.createdAt), "yyyy-MM-dd");
    const last = acc[acc.length - 1];
    if (last?.date === day) last.msgs.push(msg);
    else acc.push({ date: day, msgs: [msg] });
    return acc;
  }, []);

  const colorPairsCh = [
    { bg: "bg-primary/15", text: "text-primary" },
    { bg: "bg-blue-100 dark:bg-blue-950/50", text: "text-blue-600 dark:text-blue-400" },
    { bg: "bg-violet-100 dark:bg-violet-950/50", text: "text-violet-600 dark:text-violet-400" },
    { bg: "bg-amber-100 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-400" },
    { bg: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-400" },
  ];
  const chColor = colorPairsCh[channel.channelId % colorPairsCh.length];

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      {/* Chat column */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2.5 border-b bg-background flex-shrink-0">
          {onBack && (
            <Button size="icon" variant="ghost" onClick={onBack} className="md:hidden -ml-1 flex-shrink-0" data-testid="button-back-channel">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${chColor.bg}`}>
            <span className={`text-sm font-bold ${chColor.text}`}>{channel.channelName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{channel.channelName}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Canal da comunidade</p>
          </div>
          <Button
            size="icon" variant="ghost"
            onClick={() => setShowMembers(v => !v)}
            className={showMembers ? "text-primary bg-primary/10" : ""}
            data-testid="button-toggle-members">
            <Users className="w-4 h-4" />
          </Button>
        </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">A carregar...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-2 text-muted-foreground">
            <Hash className="w-8 h-8 opacity-30" />
            <p className="text-sm">Ainda não há mensagens em #{channel.channelName}</p>
            <p className="text-xs">Sê o primeiro a escrever algo!</p>
          </div>
        ) : (
          <div className="flex flex-col justify-end min-h-full py-1">
            {groupedByDay.map(group => (
              <div key={group.date}>
                <DateSeparator date={group.date} />
                {group.msgs.map((msg, idx) => {
                  const prev = idx > 0 ? group.msgs[idx - 1] : null;
                  const prevUid = prev ? ("userId" in prev ? prev.userId : prev.senderId) : null;
                  const curUid = "userId" in msg ? msg.userId : msg.senderId;
                  const minDiff = prev ? (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 60000 : null;
                  const showHeader = !prev || prevUid !== curUid || (minDiff !== null && minDiff > 5);
                  return (
                    <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId} isAdmin={isAdmin}
                      showHeader={showHeader}
                      onDelete={id => deleteMutation.mutate(id)}
                      onEdit={(id, text) => setEditingMessage({ id, text })}
                      onReply={r => { setReplyTo(r); setEditingMessage(null); }}
                      onScrollToReply={scrollToMessage} />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <ChatInput
        placeholder={`Mensagem em #${channel.channelName}`}
        onSend={payload => sendMutation.mutate(payload)}
        disabled={sendMutation.isPending}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onEditSave={(id, text) => editMutation.mutate({ id, text })}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
      </div>{/* end chat column */}

      {/* Members panel — absolute overlay, slides from right */}
      {showMembers && (
        <>
          {/* Dark scrim over chat */}
          <div
            className="absolute inset-0 bg-black/40 z-10"
            onClick={() => setShowMembers(false)}
          />
          {/* Panel */}
          <div className="absolute top-0 right-0 bottom-0 w-64 z-20 border-l flex flex-col overflow-hidden bg-background shadow-xl">
            <MembersPanel
              currentUserId={currentUserId}
              onStartDm={onStartDm ?? (() => {})}
              onBack={() => setShowMembers(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── DM Chat ──────────────────────────────────────────────────────────────────

function DmChat({ conversationId, otherUserName, currentUserId, isAdmin, wsRef, onBack }: {
  conversationId: number;
  otherUserName: string;
  currentUserId: string;
  isAdmin: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onBack?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);

  const scrollToMessage = (id: number) => {
    const el = document.querySelector(`[data-testid="message-${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("msg-highlighted");
    setTimeout(() => el.classList.remove("msg-highlighted"), 2000);
  };

  const { isLoading } = useQuery({
    queryKey: ["/api/chat/dms", conversationId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chat/dms/${conversationId}/messages?limit=50`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? [...data].reverse() : []);
      return data;
    },
  });

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    const handler = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "dm_message" && msg.conversationId === conversationId) {
          setMessages(prev => [...prev, msg.message]);
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [conversationId, wsRef]);

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  }, [messages]);

  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  const sendMutation = useMutation({
    mutationFn: (payload: { text?: string; imageData?: string; audioData?: string; type: string; replyToId?: number; replyToText?: string; replyToAuthor?: string }) =>
      apiRequest("POST", `/api/chat/dms/${conversationId}/messages`, payload),
  });

  const groupedByDay = messages.reduce<{ date: string; msgs: DmMessage[] }[]>((acc, msg) => {
    const day = format(new Date(msg.createdAt), "yyyy-MM-dd");
    const last = acc[acc.length - 1];
    if (last?.date === day) last.msgs.push(msg);
    else acc.push({ date: day, msgs: [msg] });
    return acc;
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 border-b bg-background flex-shrink-0">
        {onBack && (
          <Button size="icon" variant="ghost" onClick={onBack} className="md:hidden -ml-1 flex-shrink-0" data-testid="button-back-dm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
            {otherUserName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{otherUserName}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Mensagem directa</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">A carregar...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-2 text-muted-foreground">
            <MessageCircle className="w-8 h-8 opacity-30" />
            <p className="text-sm">Inicia a conversa com {otherUserName}</p>
          </div>
        ) : (
          <div className="flex flex-col justify-end min-h-full py-1">
            {groupedByDay.map(group => (
              <div key={group.date}>
                <DateSeparator date={group.date} />
                {group.msgs.map((msg, idx) => {
                  const prev = idx > 0 ? group.msgs[idx - 1] : null;
                  const prevUid = prev ? ("userId" in prev ? prev.userId : prev.senderId) : null;
                  const curUid = "userId" in msg ? msg.userId : msg.senderId;
                  const minDiff = prev ? (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 60000 : null;
                  const showHeader = !prev || prevUid !== curUid || (minDiff !== null && minDiff > 5);
                  return (
                    <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId} isAdmin={isAdmin}
                      showHeader={showHeader}
                      onDelete={() => {}}
                      onEdit={() => {}}
                      onReply={r => setReplyTo(r)}
                      onScrollToReply={scrollToMessage} />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <ChatInput
        placeholder={`Mensagem para ${otherUserName}`}
        onSend={payload => sendMutation.mutate(payload)}
        disabled={sendMutation.isPending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}

// ─── Live: shared hook + components ──────────────────────────────────────────

function useLiveRoom(liveId: number, wsRef: React.MutableRefObject<WebSocket | null>) {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [liveEnded, setLiveEnded] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.send(JSON.stringify({ type: "live_join_room", liveId }));
    const handler = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "live_comment" && msg.liveId === liveId) {
          setComments(prev => [...prev.slice(-49), msg as LiveComment]);
        }
        if (msg.type === "live_viewer_count" && msg.liveId === liveId) {
          setViewerCount(msg.count);
        }
        if (msg.type === "live_ended" && msg.liveId === liveId) {
          setLiveEnded(true);
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => {
      ws.removeEventListener("message", handler);
      ws.send(JSON.stringify({ type: "live_leave_room", liveId }));
    };
  }, [liveId, wsRef]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  return { comments, viewerCount, liveEnded, commentsEndRef };
}

// ─── Live Comments Overlay ────────────────────────────────────────────────────

function LiveCommentsOverlay({ comments, commentsEndRef }: {
  comments: LiveComment[];
  commentsEndRef: React.RefObject<HTMLDivElement>;
}) {
  const visible = comments.slice(-6);
  return (
    <div className="absolute bottom-2 left-3 right-3 pointer-events-none flex flex-col gap-1.5">
      {visible.map(c => (
        <div key={c.id} className="flex items-start gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
            <AvatarImage src={c.userPhoto ?? undefined} />
            <AvatarFallback className="text-[9px] bg-white/20 text-white">{c.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-2.5 py-1.5 max-w-full">
            <span className="text-white text-[11px] font-semibold mr-1.5">{c.userName}</span>
            <span className="text-white/90 text-[11px]">{c.text}</span>
          </div>
        </div>
      ))}
      <div ref={commentsEndRef} />
    </div>
  );
}

// ─── Live Comment Input ───────────────────────────────────────────────────────

function LiveCommentInput({ liveId, user, wsRef }: {
  liveId: number;
  user: { id: string; name: string; profilePhoto?: string | null };
  wsRef: React.MutableRefObject<WebSocket | null>;
}) {
  const [text, setText] = useState("");
  const send = () => {
    const t = text.trim();
    if (!t || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: "live_comment", liveId,
      userName: user.name, userPhoto: user.profilePhoto ?? null, text: t,
    }));
    setText("");
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="flex-1 flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 border border-white/20">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Comentar..."
          className="flex-1 bg-transparent text-white text-sm py-2.5 outline-none placeholder:text-white/50"
          data-testid="input-live-comment"
        />
      </div>
      <button
        onClick={send}
        disabled={!text.trim()}
        className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 flex-shrink-0"
        data-testid="button-send-live-comment"
      >
        <Send className="w-4 h-4 text-primary-foreground" />
      </button>
    </div>
  );
}

// ─── Live Broadcaster ─────────────────────────────────────────────────────────

function LiveBroadcaster({ liveId, user, onEnd, wsRef }: {
  liveId: number;
  user: { id: string; name: string; profilePhoto?: string | null };
  onEnd: () => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [camError, setCamError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(3);
  const [active, setActive] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const hasEndedRef = useRef(false);
  const [joinRequests, setJoinRequests] = useState<{ userId: string; userName: string; userPhoto: string | null }[]>([]);
  const { comments, viewerCount, commentsEndRef } = useLiveRoom(liveId, wsRef);

  // Start camera first, then do countdown
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        // Countdown: 3 → 2 → 1 → live
        let count = 3;
        setCountdown(count);
        const interval = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            clearInterval(interval);
            setCountdown(null);
            setActive(true);
          } else {
            setCountdown(count);
          }
        }, 1000);
      })
      .catch(() => setCamError("Não foi possível aceder à câmara/microfone."));

    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Auto-end live when host unmounts (navigate away within app)
  useEffect(() => {
    return () => {
      if (!hasEndedRef.current) {
        hasEndedRef.current = true;
        streamRef.current?.getTracks().forEach(t => t.stop());
        peersRef.current.forEach(pc => pc.close());
        fetch(`/api/chat/lives/${liveId}/end`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}", keepalive: true }).catch(() => {});
      }
    };
  }, [liveId]);

  // Auto-end live when browser tab is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasEndedRef.current) {
        hasEndedRef.current = true;
        navigator.sendBeacon(`/api/chat/lives/${liveId}/end-beacon`);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [liveId]);

  // WebRTC signaling
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    const handler = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "viewer_join" && msg.liveId === liveId) {
          const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
          peersRef.current.set(msg.fromUserId, pc);
          streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current!));
          pc.onicecandidate = ev => {
            if (ev.candidate) ws.send(JSON.stringify({ type: "live_ice", targetUserId: msg.fromUserId, candidate: ev.candidate, liveId }));
          };
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: "live_offer", targetUserId: msg.fromUserId, offer, liveId }));
        }
        if (msg.type === "live_answer" && msg.liveId === liveId) {
          const pc = peersRef.current.get(msg.fromUserId);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        }
        if (msg.type === "live_ice" && msg.liveId === liveId && msg.fromUserId) {
          const pc = peersRef.current.get(msg.fromUserId);
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
        if (msg.type === "live_join_request" && msg.liveId === liveId && msg.fromUserId) {
          setJoinRequests(prev => {
            if (prev.some(r => r.userId === msg.fromUserId)) return prev;
            return [...prev, { userId: msg.fromUserId, userName: msg.userName ?? "Utilizador", userPhoto: msg.userPhoto ?? null }];
          });
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [liveId, wsRef]);

  const endLive = async () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    streamRef.current?.getTracks().forEach(t => t.stop());
    peersRef.current.forEach(pc => pc.close());
    await apiRequest("PATCH", `/api/chat/lives/${liveId}/end`, {});
    onEnd();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Video fills screen */}
      <div className="absolute inset-0">
        {camError ? (
          <div className="flex items-center justify-center h-full text-white/60 text-sm px-8 text-center">{camError}</div>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      </div>

      {/* Countdown overlay — shown while camera loads / counting down */}
      {countdown !== null && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
          <p className="text-white/60 text-base mb-4 tracking-widest uppercase font-medium">A iniciar live em</p>
          <div
            key={countdown}
            className="text-white font-bold leading-none"
            style={{
              fontSize: "clamp(120px, 35vw, 200px)",
              animation: "countdown-pop 0.9s ease-out forwards",
            }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Top bar — badge + viewer count + invite (hidden during countdown) */}
      {countdown === null && (
        <div className="relative z-10 flex items-center gap-2 px-4" style={{ paddingTop: "calc(var(--safe-top, 0px) + 12px)", paddingBottom: "12px" }}>
          {active && <Badge className="bg-red-600 text-white gap-1 text-xs border-0"><Wifi className="w-3 h-3" /> AO VIVO</Badge>}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <Users className="w-3 h-3 text-white/80" />
            <span className="text-white text-xs font-medium">{viewerCount} a assistir</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5"
            data-testid="button-invite-members"
          >
            <UserPlus className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-medium">Convidar</span>
          </button>
        </div>
      )}

      {/* Join requests — floating cards below top bar */}
      {countdown === null && joinRequests.length > 0 && (
        <div className="relative z-20 px-4 flex flex-col gap-2 pointer-events-none">
          {joinRequests.map(req => (
            <div
              key={req.userId}
              className="pointer-events-auto flex items-center gap-3 bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2.5 shadow-lg"
            >
              <Avatar className="w-8 h-8 border border-white/20 flex-shrink-0">
                <AvatarImage src={req.userPhoto ?? undefined} />
                <AvatarFallback className="bg-white/20 text-white text-xs">{req.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{req.userName}</p>
                <p className="text-white/50 text-xs">Quer juntar-se à live</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={async () => {
                    await apiRequest("POST", `/api/chat/lives/${liveId}/invite`, { userIds: [req.userId] });
                    wsRef.current?.send(JSON.stringify({ type: "live_join_response", targetUserId: req.userId, liveId, accepted: true }));
                    setJoinRequests(prev => prev.filter(r => r.userId !== req.userId));
                  }}
                  className="flex items-center gap-1 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full"
                  data-testid={`button-accept-join-${req.userId}`}
                >
                  <Check className="w-3 h-3" /> Aceitar
                </button>
                <button
                  onClick={() => {
                    wsRef.current?.send(JSON.stringify({ type: "live_join_response", targetUserId: req.userId, liveId, accepted: false }));
                    setJoinRequests(prev => prev.filter(r => r.userId !== req.userId));
                  }}
                  className="flex items-center gap-1 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
                  data-testid={`button-decline-join-${req.userId}`}
                >
                  <X className="w-3 h-3" /> Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments overlay */}
      <div className="flex-1 relative">
        {countdown === null && <LiveCommentsOverlay comments={comments} commentsEndRef={commentsEndRef} />}
      </div>

      {/* Bottom bar: comment input + END LIVE button */}
      <div className="relative z-10 flex flex-col gap-3 px-3 pt-2" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 16px)" }}>
        {countdown === null && <LiveCommentInput liveId={liveId} user={user} wsRef={wsRef} />}
        <div className="flex justify-center">
          <button
            onClick={endLive}
            className="flex items-center gap-2.5 bg-red-600 text-white font-bold py-3 px-8 rounded-full border border-red-400/30"
            style={{ boxShadow: "0 0 28px rgba(220,38,38,0.55), 0 2px 8px rgba(0,0,0,0.4)" }}
            data-testid="button-end-live"
          >
            <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center flex-shrink-0">
              <Square className="w-3 h-3 fill-white text-white" />
            </div>
            <span className="tracking-wide text-sm">Terminar Live</span>
          </button>
        </div>
      </div>

      {/* Invite modal — rendered outside the video stack so it's not clipped */}
      <InviteMembersModal
        liveId={liveId}
        hostId={user.id}
        open={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </div>
  );
}

// ─── Live Viewer ──────────────────────────────────────────────────────────────

function LiveViewer({ live, user, wsRef, onClose }: {
  live: LiveSession;
  user: { id: string; name: string; profilePhoto?: string | null };
  wsRef: React.MutableRefObject<WebSocket | null>;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [joinRequested, setJoinRequested] = useState(false);
  const [joinAccepted, setJoinAccepted] = useState(false);
  const { comments, viewerCount, liveEnded, commentsEndRef } = useLiveRoom(live.id, wsRef);

  // Auto-close viewer 3 seconds after live ends
  useEffect(() => {
    if (liveEnded) {
      const t = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(t);
    }
  }, [liveEnded, onClose]);

  // WebRTC viewer
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.send(JSON.stringify({ type: "viewer_join", liveId: live.id, targetUserId: live.hostId }));
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;
    pc.ontrack = e => {
      if (videoRef.current) { videoRef.current.srcObject = e.streams[0]; setConnected(true); }
    };
    pc.onicecandidate = e => {
      if (e.candidate) ws.send(JSON.stringify({ type: "live_ice", targetUserId: live.hostId, candidate: e.candidate, liveId: live.id }));
    };
    const handler = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "live_offer" && msg.liveId === live.id) {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: "live_answer", targetUserId: live.hostId, answer, liveId: live.id }));
        }
        if (msg.type === "live_ice" && msg.liveId === live.id) {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
        if (msg.type === "live_join_response" && msg.liveId === live.id) {
          if (msg.accepted) setJoinAccepted(true);
          else setJoinRequested(false);
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => { ws.removeEventListener("message", handler); pc.close(); };
  }, [live, wsRef]);

  const sendJoinRequest = () => {
    const ws = wsRef.current;
    if (!ws || joinRequested) return;
    setJoinRequested(true);
    ws.send(JSON.stringify({
      type: "live_join_request",
      targetUserId: live.hostId,
      liveId: live.id,
      userName: user.name,
      userPhoto: user.profilePhoto ?? null,
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Video fills screen */}
      <div className="absolute inset-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {!connected && !liveEnded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-sm">A ligar ao stream...</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      </div>

      {/* Live ended overlay */}
      {liveEnded && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/85">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <PhoneOff className="w-7 h-7 text-white/70" />
          </div>
          <p className="text-white text-xl font-semibold">Live terminou</p>
          <p className="text-white/50 text-sm">A fechar automaticamente...</p>
        </div>
      )}

      {/* Join accepted banner */}
      {joinAccepted && (
        <div className="absolute top-24 inset-x-4 z-30 flex items-center gap-3 bg-primary/90 backdrop-blur-sm text-white rounded-2xl px-4 py-3 shadow-lg">
          <UserCheck className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">O anfitrião aceitou o teu pedido!</p>
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4" style={{ paddingTop: "calc(var(--safe-top, 0px) + 12px)", paddingBottom: "12px" }}>
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border border-white/30">
            <AvatarImage src={live.hostPhoto ?? undefined} />
            <AvatarFallback className="bg-white/20 text-white text-xs">{live.hostName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{live.hostName}</p>
            <p className="text-white/60 text-xs">{live.title}</p>
          </div>
          <Badge className="bg-red-600 text-white gap-1 text-xs border-0 ml-1"><Wifi className="w-3 h-3" /> AO VIVO</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <Users className="w-3 h-3 text-white/80" />
            <span className="text-white text-xs font-medium">{viewerCount} a assistir</span>
          </div>
          {/* Toggle chat */}
          <button
            onClick={() => setShowChat(v => !v)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20"
            data-testid="button-toggle-live-chat"
          >
            {showChat
              ? <MessageCircle className="w-4 h-4 text-white" />
              : <MessageCircle className="w-4 h-4 text-white/40" />
            }
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20"
            data-testid="button-leave-live"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Comments — fills middle space */}
      <div className="flex-1 relative">
        {showChat && <LiveCommentsOverlay comments={comments} commentsEndRef={commentsEndRef} />}
      </div>

      {/* Bottom bar: join request + comment input */}
      <div className="relative z-10 flex flex-col gap-2 px-3 pt-2" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)" }}>
        {/* Request to join */}
        <div className="flex justify-center">
          <button
            onClick={sendJoinRequest}
            disabled={joinRequested}
            className={`flex items-center gap-2 backdrop-blur-sm text-white text-sm font-semibold py-2.5 px-6 rounded-full border transition-all
              ${joinRequested
                ? "bg-white/10 border-white/15 text-white/50"
                : "bg-white/15 border-white/25 hover:bg-white/20"}`}
            data-testid="button-request-join-live"
          >
            <UserPlus className="w-4 h-4 flex-shrink-0" />
            {joinRequested ? "Pedido enviado..." : "Pedir para entrar"}
          </button>
        </div>
        <LiveCommentInput liveId={live.id} user={user} wsRef={wsRef} />
      </div>
    </div>
  );
}

// ─── Invite Members Modal ─────────────────────────────────────────────────────

function InviteMembersModal({ liveId, hostId, open, onClose }: {
  liveId: number;
  hostId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: members = [] } = useQuery<Member[]>({ queryKey: ["/api/community/members"] });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const others = members.filter(m => m.id !== hostId);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const sendInvites = async () => {
    setSending(true);
    await apiRequest("POST", `/api/chat/lives/${liveId}/invite`, { userIds: [...selected] });
    setSending(false);
    setDone(true);
    setTimeout(() => { setDone(false); setSelected(new Set()); onClose(); }, 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Convidar para a Live
          </DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Convites enviados!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground -mt-1">Selecciona os membros a notificar:</p>
            <ScrollArea className="max-h-64">
              <div className="space-y-1 pr-2">
                {others.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum outro membro disponível</p>
                )}
                {others.map(m => (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                      ${selected.has(m.id) ? "bg-primary/10" : "hover-elevate"}`}
                    data-testid={`invite-member-${m.id}`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={m.profilePhoto ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {m.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium truncate">{m.name}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${selected.has(m.id) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                      {selected.has(m.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button
                onClick={sendInvites}
                disabled={selected.size === 0 || sending}
                className="flex-1"
                data-testid="button-send-invites"
              >
                {sending ? "A enviar..." : `Convidar${selected.size > 0 ? ` (${selected.size})` : ""}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Members Panel ────────────────────────────────────────────────────────────

function MembersPanel({ currentUserId, onStartDm, onBack }: {
  currentUserId: string;
  onStartDm: (userId: string, userName: string) => void;
  onBack?: () => void;
}) {
  const { data: members = [] } = useQuery<Member[]>({ queryKey: ["/api/community/members"] });
  const { data: following = [] } = useQuery<string[]>({ queryKey: ["/api/community/following"] });

  const followMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("POST", `/api/community/follow/${userId}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/community/following"] }),
  });
  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/community/follow/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/community/following"] }),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-3 border-b bg-background">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-sm">Membros</span>
        <Badge variant="secondary" className="ml-auto text-xs">{members.length}</Badge>
        {onBack && (
          <Button size="icon" variant="ghost" onClick={onBack} className="-mr-1" data-testid="button-close-members">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {members.map(member => {
            const isFollowing = following.includes(member.id);
            const isMe = member.id === currentUserId;
            return (
              <div key={member.id}
                className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-default"
                data-testid={`member-${member.id}`}>
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={member.profilePhoto ?? undefined} />
                  <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{member.name}</span>
                    {member.role === "admin" && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{member.role === "admin" ? "Admin" : "Membro"}</span>
                </div>
                {!isMe && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost"
                      onClick={() => onStartDm(member.id, member.name)}
                      data-testid={`button-dm-${member.id}`}>
                      <MessageCircle className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => isFollowing ? unfollowMutation.mutate(member.id) : followMutation.mutate(member.id)}
                      data-testid={`button-follow-${member.id}`}>
                      {isFollowing ? <UserCheck className="w-3.5 h-3.5 text-primary" /> : <UserPlus className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Manage Channel Admins ────────────────────────────────────────────────────

function ManageChannelAdminsModal({ channel, open, onClose }: {
  channel: ChatChannel; open: boolean; onClose: () => void;
}) {
  const { user } = useAuth();
  const isAppAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");

  const { data: admins = [], refetch: refetchAdmins } = useQuery<ChannelAdmin[]>({
    queryKey: ["/api/chat/channels", channel.id, "admins"],
    queryFn: async () => {
      const r = await fetch(`/api/chat/channels/${channel.id}/admins`, { credentials: "include" });
      return r.json();
    },
    enabled: open,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/community/members"],
    enabled: open,
  });

  const addAdminMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("POST", `/api/chat/channels/${channel.id}/admins`, { userId }),
    onSuccess: () => refetchAdmins(),
  });

  const removeAdminMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/chat/channels/${channel.id}/admins/${userId}`),
    onSuccess: () => refetchAdmins(),
  });

  const adminUserIds = new Set(admins.map(a => a.userId));
  const filteredMembers = members.filter(m =>
    m.id !== user?.id &&
    !adminUserIds.has(m.id) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Admins do Canal #{channel.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {admins.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Admins actuais</p>
              <div className="space-y-2">
                {admins.map(admin => (
                  <div key={admin.userId} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={admin.profilePhoto ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(admin.name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium truncate">{admin.name ?? "Utilizador"}</span>
                    {isAppAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeAdminMutation.mutate(admin.userId)}
                        disabled={removeAdminMutation.isPending}
                        data-testid={`button-remove-admin-${admin.userId}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Separator className="mt-3" />
            </div>
          )}
          {isAppAdmin && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Adicionar admin</p>
              <Input
                placeholder="Pesquisar membro..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mb-2"
                data-testid="input-search-admin"
              />
              <ScrollArea className="h-48">
                <div className="space-y-1 pr-2">
                  {filteredMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum membro encontrado</p>
                  )}
                  {filteredMembers.map(m => (
                    <button
                      key={m.id}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover-elevate text-left"
                      onClick={() => addAdminMutation.mutate(m.id)}
                      disabled={addAdminMutation.isPending}
                      data-testid={`button-add-admin-${m.id}`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={m.profilePhoto ?? undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {m.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm truncate">{m.name}</span>
                      <UserPlus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Channel Modal ───────────────────────────────────────────────────────

function EditChannelModal({ channel, open, onClose }: {
  channel: ChatChannel; open: boolean; onClose: () => void;
}) {
  const [name, setName] = useState(channel.name);
  const [desc, setDesc] = useState(channel.description || "");
  const [emoji, setEmoji] = useState(channel.emoji || "#");
  const [isPrivate, setIsPrivate] = useState(channel.isPrivate);
  const [isPremium, setIsPremium] = useState(channel.isPremium);

  useEffect(() => {
    if (open) {
      setName(channel.name); setDesc(channel.description || "");
      setEmoji(channel.emoji || "#"); setIsPrivate(channel.isPrivate);
      setIsPremium(channel.isPremium);
    }
  }, [open, channel]);

  const editMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/chat/channels/${channel.id}`, {
      name: name.trim().toLowerCase().replace(/\s+/g, "-"), description: desc, emoji, isPrivate, isPremium,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/chat/channels"] }); onClose(); },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Canal</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-3">
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={2}
                className="w-14 h-9 text-center text-xl border border-input rounded-md bg-background"
                data-testid="input-edit-channel-emoji"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Nome do canal</Label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ex: oracoes"
                className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
                data-testid="input-edit-channel-name"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Para que serve este canal..."
              className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
              data-testid="input-edit-channel-desc"
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Canal privado</p>
              <p className="text-xs text-muted-foreground">Apenas membros convidados</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} data-testid="switch-edit-channel-private" />
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-yellow-500" />Canal premium</p>
              <p className="text-xs text-muted-foreground">Apenas utilizadores com subscrição</p>
            </div>
            <Switch checked={isPremium} onCheckedChange={setIsPremium} data-testid="switch-edit-channel-premium" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!name.trim() || editMutation.isPending} data-testid="button-save-channel-edit">
              {editMutation.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Channel Item ─────────────────────────────────────────────────────────────

function ChannelSwipeItem({ ch, isActive, isAdmin, isChannelAdmin, onSelect, onEdit, onDelete, onManageAdmins }: {
  ch: ChatChannel; isActive: boolean; isAdmin: boolean; isChannelAdmin: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void; onManageAdmins: () => void;
}) {
  const canEdit = isAdmin || isChannelAdmin;
  const canManageAdmins = isAdmin || isChannelAdmin;
  const colorPairs = [
    { bg: "bg-primary/15", text: "text-primary" },
    { bg: "bg-blue-100 dark:bg-blue-950/50", text: "text-blue-600 dark:text-blue-400" },
    { bg: "bg-violet-100 dark:bg-violet-950/50", text: "text-violet-600 dark:text-violet-400" },
    { bg: "bg-amber-100 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-400" },
    { bg: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-400" },
  ];
  const color = colorPairs[ch.id % colorPairs.length];

  return (
    <div
      onClick={onSelect}
      data-testid={`channel-${ch.id}`}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left cursor-pointer
        ${isActive ? "bg-primary/10 border border-primary/20" : "hover-elevate text-foreground"}`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${color.bg}`}>
        {ch.emoji
          ? <span className="text-base leading-none">{ch.emoji}</span>
          : <span className={`text-sm font-bold ${color.text}`}>{ch.name.charAt(0).toUpperCase()}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? "text-primary" : ""}`}>{ch.name}</p>
        {ch.description && (
          <p className={`text-xs truncate mt-0.5 ${isActive ? "text-primary/70" : "text-muted-foreground"}`}>
            {ch.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {ch.isPremium && <Crown className={`w-3 h-3 ${isActive ? "text-yellow-500" : "text-yellow-500"}`} />}
        {ch.isPrivate && <Lock className={`w-3 h-3 text-muted-foreground`} />}
        {canEdit && (
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            data-testid={`button-edit-channel-${ch.id}`}
          ><Pencil className="w-3.5 h-3.5" /></button>
        )}
        {canManageAdmins && (
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => { e.stopPropagation(); onManageAdmins(); }}
            data-testid={`button-manage-admins-channel-${ch.id}`}
          ><Settings className="w-3.5 h-3.5" /></button>
        )}
        {isAdmin && (
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            data-testid={`button-delete-channel-${ch.id}`}
          ><Trash2 className="w-3.5 h-3.5" /></button>
        )}
      </div>
    </div>
  );
}

// ─── Create Channel Dialog ────────────────────────────────────────────────────

function CreateChannelDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("#");

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/chat/channels", { name: name.trim().toLowerCase().replace(/\s+/g, "-"), description: desc, emoji }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/chat/channels"] }); onCreated(); onClose(); setName(""); setDesc(""); setEmoji("#"); },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar Canal</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Emoji</Label>
            <Input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} className="w-16" data-testid="input-channel-emoji" />
          </div>
          <div className="space-y-1.5">
            <Label>Nome do canal</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: oracoes" data-testid="input-channel-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Para que serve este canal..." data-testid="input-channel-desc" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} data-testid="button-create-channel">
              {createMutation.isPending ? "A criar..." : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Go Live Dialog ───────────────────────────────────────────────────────────

function GoLiveDialog({ open, onClose, onLive, channels }: {
  open: boolean; onClose: () => void; onLive: (liveId: number) => void;
  channels: ChatChannel[];
}) {
  const [title, setTitle] = useState("");
  const [channelId, setChannelId] = useState<string>("");
  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/chat/lives", {
      title: title.trim(),
      channelId: channelId ? Number(channelId) : null,
    }),
    onSuccess: async (res) => {
      const live = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/chat/lives"] });
      onLive(live.id);
      onClose();
      setTitle("");
      setChannelId("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Iniciar Live</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Título da live</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Oração da manhã" data-testid="input-live-title" />
          </div>
          <div className="space-y-1.5">
            <Label>Canal <span className="text-muted-foreground text-xs">(obrigatório)</span></Label>
            <Select value={channelId} onValueChange={setChannelId} data-testid="select-live-channel">
              <SelectTrigger data-testid="trigger-live-channel">
                <SelectValue placeholder="Escolhe um canal..." />
              </SelectTrigger>
              <SelectContent>
                {channels.map(ch => (
                  <SelectItem key={ch.id} value={String(ch.id)} data-testid={`option-channel-${ch.id}`}>
                    # {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || !channelId || createMutation.isPending} data-testid="button-start-live">
              <Radio className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "A iniciar..." : "Ir ao Vivo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Paywall ──────────────────────────────────────────────────────────────────

function Paywall() {
  return (
    <div className="flex flex-col items-center justify-center h-full overflow-y-auto">
      <PremiumPaywall
        icon={<Users className="w-7 h-7 text-primary" />}
        title="Comunidade Premium"
        description="Junta-te à comunidade de crentes e partilha a tua jornada de fé com outros leitores do livro."
        features={[
          "Canais temáticos de oração e partilha",
          "Mensagens privadas com outros membros",
          "Envio de fotos e mensagens de voz",
          "Sistema de seguidores e rede de fé",
          "Lives e orações em direto",
        ]}
        className="py-8"
      />
    </div>
  );
}

// ─── Main Community Component ─────────────────────────────────────────────────

export default function Community() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView | null>(null);
  const [activeLiveId, setActiveLiveId] = useState<number | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [manageAdminsChannel, setManageAdminsChannel] = useState<ChatChannel | null>(null);
  const [showGoLive, setShowGoLive] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"canais" | "mensagens">("canais");
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setNavHidden(!mobileShowSidebar);
    return () => setNavHidden(false);
  }, [mobileShowSidebar]);

  const isAdmin = user?.role === "admin";
  const isPremium = user?.hasPremium || isAdmin;

  const { data: myAdminChannelIds = [] } = useQuery<number[]>({
    queryKey: ["/api/chat/my-admin-channels"],
    queryFn: async () => {
      const r = await fetch("/api/chat/my-admin-channels", { credentials: "include" });
      return r.json();
    },
    enabled: isPremium && !isAdmin,
  });

  const isChannelAdminFor = (channelId: number) => isAdmin || myAdminChannelIds.includes(channelId);

  // WebSocket connection
  useEffect(() => {
    if (!user?.id || !isPremium) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", userId: user.id }));
    ws.onclose = () => { wsRef.current = null; };
    // Immediately update live list when any live ends
    const handleLiveEnded = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "live_ended") {
          queryClient.invalidateQueries({ queryKey: ["/api/chat/lives"] });
        }
      } catch {}
    };
    ws.addEventListener("message", handleLiveEnded);
    return () => ws.close();
  }, [user?.id, isPremium]);

  // Data queries
  const { data: channels = [], refetch: refetchChannels } = useQuery<ChatChannel[]>({
    queryKey: ["/api/chat/channels"],
    enabled: isPremium,
  });
  const { data: dms = [], refetch: refetchDms } = useQuery<DmConversation[]>({
    queryKey: ["/api/chat/dms"],
    enabled: isPremium,
  });
  const { data: lives = [] } = useQuery<LiveSession[]>({
    queryKey: ["/api/chat/lives"],
    enabled: isPremium,
    refetchInterval: 10000,
  });

  // Set default view to first channel
  useEffect(() => {
    if (channels.length > 0 && !activeView) {
      setActiveView({ type: "channel", channelId: channels[0].id, channelName: channels[0].name });
    }
  }, [channels]);

  const goToView = (view: ActiveView) => {
    setActiveView(view);
    setMobileShowSidebar(false);
    if (view.type === "dm" || view.type === "members") setSidebarTab("mensagens");
    else if (view.type === "channel") setSidebarTab("canais");
  };

  const goBack = () => setMobileShowSidebar(true);

  const startDm = async (userId: string, userName: string) => {
    const res = await apiRequest("POST", `/api/chat/dms/${userId}`, {});
    const conv = await res.json();
    refetchDms();
    goToView({ type: "dm", conversationId: conv.id, otherUserId: userId, otherUserName: userName });
  };

  const deleteChannel = async (id: number) => {
    await apiRequest("DELETE", `/api/chat/channels/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/chat/channels"] });
    if (activeView?.type === "channel" && activeView.channelId === id) setActiveView(null);
  };

  if (!isPremium) return <Paywall />;

  const watchingLive = lives.find(l => l.id === activeLiveId);

  return (
    <div className="flex overflow-hidden bg-background flex-1 min-h-0">
      {/* ── Sidebar / Home ──────────────────────────────────────── */}
      <div className={`flex-shrink-0 bg-background flex flex-col overflow-hidden
        ${mobileShowSidebar ? 'w-full' : 'hidden'} ${desktopSidebarCollapsed ? 'md:hidden' : 'md:flex md:w-60'}`}>

        {/* Header — compact */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-serif font-bold text-foreground leading-tight truncate">Comunidade</h2>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {isPremium && (
                <Button size="icon" variant="ghost" onClick={() => setShowGoLive(true)} data-testid="button-go-live-header">
                  <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
              {isAdmin && (
                <Button size="icon" variant="ghost" onClick={() => setShowCreateChannel(true)} data-testid="button-new-channel-header">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="hidden md:flex" onClick={() => setDesktopSidebarCollapsed(true)} data-testid="button-collapse-sidebar">
                <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>

        {/* Pill toggle */}
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
            <button
              onClick={() => setSidebarTab("canais")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${sidebarTab === "canais"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"}`}
              data-testid="tab-canais">
              Canais
            </button>
            <button
              onClick={() => setSidebarTab("mensagens")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${sidebarTab === "mensagens"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"}`}
              data-testid="tab-mensagens">
              Mensagens
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 pb-4">

            {sidebarTab === "canais" ? (
              <>
                {/* Lives */}
                {lives.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {lives.map(live => (
                      <button
                        key={live.id}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/50 text-left"
                        onClick={() => { setActiveLiveId(live.id); setIsBroadcasting(false); setMobileShowSidebar(false); }}
                        data-testid={`live-${live.id}`}>
                        <div className="w-11 h-11 rounded-2xl bg-red-500 flex items-center justify-center flex-shrink-0">
                          <Radio className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Ao vivo agora</span>
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">{live.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {live.channelName && <span className="font-medium text-primary/70">#{live.channelName} · </span>}
                            {live.hostName} · {live.viewerCount} a assistir
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Canais */}
                <div className="space-y-0.5">
                  {channels.map(ch => {
                    const isActive = activeView?.type === "channel" && activeView.channelId === ch.id;
                    return (
                      <ChannelSwipeItem
                        key={ch.id}
                        ch={ch}
                        isActive={isActive}
                        isAdmin={isAdmin}
                        isChannelAdmin={isChannelAdminFor(ch.id)}
                        onSelect={() => goToView({ type: "channel", channelId: ch.id, channelName: ch.name })}
                        onEdit={() => setEditingChannel(ch)}
                        onDelete={() => deleteChannel(ch.id)}
                        onManageAdmins={() => setManageAdminsChannel(ch)}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* DMs */}
                <div className="space-y-0.5">
                  {dms.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Ainda sem conversas</p>
                  )}
                  {dms.map(dm => {
                    const isActive = activeView?.type === "dm" && activeView.conversationId === dm.id;
                    return (
                      <button
                        key={dm.id}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover-elevate
                          ${isActive ? "bg-primary/10 border border-primary/20" : ""}`}
                        onClick={() => goToView({ type: "dm", conversationId: dm.id, otherUserId: dm.otherUser.id, otherUserName: dm.otherUser.name })}
                        data-testid={`dm-${dm.id}`}>
                        <Avatar className="w-11 h-11 flex-shrink-0">
                          <AvatarImage src={dm.otherUser.profilePhoto ?? undefined} />
                          <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                            {dm.otherUser.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className={`text-sm font-semibold truncate ${isActive ? "text-primary" : ""}`}>
                          {dm.otherUser.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

          </div>
        </ScrollArea>

      </div>

      {/* ── Main Area ────────────────────────────────────────────── */}
      <div className={`flex-1 min-h-0 relative overflow-hidden ${mobileShowSidebar ? 'hidden md:flex' : 'flex'} flex-col`}>
        {/* Expand sidebar button — desktop only, when sidebar is collapsed */}
        {desktopSidebarCollapsed && (
          <button
            className="hidden md:flex absolute top-3 left-3 z-10 items-center gap-1.5 px-2 py-1 rounded-md bg-muted/80 hover-elevate text-muted-foreground text-xs"
            onClick={() => setDesktopSidebarCollapsed(false)}
            data-testid="button-expand-sidebar"
          >
            <PanelLeftOpen className="w-3.5 h-3.5" />
            <span>Canais</span>
          </button>
        )}
        {activeView?.type === "channel" ? (
          <ChannelChat channel={{ channelId: activeView.channelId, channelName: activeView.channelName }}
            currentUserId={user!.id} isAdmin={isAdmin} wsRef={wsRef} onBack={goBack} onStartDm={startDm} />
        ) : activeView?.type === "dm" ? (
          <DmChat conversationId={activeView.conversationId} otherUserName={activeView.otherUserName}
            currentUserId={user!.id} isAdmin={isAdmin} wsRef={wsRef} onBack={goBack} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">Seleciona um canal para começar</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateChannelDialog open={showCreateChannel} onClose={() => setShowCreateChannel(false)}
        onCreated={refetchChannels} />
      {editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          open={!!editingChannel}
          onClose={() => setEditingChannel(null)}
        />
      )}
      {manageAdminsChannel && (
        <ManageChannelAdminsModal
          channel={manageAdminsChannel}
          open={!!manageAdminsChannel}
          onClose={() => setManageAdminsChannel(null)}
        />
      )}
      <GoLiveDialog open={showGoLive} onClose={() => setShowGoLive(false)} channels={channels}
        onLive={(id) => { setActiveLiveId(id); setIsBroadcasting(true); queryClient.invalidateQueries({ queryKey: ["/api/chat/lives"] }); }} />

      {/* Full-screen live overlays */}
      {isBroadcasting && activeLiveId && user && (
        <LiveBroadcaster
          liveId={activeLiveId}
          user={{ id: user.id, name: user.name ?? "Anón", profilePhoto: user.profilePhoto }}
          wsRef={wsRef}
          onEnd={() => {
            setIsBroadcasting(false);
            setActiveLiveId(null);
            setMobileShowSidebar(true);
            queryClient.invalidateQueries({ queryKey: ["/api/chat/lives"] });
          }}
        />
      )}
      {!isBroadcasting && activeLiveId && watchingLive && user && (
        <LiveViewer
          live={watchingLive}
          user={{ id: user.id, name: user.name ?? "Anón", profilePhoto: user.profilePhoto }}
          wsRef={wsRef}
          onClose={() => { setActiveLiveId(null); setMobileShowSidebar(true); }}
        />
      )}
    </div>
  );
}
