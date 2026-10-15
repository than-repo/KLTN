"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  useRef,
} from "react";

import * as authApi from "@/features/auth/api/auth-api";
import type {
  AuthUser,
  CurrentUser,
  LoginInput,
  RegisterInput,
  UserRole,
} from "@/features/auth/types/auth";

export type AuthStatus = "authenticated" | "guest" | "loading";

export type AuthContextValue = {
  accessToken: string | null;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  register: (input: RegisterInput) => Promise<void>;
  replaceAccessToken: (nextAccessToken: string) => void;
  status: AuthStatus;
  updateUser: (nextUser: Partial<CurrentUser>) => void;
  user: CurrentUser | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

const sessionCheckTimeoutMs = 5000;

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Authentication failed.";
}

function isAllowedRole(role: string): role is UserRole {
  return ["LEARNER", "INSTRUCTOR", "REVIEWER", "ADMIN"].includes(role);
}

function normalizeUser(user: CurrentUser): CurrentUser {
  return {
    ...user,
    role: isAllowedRole(user.role) ? user.role : "LEARNER",
  };
}

function withSessionTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Session check timed out."));
    }, sessionCheckTimeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const sessionVersion = useRef(0);
  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("guest");
  }, []);
  const setAuthenticatedSession = useCallback(
    async (
      nextAccessToken: string,
      fallbackUser: AuthUser,
      version: number,
    ): Promise<boolean> => {
      if (version !== sessionVersion.current) return false;

      let nextUser: CurrentUser;

      try {
        nextUser = await withSessionTimeout(
          authApi.getCurrentUser(nextAccessToken),
        );
      } catch {
        // Preserves your existing fallback behavior.
        nextUser = fallbackUser;
      }

      // Another operation may have started while we were waiting.
      if (version !== sessionVersion.current) return false;

      setAccessToken(nextAccessToken);
      setUser(normalizeUser(nextUser));
      setStatus("authenticated");
      setError(null);

      return true;
    },
    [],
  );

  const replaceAccessToken = useCallback((nextAccessToken: string) => {
    setAccessToken(nextAccessToken);
    setStatus("authenticated");
    setError(null);
  }, []);

  const updateUser = useCallback((nextUser: Partial<CurrentUser>) => {
    setUser((prevUser) => {
      if (!prevUser) {
        return prevUser;
      }
      return normalizeUser({
        ...prevUser,
        ...nextUser,
      });
    });
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const version = ++sessionVersion.current;

    try {
      const result = await withSessionTimeout(authApi.refreshSession());

      return await setAuthenticatedSession(
        result.accessToken,
        result.user,
        version,
      );
    } catch {
      // An old failure must not clear a newer session.
      if (version !== sessionVersion.current) return false;

      clearSession();
      return false;
    }
  }, [clearSession, setAuthenticatedSession]);

  useEffect(() => {
    void refresh();

    return () => {
      sessionVersion.current += 1;
    };
  }, [refresh]);

  const login = useCallback(
    async (input: LoginInput) => {
      const version = ++sessionVersion.current;
      setError(null);

      try {
        const result = await authApi.login(input);

        const applied = await setAuthenticatedSession(
          result.accessToken,
          result.user,
          version,
        );

        if (!applied) {
          throw new Error("Login was superseded by another session operation.");
        }
      } catch (loginError) {
        const message = getMessage(loginError);

        if (version === sessionVersion.current) {
          setError(message);
        }

        throw new Error(message);
      }
    },
    [setAuthenticatedSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const version = ++sessionVersion.current;
      setError(null);

      try {
        const result = await authApi.register(input);

        const applied = await setAuthenticatedSession(
          result.accessToken,
          result.user,
          version,
        );

        if (!applied) {
          throw new Error(
            "Registration session was superseded by another operation.",
          );
        }
      } catch (registerError) {
        const message = getMessage(registerError);

        if (version === sessionVersion.current) {
          setError(message);
        }

        throw new Error(message);
      }
    },
    [setAuthenticatedSession],
  );

  const logout = useCallback(async () => {
    sessionVersion.current += 1;

    clearSession();
    setError(null);

    await withSessionTimeout(authApi.logout());
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      error,
      login,
      logout,
      refresh,
      register,
      replaceAccessToken,
      status,
      updateUser,
      user,
    }),
    [
      accessToken,
      error,
      login,
      logout,
      refresh,
      register,
      replaceAccessToken,
      status,
      updateUser,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
