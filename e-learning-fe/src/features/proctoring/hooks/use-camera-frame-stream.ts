"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STREAM_FPS = 5;
const FRAME_INTERVAL_MS = 1000 / STREAM_FPS;
const JPEG_QUALITY = 0.7;

type UseCameraFrameStreamOptions = {
  stream: MediaStream | null;
  enabled: boolean;
  sendFrame: (frame: Blob) => void;
};

export function useCameraFrameStream({
  stream,
  enabled,
  sendFrame,
}: UseCameraFrameStreamOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const captureInProgressRef = useRef(false);

  const [framesSent, setFramesSent] = useState(0);

  const captureAndSendFrame = useCallback(async () => {
    if (!stream || captureInProgressRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    captureInProgressRef.current = true;

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
      });

      if (!blob) {
        return;
      }

      sendFrame(blob);

      setFramesSent((current) => current + 1);
    } catch (error) {
      console.error("Failed to capture proctoring frame:", error);
    } finally {
      captureInProgressRef.current = false;
    }
  }, [sendFrame, stream]);

  useEffect(() => {
    if (!stream || !enabled) {
      return;
    }

    const video = document.createElement("video");
    const canvas = document.createElement("canvas");

    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    videoRef.current = video;
    canvasRef.current = canvas;

    void video.play();

    const intervalId = window.setInterval(() => {
      void captureAndSendFrame();
    }, FRAME_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);

      video.pause();
      video.srcObject = null;

      videoRef.current = null;
      canvasRef.current = null;

      captureInProgressRef.current = false;
    };
  }, [stream, enabled, captureAndSendFrame]);

  return {
    framesSent,
    fps: STREAM_FPS,
  };
}
