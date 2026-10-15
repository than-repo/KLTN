"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type QuizTimerProps = {
  remainingSeconds?: number | null;
  disabled?: boolean;
  autoStart?: boolean;
  warningThresholdSeconds?: number;
  onTick?: (remainingSeconds: number) => void;
  onExpire?: () => void;
  className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDuration(seconds?: number | null) {
  if (seconds === undefined || seconds === null) {
    return "No time limit";
  }

  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

export function QuizTimer({
  autoStart = true,
  className,
  disabled = false,
  onExpire,
  onTick,
  remainingSeconds,
  warningThresholdSeconds = 300,
}: QuizTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    remainingSeconds ?? null,
  );

  const expiredRef = useRef(false);

  const hasTimeLimit = secondsLeft !== null;
  const isExpired = secondsLeft === 0;
  const isWarning =
    secondsLeft !== null &&
    secondsLeft > 0 &&
    secondsLeft <= warningThresholdSeconds;

  const label = useMemo(() => {
    return formatDuration(secondsLeft);
  }, [secondsLeft]);

  useEffect(() => {
    setSecondsLeft(remainingSeconds ?? null);
    expiredRef.current = false;
  }, [remainingSeconds]);

  useEffect(() => {
    if (!autoStart || disabled || secondsLeft === null || secondsLeft <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds === null) {
          return null;
        }

        return Math.max(0, currentSeconds - 1);
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [autoStart, disabled, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === null) {
      return;
    }

    onTick?.(secondsLeft);

    if (secondsLeft === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [onExpire, onTick, secondsLeft]);

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isExpired || isWarning
          ? "border-danger/20 bg-danger/5"
          : "border-border bg-background",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Time remaining
      </p>

      <p
        className={cn(
          "mt-1 text-lg font-bold",
          isExpired || isWarning ? "text-danger" : "text-foreground",
        )}
      >
        {label}
      </p>

      {hasTimeLimit && isWarning && !isExpired ? (
        <p className="mt-2 text-xs leading-5 text-danger">
          Less than {Math.ceil(warningThresholdSeconds / 60)} minutes left.
        </p>
      ) : null}

      {isExpired ? (
        <p className="mt-2 text-xs leading-5 text-danger">
          Time is up. Your quiz will be submitted.
        </p>
      ) : null}
    </div>
  );
}
