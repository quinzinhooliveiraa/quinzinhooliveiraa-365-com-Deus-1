export type ShareImageTheme = "dark" | "light";
export type ShareImageType = "reflection" | "question" | "reminder";

interface ShareImageOptions {
  text: string;
  theme?: ShareImageTheme;
  type?: ShareImageType;
}

export function renderShareImageToCanvas(canvas: HTMLCanvasElement, { text, theme = "dark", type = "reflection" }: ShareImageOptions) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 1080;

  const isDark = theme === "dark";
  const bg = isDark ? "#1a1410" : "#f5f0e8";
  const textColor = isDark ? "#f0ebe3" : "#1a1410";
  const accent = isDark ? "rgba(196, 164, 120, 0.5)" : "rgba(120, 90, 50, 0.4)";
  const accentStrong = isDark ? "rgba(196, 164, 120, 0.9)" : "rgba(100, 70, 30, 0.85)";
  const accentSoft = isDark ? "rgba(196, 164, 120, 0.5)" : "rgba(120, 90, 50, 0.5)";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";

  const cx = w / 2;
  ctx.fillStyle = accent;
  const starY = 180 * scale;
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(cx, starY);
    ctx.lineTo(cx + Math.cos(angle) * 28 * scale, starY + Math.sin(angle) * 28 * scale);
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = accent;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx + 20 * scale, starY - 20 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = `italic ${46 * scale}px Georgia, serif`;
  const maxWidth = 820 * scale;
  const lineHeight = 66 * scale;
  const quoteText = type === "question" ? text : `"${text}"`;
  const words = quoteText.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  if (line.trim()) lines.push(line.trim());

  const totalH = lines.length * lineHeight;
  let y = (h - totalH) / 2 + 40 * scale;
  for (const l of lines) {
    ctx.fillText(l, cx, y);
    y += lineHeight;
  }

  const brandY = h - 150 * scale;
  ctx.fillStyle = accentSoft;
  ctx.fillRect(cx - 40 * scale, brandY - 30 * scale, 80 * scale, 1 * scale);

  ctx.fillStyle = accentStrong;
  ctx.font = `600 ${18 * scale}px sans-serif`;
  ctx.letterSpacing = `${6 * scale}px`;
  ctx.fillText("CASA DOS 20", cx, brandY);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = accentSoft;
  ctx.font = `italic ${16 * scale}px Georgia, serif`;
  const subtitle = type === "question"
    ? "Pergunta do App"
    : "Reflexões para a Vida Adulta";
  ctx.fillText(subtitle, cx, brandY + 30 * scale);
}

export async function generateShareImage(options: ShareImageOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  renderShareImageToCanvas(canvas, options);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

  if (blob && navigator.share && navigator.canShare) {
    const file = new File([blob], `casa-dos-20-${new Date().toISOString().split("T")[0]}.png`, { type: "image/png" });
    const shareData = { files: [file], title: "365 Encontros com Deus Pai" };
    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `casa-dos-20-${new Date().toISOString().split("T")[0]}.png`;
  link.click();
}
