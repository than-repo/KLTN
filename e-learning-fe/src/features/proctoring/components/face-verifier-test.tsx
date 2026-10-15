"use client";

import { useEffect, useRef } from "react";

type FaceVerifierTestProps = {
  stream: MediaStream | null;
  onVerify: () => void;
  onClose: () => void;
};

export function FaceVerifierTest({
  stream,
  onVerify,
  onClose,
}: FaceVerifierTestProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.srcObject = stream;

    if (stream) {
      void video.play().catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to play verification camera:", error);
      });
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="mt-4 rounded-xl border border-border p-5">
      <div>
        <h3 className="font-semibold">Face Verification</h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Position your face inside the frame and look directly at the camera.
        </p>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-[4/3] w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[70%] w-[52%] rounded-[50%] border-4 border-white/80" />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Keep only one face visible and center it inside the guide.
      </p>

      <div className="mt-4 flex justify-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onVerify}
          disabled={!stream}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Verify Face
        </button>
      </div>
    </div>
  );
}
