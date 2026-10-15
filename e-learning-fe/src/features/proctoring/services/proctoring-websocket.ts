export type ProctoringMessage = {
  type: string;
  [key: string]: unknown;
};

type ProctoringWebSocketOptions = {
  url?: string;
  onOpen?: () => void;
  onMessage?: (message: ProctoringMessage) => void;
  onClose?: () => void;
  onError?: () => void;
};

const DEFAULT_PROCTORING_WS_URL = "ws://localhost:8000/ws/proctoring";

export function connectProctoringWebSocket({
  url = DEFAULT_PROCTORING_WS_URL,
  onOpen,
  onMessage,
  onClose,
  onError,
}: ProctoringWebSocketOptions = {}) {
  const socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    onOpen?.();
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data) as ProctoringMessage;

      onMessage?.(message);
    } catch {
      console.error("Invalid message received from proctoring server.");
    }
  });

  socket.addEventListener("close", () => {
    onClose?.();
  });

  socket.addEventListener("error", () => {
    onError?.();
  });

  return socket;
}

export function sendProctoringMessage(
  socket: WebSocket,
  message: ProctoringMessage,
) {
  if (socket.readyState !== WebSocket.OPEN) {
    throw new Error("Proctoring WebSocket is not connected.");
  }

  socket.send(JSON.stringify(message));
}

export function disconnectProctoringWebSocket(socket: WebSocket | null) {
  if (!socket) {
    return;
  }

  if (
    socket.readyState === WebSocket.OPEN ||
    socket.readyState === WebSocket.CONNECTING
  ) {
    socket.close();
  }
}

export function sendProctoringBinary(
  socket: WebSocket,
  data: Blob | ArrayBuffer,
) {
  if (socket.readyState !== WebSocket.OPEN) {
    throw new Error("Proctoring WebSocket is not connected.");
  }

  socket.send(data);
}
