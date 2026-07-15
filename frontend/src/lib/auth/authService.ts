import { randomId } from "../id";
import type {
  LoginParams,
  Session,
  SessionUser,
  SignupParams,
  UserRole,
} from "./types";

/**
 * Mock auth backend — the ONLY file in the app that touches cookies or
 * knows how a session is stored.
 *
 * Every exported function here has the shape a real backend call would
 * have (async, throws on failure, returns/reads a `Session`). When a real
 * API exists, swap the bodies for `fetch("/api/auth/...", { credentials:
 * "include" })` calls that let the server set a real httpOnly cookie —
 * nothing outside this file (AuthContext, pages, components) should need
 * to change.
 *
 * A browser can't set an httpOnly cookie from client JS, so today the
 * "server-side cookie" is simulated with a plain, readable cookie holding
 * a session id. The mock "user directory" below stands in for a real
 * users table and should be deleted entirely once a backend exists.
 */

const SESSION_COOKIE = "cc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days — mirrors a refresh-token lifetime
const USER_DIRECTORY_KEY = "cc_mock_user_directory";

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

interface DirectoryEntry {
  name: string;
  role: UserRole;
  clubSlug?: string;
}

function readDirectory(): Record<string, DirectoryEntry> {
  try {
    return JSON.parse(localStorage.getItem(USER_DIRECTORY_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeDirectory(directory: Record<string, DirectoryEntry>) {
  localStorage.setItem(USER_DIRECTORY_KEY, JSON.stringify(directory));
}

function persistSession(user: SessionUser): Session {
  const session: Session = {
    accessToken: randomId("access"),
    refreshToken: randomId("refresh"),
    user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  writeCookie(SESSION_COOKIE, JSON.stringify(session), SESSION_TTL_MS);
  return session;
}

export const authService = {
  async login({ email, password }: LoginParams): Promise<Session> {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const directory = readDirectory();
    const existing = directory[email];

    const user: SessionUser = existing
      ? existing.role === "club"
        ? { id: randomId("user"), role: "club", email, name: existing.name, clubSlug: existing.clubSlug! }
        : { id: randomId("user"), role: "student", email, name: existing.name }
      : { id: randomId("user"), role: "student", email, name: email.split("@")[0] };

    if (!existing) {
      directory[email] = { name: user.name, role: "student" };
      writeDirectory(directory);
    }

    return persistSession(user);
  },

  async signup({ email, password, name, role, clubSlug }: SignupParams): Promise<Session> {
    if (!email || !password || !name) {
      throw new Error("Name, email, and password are required.");
    }
    if (role === "club" && !clubSlug) {
      throw new Error("Select the club you're claiming.");
    }

    const directory = readDirectory();
    directory[email] = { name, role, clubSlug };
    writeDirectory(directory);

    const user: SessionUser =
      role === "club"
        ? { id: randomId("user"), role: "club", email, name, clubSlug: clubSlug! }
        : { id: randomId("user"), role: "student", email, name };

    return persistSession(user);
  },

  async logout(): Promise<void> {
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

  /** Simulates exchanging a refresh token for a new access token. */
  async refresh(): Promise<Session | null> {
    const session = authService.getSession();
    if (!session) return null;
    return persistSession(session.user);
  },
};
