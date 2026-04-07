import { useCallback } from "react";

export function useTrack() {
  const track = useCallback((event: string, metadata?: Record<string, unknown>) => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ event, metadata }),
    }).catch(() => {});
  }, []);

  return track;
}
