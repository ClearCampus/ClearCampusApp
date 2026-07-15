import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService } from "./authService";
import type { Session, SignupParams, UserRole } from "./types";

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Session>;
  signup: (params: SignupParams) => Promise<Session>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Re-exported so components never need to import from lib/auth/types directly.
export type { UserRole };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(authService.getSession());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await authService.login({ email, password });
    setSession(next);
    return next;
  }, []);

  const signup = useCallback(async (params: SignupParams) => {
    const next = await authService.signup(params);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
