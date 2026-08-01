import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type {
  LoginParams,
  Session,
  SessionUser,
  SignupParams,
  UserRole,
} from "./types";

const SESSION_COOKIE = "cc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeMs: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${Math.floor(maxAgeMs / 1000)}; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

async function verifyWithBackend(token: string, fallbackName: string, claimClubId?: string): Promise<SessionUser> {
  const res = await fetch("/api/auth/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: claimClubId ? JSON.stringify({ claim_club_id: claimClubId }) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Verification with backend failed.");
  }

  const profile = await res.json();
  const role: UserRole = profile.role === "owner" ? "club" : "student";
  
  if (role === "club") {
    return {
      id: profile.uid,
      email: profile.email,
      name: fallbackName || profile.email.split("@")[0],
      role: "club",
      clubSlug: profile.owned_clubs?.[0] || "",
    };
  } else {
    return {
      id: profile.uid,
      email: profile.email,
      name: fallbackName || profile.email.split("@")[0],
      role: "student",
    };
  }
}

export const authService = {
  async login({ email, password }: LoginParams): Promise<Session> {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
      
      const sessionUser = await verifyWithBackend(token, "");
      
      const session: Session = {
        accessToken: token,
        refreshToken: user.refreshToken,
        user: sessionUser,
        expiresAt: Date.now() + SESSION_TTL_MS,
      };

      writeCookie(SESSION_COOKIE, JSON.stringify(session), SESSION_TTL_MS);
      return session;
    } catch (err: any) {
      console.error("Firebase/Backend Login error:", err);
      throw new Error(err.message || "Failed to log in.");
    }
  },

  async signup({ email, password, name, clubSlug }: SignupParams): Promise<Session> {
    if (!email || !password || !name) {
      throw new Error("Name, email, and password are required.");
    }

    let user: any = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      const token = await user.getIdToken();

      const sessionUser = await verifyWithBackend(token, name, clubSlug);

      const session: Session = {
        accessToken: token,
        refreshToken: user.refreshToken,
        user: sessionUser,
        expiresAt: Date.now() + SESSION_TTL_MS,
      };

      writeCookie(SESSION_COOKIE, JSON.stringify(session), SESSION_TTL_MS);
      return session;
    } catch (err: any) {
      console.error("Firebase/Backend Signup error:", err);
      if (user) {
        try {
          await user.delete();
          console.log("Cleaned up Firebase user account after backend verification failure.");
        } catch (deleteErr) {
          console.error("Failed to delete Firebase user account during cleanup:", deleteErr);
        }
      }
      throw new Error(err.message || "Failed to sign up.");
    }
  },

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase signout error:", err);
    }
    clearCookie(SESSION_COOKIE);
  },

  getSession(): Session | null {
    const raw = readCookie(SESSION_COOKIE);
    if (!raw) return null;
    try {
      const session: Session = JSON.parse(raw);
      if (session.expiresAt < Date.now()) {
        clearCookie(SESSION_COOKIE);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  async refresh(): Promise<Session | null> {
    const session = authService.getSession();
    if (!session) return null;
    
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken(true);
        const nextUser = await verifyWithBackend(token, session.user.name);
        const nextSession: Session = {
          accessToken: token,
          refreshToken: user.refreshToken,
          user: nextUser,
          expiresAt: Date.now() + SESSION_TTL_MS,
        };
        writeCookie(SESSION_COOKIE, JSON.stringify(nextSession), SESSION_TTL_MS);
        return nextSession;
      } catch (e) {
        console.error("Token refresh failed:", e);
        return null;
      }
    }
    return null;
  },
};
