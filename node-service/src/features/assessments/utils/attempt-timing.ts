export interface AttemptTiming {
  startedAt: Date;
  timeLimitMinutes: number | null;
  availableUntil?: Date | null;
  now: Date;
}

export function getAttemptDeadline(
  startedAt: Date,
  timeLimitMinutes: number | null,
  availableUntil: Date | null = null,
): Date | null {
  const timerDeadline =
    timeLimitMinutes === null
      ? null
      : new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
  if (!timerDeadline) return availableUntil;
  if (!availableUntil) return timerDeadline;
  return new Date(Math.min(timerDeadline.getTime(), availableUntil.getTime()));
}

export function isAttemptExpired(timing: AttemptTiming): boolean {
  const deadline = getAttemptDeadline(
    timing.startedAt,
    timing.timeLimitMinutes,
    timing.availableUntil,
  );
  return deadline !== null && timing.now.getTime() >= deadline.getTime();
}

export function getRemainingSeconds(timing: AttemptTiming): number | null {
  const deadline = getAttemptDeadline(
    timing.startedAt,
    timing.timeLimitMinutes,
    timing.availableUntil,
  );
  return deadline === null
    ? null
    : Math.max(
        Math.ceil((deadline.getTime() - timing.now.getTime()) / 1000),
        0,
      );
}
