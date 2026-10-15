"use client";

import { useEffect, useRef } from "react";

import { useCamera } from "../hooks/use-camera";

type CameraPrecheckProps = {
  onReadyChange?: (ready: boolean) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  locked?: boolean;
};

export function CameraPrecheck({
  onReadyChange,
  onStreamChange,
  locked = false,
}: CameraPrecheckProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { error, startCamera, status, stopCamera, stream } = useCamera();

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.srcObject = stream;

    if (stream) {
      void video.play().catch(() => {
        // The video element is muted and playsInline,
        // so modern browsers normally allow playback.
      });
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  const isReady = status === "ready";
  const isRequesting = status === "requesting";

  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  useEffect(() => {
    onStreamChange?.(stream);
  }, [stream, onStreamChange]);

  return (
    <div className="mt-8 rounded-xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Camera check</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Camera permission is required before you can start the quiz.
          </p>
        </div>

        <CameraStatus status={status} />
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-danger/20 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">
            Camera unavailable
          </p>

          <p className="mt-1 text-sm text-danger">{error}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {!isReady ? (
          <button
            className="min-h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRequesting}
            onClick={() => void startCamera()}
            type="button"
          >
            {isRequesting ? "Checking camera..." : "Check camera"}
          </button>
        ) : locked ? (
          <div className="flex min-h-11 items-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
            Camera monitoring is active
          </div>
        ) : (
          <button
            className="min-h-11 rounded-lg border border-border bg-background px-6 text-sm font-semibold"
            onClick={stopCamera}
            type="button"
          >
            Stop camera
          </button>
        )}
      </div>
    </div>
  );
}

function CameraStatus({
  status,
}: {
  status: "idle" | "requesting" | "ready" | "denied" | "error";
}) {
  const config = {
    idle: {
      label: "Camera not checked",
      container: "border-border bg-muted/50 text-muted-foreground",
      dot: "bg-muted-foreground",
    },

    requesting: {
      label: "Checking camera...",
      container: "border-amber-300 bg-amber-50 text-amber-800",
      dot: "bg-amber-500 animate-pulse",
    },

    ready: {
      label: "Camera ready",
      container: "border-emerald-300 bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-500",
    },

    denied: {
      label: "Camera permission denied",
      container: "border-red-300 bg-red-50 text-red-800",
      dot: "bg-red-500",
    },

    error: {
      label: "Camera unavailable",
      container: "border-red-300 bg-red-50 text-red-800",
      dot: "bg-red-500",
    },
  }[status];

  return (
    <div
      className={`inline-flex min-h-10 items-center gap-3 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm ${config.container}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`}
        aria-hidden="true"
      />

      <span>{config.label}</span>
    </div>
  );
}
