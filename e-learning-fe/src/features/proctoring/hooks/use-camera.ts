"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  requestCameraStream,
  stopCameraStream,
} from "../services/camera-service";

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      return "Camera permission was denied. Please allow camera access to continue.";
    }

    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      return "No camera was found on this device.";
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "The camera is already in use or cannot be accessed.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to access the camera.";
}

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    stopCameraStream(streamRef.current);

    streamRef.current = null;

    setStream(null);
    setStatus("idle");
    setError(null);
  }, []);

  const startCamera = useCallback(async () => {
    setStatus("requesting");
    setError(null);

    stopCameraStream(streamRef.current);

    streamRef.current = null;
    setStream(null);

    try {
      const nextStream = await requestCameraStream();

      streamRef.current = nextStream;

      setStream(nextStream);
      setStatus("ready");
    } catch (error) {
      const message = getCameraErrorMessage(error);

      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError")
      ) {
        setStatus("denied");
      } else {
        setStatus("error");
      }

      setError(message);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream(streamRef.current);
    };
  }, []);

  return {
    error,
    startCamera,
    status,
    stopCamera,
    stream,
  };
}
