import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  affiliation: string | null;
  orgUnitDN: string | null;
  memberOf: string[];
  dbUser: {
    id: string;
    isActive: boolean;
    createdAt: string;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
      if (res.status === 401) {
        setUser(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUser((await res.json()) as AuthUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { logoutUrl?: string } | null;
      if (data?.logoutUrl) {
        window.location.href = data.logoutUrl;
        return;
      }
    } catch {
      // fall through to manual redirect
    }
    window.location.href = `${API_BASE}/Shibboleth.sso/Logout`;
  };

  useEffect(() => {
    void fetchMe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refetch: fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
