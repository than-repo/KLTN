"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  connectProctoringWebSocket,
  disconnectProctoringWebSocket,
  ProctoringMessage,
  sendProctoringBinary,
  sendProctoringMessage,
} from "../services/proctoring-websocket";

export type ProctoringWebSocketStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type MockProctoringSession = {
  studentId: string;
  assessmentId: string;
  attemptId: string;
};

export function useProctoringWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);

  const [status, setStatus] =
    useState<ProctoringWebSocketStatus>("disconnected");

  const [lastMessage, setLastMessage] = useState<ProctoringMessage | null>(
    null,
  );

  const sendBinary = useCallback((data: Blob | ArrayBuffer) => {
    const socket = socketRef.current;

    if (!socket) {
      throw new Error("Proctoring WebSocket is not connected.");
    }

    sendProctoringBinary(socket, data);
  }, []);

  const sendMessage = useCallback((message: ProctoringMessage) => {
    const socket = socketRef.current;

    if (!socket) {
      throw new Error("Proctoring WebSocket is not connected.");
    }

    sendProctoringMessage(socket, message);
  }, []);

  const connect = useCallback((session: MockProctoringSession) => {
    if (
      socketRef.current?.readyState === WebSocket.OPEN ||
      socketRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    setStatus("connecting");
    setLastMessage(null);

    const socket = connectProctoringWebSocket({
      onOpen: () => {
        console.log("Proctoring WebSocket connected");

        setStatus("connected");

        sendProctoringMessage(socket, {
          type: "start_session",
          ...session,
        });
      },

      onMessage: (message) => {
        console.log("Proctoring message:", message);

        setLastMessage(message);
      },

      onClose: () => {
        console.log("Proctoring WebSocket disconnected");

        socketRef.current = null;
        setStatus("disconnected");
      },

      onError: () => {
        console.error("Proctoring WebSocket error");

        setStatus("error");
      },
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    disconnectProctoringWebSocket(socketRef.current);

    socketRef.current = null;
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    return () => {
      disconnectProctoringWebSocket(socketRef.current);
      socketRef.current = null;
    };
  }, []);

  return {
    connect,
    disconnect,
    lastMessage,
    sendBinary,
    sendMessage,
    status,
  };
}
