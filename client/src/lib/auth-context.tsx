import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "./api";
import { useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "editor";
  status: string;
}

interface AuthProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me()
      .then(({ user, profile }) => {
        setUser(user);
        setProfile(profile);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { user, profile } = await api.auth.login(email, password);
    setUser(user);
    setProfile(profile);
    queryClient.invalidateQueries();
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    setProfile(null);
    queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
