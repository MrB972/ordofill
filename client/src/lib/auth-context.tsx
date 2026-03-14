import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { getQueryFn } from "./queryClient";
import type { Profile } from "@shared/schema";

interface AuthContextValue {
  user: Profile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<Profile | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, fullName }: { email: string; fullName: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { email, fullName });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const login = async (email: string, _password: string) => {
    const result = await loginMutation.mutateAsync({ email });
    // Ensure the query cache is updated synchronously before returning
    queryClient.setQueryData(["/api/auth/me"], result);
  };

  const register = async (email: string, _password: string, fullName: string) => {
    const result = await registerMutation.mutateAsync({ email, fullName });
    queryClient.setQueryData(["/api/auth/me"], result);
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.setQueryData(["/api/auth/me"], null);
    // Clear all cached data
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
