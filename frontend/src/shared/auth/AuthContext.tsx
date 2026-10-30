import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, errorMessage } from "../api";
import type { Domain } from "../domains";
import { removeKey } from "../utils/storage";

// Real accounts via the backend (/api/auth). Passwords are checked and hashed on the server;
// the session is an httpOnly cookie the browser sends automatically, so nothing sensitive is stored here.

export interface User {
  email: string;
  fullName: string;
  organization: string;
  domain: Domain;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  organization: string;
  domain: Domain;
}

type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthApi {
  user: User | null;
  /** False until the saved session has been checked with the server on page load. */
  ready: boolean;
  login: (email: string, password: string, domain: Domain, remember: boolean) => Promise<AuthResult>;
  register: (input: RegisterInput, remember: boolean) => Promise<AuthResult>;
  logout: () => void;
}

// Keys left behind by the old browser-only demo accounts.
const LEGACY_KEYS = ["ls.mockAccounts", "ls.session"];

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    for (const key of LEGACY_KEYS) {
      removeKey(localStorage, key);
      removeKey(sessionStorage, key);
    }
    let cancelled = false;
    api<User>("/auth/me")
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && setUser(null)) // not signed in, or the server is down — either way, show sign-in
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, domain: Domain, remember: boolean): Promise<AuthResult> => {
    try {
      setUser(await api<User>("/auth/login", { method: "POST", body: { email: email.trim(), password, domain, remember } }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const register = useCallback(async (input: RegisterInput, remember: boolean): Promise<AuthResult> => {
    try {
      const body = { ...input, email: input.email.trim(), fullName: input.fullName.trim(), organization: input.organization.trim(), remember };
      setUser(await api<User>("/auth/register", { method: "POST", body }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Best effort: if the server can't be reached the cookie simply expires on its own.
    api("/auth/logout", { method: "POST" }).catch(() => undefined);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
