import { DAILY_REFLECTIONS } from "@shared/dailyReflections";

export interface CheckIn {
  date: string;
  mood: string;
  entry: string;
  tags: string[];
  timestamp: number;
}

export interface RecommendedContent {
  reflection: typeof DAILY_REFLECTIONS[0];
  tips: typeof DAILY_REFLECTIONS[0][];
  reminders: typeof DAILY_REFLECTIONS[0][];
}

const MOOD_TO_KEYWORDS: Record<string, string[]> = {
  ansioso: ["ansiedade", "futuro", "medo", "preocupação", "nervoso"],
  triste: ["dor", "perda", "vazio", "saudade", "dificuldade"],
  confuso: ["incerteza", "perdido", "dúvida", "propósito", "direção"],
  vazio: ["sentido", "significado", "vácuo", "solidão", "isolado"],
  grato: ["gratidão", "paz", "aceitação", "força", "resiliente"],
  esperançoso: ["futuro", "possibilidade", "sonho", "coragem", "potencial"],
  cansado: ["repouso", "descanso", "pausa", "gentileza", "compaixão"],
  frustrado: ["aceitação", "paciência", "limite", "permissão", "liberdade"],
  criativo: ["criação", "expressão", "liberdade", "autenticidade", "fluxo"],
  amoroso: ["conexão", "vulnerabilidade", "abertura", "confiança", "presença"],
};

const ENTRY_KEYWORDS = {
  incerteza: ["não sei", "dúvida", "confuso", "perdido", "que faço"],
  relacionamento: ["amor", "namorado", "namorada", "amigo", "família", "pessoa", "relacionamento"],
  propósito: ["objetivo", "carreira", "trabalho", "sentido", "propósito", "fazer da vida"],
  identidade: ["quem sou", "minha essência", "autêntico", "identidade", "eu mesmo"],
  solidão: ["sozinho", "solitário", "solitude", "solidão", "isolado"],
  crescimento: ["aprender", "evoluir", "mudar", "crescer", "melhorar"],
  medo: ["medo", "assustado", "nervoso", "preocupado", "ansiedade"],
  aceitação: ["aceitar", "permissão", "tudo bem", "deixar ir", "soltar"],
  força: ["forte", "consegui", "superei", "venci", "resiliente"],
};

