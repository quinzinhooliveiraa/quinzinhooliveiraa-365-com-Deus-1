import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { BookOpen, Hash, Calendar, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharedData {
  text: string;
  tags: string[];
  date: string;
  authorName: string;
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];

  lines.forEach((line, i) => {
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      elements.push(
        <figure key={i} className="my-4">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || "Imagem da reflexão"}
            className="w-full rounded-xl object-cover max-h-[500px]"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {imgMatch[1] && (
            <figcaption className="text-xs text-muted-foreground text-center mt-2">{imgMatch[1]}</figcaption>
          )}
        </figure>
      );
      return;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-serif font-semibold text-foreground mt-6 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-serif font-bold text-foreground mt-6 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-2xl font-serif font-bold text-foreground mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-3">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 text-foreground/90 leading-relaxed list-disc">{line.slice(2)}</li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-3" />);
    } else {
      const formatted = line
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline-block max-h-64 rounded-lg my-1" loading="lazy" />')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2">$1</a>')
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      elements.push(
        <p key={i} className="text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }
  });

  return elements;
}

export default function SharedEntry() {
  const [, params] = useRoute("/shared/:slug");
  const slug = params?.slug;
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/shared/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <BookOpen className="text-primary" size={32} />
          <span className="text-muted-foreground text-sm">Carregando reflexão…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <BookOpen className="text-muted-foreground mx-auto mb-4" size={48} />
          <h1 className="text-xl font-serif text-foreground mb-2">Reflexão não encontrada</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Este link pode ter expirado ou sido removido pelo autor.
          </p>
          <a href="/">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft size={16} className="mr-2" />
              Ir para 365 Encontros
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
        <header className="mb-8 pb-6 border-b border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <a href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
              <Sparkles size={20} />
              <span className="font-serif font-semibold text-sm">365 Encontros</span>
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar size={14} />
            <span>{formatDate(data.date)}</span>
            <span className="mx-1">·</span>
            <span>por {data.authorName}</span>
          </div>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium max-w-[160px] truncate">
                  <Hash size={10} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <article className="prose-like space-y-1">
          {renderMarkdown(data.text)}
        </article>

        <footer className="mt-12 pt-6 border-t border-border/30 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Reflexão escrita na 365 Encontros com Deus Pai — um devocional diário para aprofundar a sua fé.
          </p>
          <a href="/">
            <Button className="rounded-xl bg-primary text-primary-foreground">
              Conhecer o App
            </Button>
          </a>
        </footer>
      </div>
    </div>
  );
}