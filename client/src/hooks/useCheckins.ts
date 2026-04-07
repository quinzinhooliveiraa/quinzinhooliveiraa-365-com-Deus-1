import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MoodCheckin } from "@shared/schema";

export function useCheckins() {
  return useQuery<MoodCheckin[]>({
    queryKey: ["/api/checkins"],
    queryFn: async () => {
      const res = await fetch("/api/checkins", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Erro ao buscar check-ins");
      return res.json();
    },
    staleTime: 30000,
  });
}

export function useLatestCheckin() {
  return useQuery<MoodCheckin | null>({
    queryKey: ["/api/checkins/latest"],
    queryFn: async () => {
      const res = await fetch("/api/checkins/latest", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Erro ao buscar check-in");
      return res.json();
    },
    staleTime: 30000,
  });
}

export function useCreateCheckin() {
  return useMutation({
    mutationFn: async (data: { mood: string; entry: string; tags: string[]; date?: string }) => {
      const res = await apiRequest("POST", "/api/checkins", data);
      return res.json() as Promise<MoodCheckin>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
    },
  });
}