function getDaySeed(): number {
  const today = new Date().toISOString().split('T')[0];
  let seed = 0;
  for (let i = 0; i < today.length; i++) {
    seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0;
  }
  return Math.abs(seed);
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = ((s * 1103515245 + 12345) & 0x7fffffff);
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function analyzeCheckIn(mood: string, entry: string): string[] {
  const detectedTags = new Set<string>();
  const lowerEntry = entry.toLowerCase();

  const moodKeywords = MOOD_TO_KEYWORDS[mood.toLowerCase()] || [];
  moodKeywords.forEach(keyword => {
    if (lowerEntry.includes(keyword)) {
      detectedTags.add(keyword);
    }
  });

  Object.entries(ENTRY_KEYWORDS).forEach(([tag, keywords]) => {
    if (keywords.some(keyword => lowerEntry.includes(keyword))) {
      detectedTags.add(tag);
    }
  });

  if (detectedTags.size === 0) {
    detectedTags.add(mood.toLowerCase());
  }

  return Array.from(detectedTags).slice(0, 5);
}

export function recommendContent(lastCheckIn: CheckIn | null): RecommendedContent {
  if (!lastCheckIn) {
    return getDefaultRecommendations();
  }

  const { mood, tags } = lastCheckIn;
  const reflection = findRelevantReflection(tags, mood);
  const tips = findRelevantTips(tags, mood);
  const reminders = findRelevantReminders(tags, mood);

  return {
    reflection,
    tips: tips.slice(0, 2),
    reminders: reminders.slice(0, 3),
  };
}

function findRelevantReflection(
  tags: string[],
  mood: string
): typeof DAILY_REFLECTIONS[0] {
  const keywords = [
    ...tags,
    mood.toLowerCase(),
    ...(MOOD_TO_KEYWORDS[mood.toLowerCase()] || []),
  ];

  const reflections = DAILY_REFLECTIONS.filter(r => r.type === "reflection");
  const scored = reflections.map(reflection => {
    let score = 0;
    const textLower = reflection.text.toLowerCase();

    keywords.forEach(keyword => {
      if (textLower.includes(keyword)) score += 2;
    });

    return { reflection, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0]?.score || 0;
  const topCandidates = scored.filter(s => s.score >= topScore - 1 && s.score > 0);

  if (topCandidates.length > 0) {
    const daySeed = getDaySeed();
    const shuffled = shuffleWithSeed(topCandidates, daySeed);
    return shuffled[0].reflection;
  }

  const daySeed = getDaySeed();
  const index = daySeed % reflections.length;
  return reflections[index];
}

function findRelevantTips(tags: string[], mood: string): typeof DAILY_REFLECTIONS[0][] {
  const keywords = [...tags, mood.toLowerCase()];
  const tips = DAILY_REFLECTIONS.filter((item) => item.type === "tip");
  const daySeed = getDaySeed();

  const scored = tips.map((tip) => {
    let score = 0;
    const textLower = tip.text.toLowerCase();

    keywords.forEach((keyword) => {
      if (textLower.includes(keyword)) score += 2;
    });

    if (
      textLower.includes("respir") ||
      textLower.includes("medit") ||
      textLower.includes("pausa") ||
      textLower.includes("movimento") ||
      textLower.includes("criar")
    ) {
      score += 1;
    }

    return { ...tip, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0]?.score || 0;
  const topCandidates = scored.filter(s => s.score >= topScore - 2 && s.score > 0);

  if (topCandidates.length > 2) {
    const shuffled = shuffleWithSeed(topCandidates, daySeed);
    return shuffled.slice(0, 5).map(({ score, ...rest }) => rest);
  }

  return scored.slice(0, 5).map(({ score, ...rest }) => rest);
}

function findRelevantReminders(
  tags: string[],
  mood: string
): typeof DAILY_REFLECTIONS[0][] {
  const keywords = [...tags, mood.toLowerCase()];
  const daySeed = getDaySeed();

  const scored = DAILY_REFLECTIONS.filter((item) => item.type === "reminder").map(
    (reminder) => {
      let score = 0;
      const textLower = reminder.text.toLowerCase();

      keywords.forEach((keyword) => {
        if (textLower.includes(keyword)) score += 2;
      });

      if (
        textLower.includes("merec") ||
        textLower.includes("permiss") ||
        textLower.includes("autorizado") ||
        textLower.includes("está tudo bem")
      ) {
        score += 1;
      }

      if (
        textLower.includes("sobreviveu") ||
        textLower.includes("mais forte") ||
        textLower.includes("resistente")
      ) {
        score += 1;
      }

      return { ...reminder, score };
    }
  );

  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0]?.score || 0;
  const topCandidates = scored.filter(s => s.score >= topScore - 2 && s.score > 0);

  if (topCandidates.length > 3) {
    const shuffled = shuffleWithSeed(topCandidates, daySeed);
    return shuffled.slice(0, 5).map(({ score, ...rest }) => rest);
  }

  return scored.slice(0, 5).map(({ score, ...rest }) => rest);
}

function getDefaultRecommendations(): RecommendedContent {
  const daySeed = getDaySeed();
  const reflections = DAILY_REFLECTIONS.filter((r) => r.type === "reflection" && r.fromBook);
  const tips = DAILY_REFLECTIONS.filter((r) => r.type === "tip");
  const reminders = DAILY_REFLECTIONS.filter((r) => r.type === "reminder");

  const reflectionIndex = daySeed % reflections.length;
  const shuffledTips = shuffleWithSeed(tips, daySeed);
  const shuffledReminders = shuffleWithSeed(reminders, daySeed);

  return {
    reflection: reflections[reflectionIndex] || DAILY_REFLECTIONS[0],
    tips: shuffledTips.slice(0, 2),
    reminders: shuffledReminders.slice(0, 3),
  };
}

export function getLastCheckIn(): CheckIn | null {
  const stored = localStorage.getItem("casa-dos-20-last-checkin");
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    
    const checkInDate = new Date(parsed.timestamp);
    const today = new Date();
    
    if (
      checkInDate.getFullYear() === today.getFullYear() &&
      checkInDate.getMonth() === today.getMonth() &&
      checkInDate.getDate() === today.getDate()
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function saveCheckIn(mood: string, entry: string): CheckIn {
  const now = new Date();
  const tags = analyzeCheckIn(mood, entry);

  const checkIn: CheckIn = {
    date: now.toLocaleDateString("pt-BR"),
    mood,
    entry,
    tags,
    timestamp: now.getTime(),
  };

  localStorage.setItem("casa-dos-20-last-checkin", JSON.stringify(checkIn));
  return checkIn;
}
