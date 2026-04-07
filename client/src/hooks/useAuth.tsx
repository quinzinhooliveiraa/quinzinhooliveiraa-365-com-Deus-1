import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  profilePhoto: string | null;
  hasPremium: boolean;
  premiumReason: "admin" | "paid" | "granted" | "trial" | "expired" | "blocked";
  trialEndsAt: string | null;
  premiumUntil: string | null;
  isActive: boolean;
  emailVerified: boolean;
  journeyOnboardingDone: boolean;
  journeyOrder: string[];
  trialBonusClaimed: boolean;
  isMasterAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (credential: string) => Promise<AuthUser>;
  loginWithApple: (identityToken: string, user?: string, fullName?: { givenName?: string; familyName?: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async ({ credential }: { credential: string }) => {
      const res = await apiRequest("POST", "/api/auth/google", { credential });
      return res.json() as Promise<AuthUser & { isNewUser?: boolean }>;
    },
    onSuccess: (data) => {
      if (data.isNewUser) {
        localStorage.setItem("casa-dos-20-needs-onboarding", "true");
      }
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const appleLoginMutation = useMutation({
    mutationFn: async ({ identityToken, user, fullName }: { identityToken: string; user?: string; fullName?: { givenName?: string; familyName?: string } }) => {
      const res = await apiRequest("POST", "/api/auth/apple", { identityToken, user, fullName });
      return res.json() as Promise<AuthUser & { isNewUser?: boolean }>;
    },
    onSuccess: (data) => {
      if (data.isNewUser) {
        localStorage.setItem("casa-dos-20-needs-onboarding", "true");
      }
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  };

  const register = async (name: string, email: string, password: string) => {
    return registerMutation.mutateAsync({ name, email, password });
  };

  const loginWithGoogle = async (credential: string) => {
    return googleLoginMutation.mutateAsync({ credential });
  };

  const loginWithApple = async (identityToken: string, user?: string, fullName?: { givenName?: string; familyName?: string }) => {
    return appleLoginMutation.mutateAsync({ identityToken, user, fullName });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refetchUser = () => {
    refetch();
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, register, loginWithGoogle, loginWithApple, logout, refetch: refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
