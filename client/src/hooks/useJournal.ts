import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { JournalEntry } from "@shared/schema";

export function useJournalEntries(tag?: string) {
  const queryKey = tag && tag !== "Todas"
    ? ["/api/journal", `?tag=${encodeURIComponent(tag)}`]
    : ["/api/journal"];

  return useQuery<JournalEntry[]>({
    queryKey,
    queryFn: async () => {
      const url = tag && tag !== "Todas"
        ? `/api/journal?tag=${encodeURIComponent(tag)}`
        : "/api/journal";
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Erro ao buscar entradas");
      return res.json();
    },
    staleTime: 30000,
  });
}

export function useCreateEntry() {
  return useMutation({
    mutationFn: async (data: { text: string; tags: string[]; mood?: string; date?: string }) => {
      const res = await apiRequest("POST", "/api/journal", data);
      return res.json() as Promise<JournalEntry>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
    },
  });
}

export function useUpdateEntry() {
  return useMutation({
    mutationFn: async ({ id, text, tags }: { id: number; text: string; tags: string[] }) => {
      const res = await apiRequest("PATCH", `/api/journal/${id}`, { text, tags });
      return res.json() as Promise<JournalEntry>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
    },
  });
}

export function useDeleteEntry() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/journal/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
    },
  });
}
