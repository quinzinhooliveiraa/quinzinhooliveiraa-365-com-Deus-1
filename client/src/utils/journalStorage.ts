export interface JournalEntry {
  id: string;
  date: string;
  timestamp: number;
  text: string;
  tags: string[];
  mood?: string;
}

export function getAllEntries(): JournalEntry[] {
  try {
    const stored = localStorage.getItem("casa-dos-20-entries");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveEntry(text: string, tags: string[], mood?: string): JournalEntry {
  const now = new Date();
  const entries = getAllEntries();
  
  const entry: JournalEntry = {
    id: `entry-${Date.now()}`,
    date: now.toLocaleDateString("pt-BR"),
    timestamp: now.getTime(),
    text,
    tags,
    mood,
  };
  
  entries.push(entry);
  localStorage.setItem("casa-dos-20-entries", JSON.stringify(entries));
  return entry;
}

export function updateEntry(id: string, text: string, tags: string[]): JournalEntry | null {
  const entries = getAllEntries();
  const index = entries.findIndex(e => e.id === id);
  
  if (index === -1) return null;
  
  entries[index] = {
    ...entries[index],
    text,
    tags,
  };
  
  localStorage.setItem("casa-dos-20-entries", JSON.stringify(entries));
  return entries[index];
}

export function deleteEntry(id: string): boolean {
  const entries = getAllEntries();
  const filtered = entries.filter(e => e.id !== id);
  localStorage.setItem("casa-dos-20-entries", JSON.stringify(filtered));
  return filtered.length < entries.length;
}

export function getEntriesByTag(tag: string): JournalEntry[] {
  const entries = getAllEntries();
  if (tag === "Todas") return entries;
  return entries.filter(e => e.tags.includes(tag));
}

export function shareEntry(entry: JournalEntry, platform: string): string {
  const text = `"${entry.text}"\n\n— 365 Encontros com Deus Pai (@jundate)`;
  
  switch (platform) {
    case "substack":
      return `https://substack.com/create-post?body=${encodeURIComponent(text)}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    case "instagram":
      // Instagram doesn't have a direct web share, so we copy to clipboard and suggest app
      return "instagram";
    default:
      return "";
  }
}
