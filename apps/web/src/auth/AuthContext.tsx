import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@sev/shared";
import { api } from "../lib/apiClient.js";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<AuthUser>;
  register(input: { name: string; email: string; password: string }): Promise<AuthUser>;
  logout(): Promise<void>;
  refreshMe(): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try {
      const { user } = await api.get("/auth/me");
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshMe();
  }, []);

  async function login(email: string, password: string) {
    const { user } = await api.post("/auth/login", { email, password });
    setUser(user);
    return user;
  }
  async function register(input: { name: string; email: string; password: string }) {
    const { user } = await api.post("/auth/register", input);
    setUser(user);
    return user;
  }
  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refreshMe }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth used outside AuthProvider");
  return c;
}
