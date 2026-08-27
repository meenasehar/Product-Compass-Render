import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface AuthContextValue {
  user: GoogleUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
});

const DEV_USER: GoogleUser = {
  email: 'dev@paloaltonetworks.com',
  name: 'Dev User',
  picture: '',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
  const devMode = !base;

  const [user, setUser] = useState<GoogleUser | null>(devMode ? DEV_USER : null);
  const [loading, setLoading] = useState(!devMode);

  useEffect(() => {
    if (devMode) return;
    fetch(`${base}/auth/me`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then((u: GoogleUser | null) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [base, devMode]);

  const logout = async () => {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
    await fetch(`${base}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
