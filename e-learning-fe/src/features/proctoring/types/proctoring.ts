export type ProctoringSessionStatus =
  | "idle"
  | "starting"
  | "active"
  | "interrupted"
  | "ending"
  | "ended"
  | "error";

export type ProctoringConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type ProctoringSession = {
  sessionId: string;
  assessmentId: string;
  attemptId: string;

  status: ProctoringSessionStatus;
  connectionStatus: ProctoringConnectionStatus;

  aiToken: string | null;
  aiWebSocketUrl: string | null;

  startedAt: string | null;
  endedAt: string | null;
};
