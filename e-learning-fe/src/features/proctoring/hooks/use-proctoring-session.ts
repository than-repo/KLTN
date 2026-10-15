"use client";

import { useCallback, useState } from "react";

import type {
  ProctoringSession,
  ProctoringSessionStatus,
} from "../types/proctoring";

export function useProctoringSession() {
  const [session, setSession] = useState<ProctoringSession | null>(null);
  const [status, setStatus] = useState<ProctoringSessionStatus>("idle");

  const [error, setError] = useState<string | null>(null);

  const beginStarting = useCallback(() => {
    setStatus("starting");
    setError(null);
  }, []);

  const activateSession = useCallback((nextSession: ProctoringSession) => {
    setSession(nextSession);
    setStatus("active");
    setError(null);
  }, []);

  const interruptSession = useCallback((message?: string) => {
    setStatus("interrupted");

    if (message) {
      setError(message);
    }
  }, []);

  const failSession = useCallback((message: string) => {
    setStatus("error");
    setError(message);
  }, []);

  const endSession = useCallback(() => {
    setSession((current) => {
      if (!current) {
        return null;
      }

      return {
        ...current,
        status: "ended",
        connectionStatus: "disconnected",
        endedAt: new Date().toISOString(),
      };
    });

    setStatus("ended");
  }, []);

  const resetSession = useCallback(() => {
    setSession(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    session,
    status,
    error,

    beginStarting,
    activateSession,
    interruptSession,
    failSession,
    endSession,
    resetSession,
  };
}
