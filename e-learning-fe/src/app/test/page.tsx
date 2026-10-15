"use client";

import { useState } from "react";
import { useProctoringWebSocket } from "@/features/proctoring/hooks/use-proctoring-websocket";
import { CameraPrecheck } from "@/features/proctoring/components/camera-precheck";
import { useCameraFrameStream } from "@/features/proctoring/hooks/use-camera-frame-stream";
import { FaceVerifierTest } from "@/features/proctoring/components/face-verifier-test";

type TestStage = "precheck" | "quiz";

const MOCK_SESSION = {
  studentId: "student-test-001",
  assessmentId: "assessment-test-001",
  attemptId: "attempt-test-001",
};

export default function TestPage() {
  const [stage, setStage] = useState<TestStage>("precheck");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [faceMonitorEnabled, setFaceMonitorEnabled] = useState(false);

  const [faceVerifierOpen, setFaceVerifierOpen] = useState(false);
  const isQuizStarted = stage === "quiz";

  const {
    connect: connectProctoring,
    disconnect: disconnectProctoring,
    lastMessage,
    sendBinary,
    sendMessage,
    status: proctoringStatus,
  } = useProctoringWebSocket();

  const { framesSent, fps } = useCameraFrameStream({
    stream: cameraStream,
    enabled: isQuizStarted && proctoringStatus === "connected",
    sendFrame: sendBinary,
  });

  const handleStartQuiz = () => {
    if (!isCameraReady) {
      return;
    }

    connectProctoring(MOCK_SESSION);
    setStage("quiz");
  };
  const handleToggleFaceMonitor = () => {
    if (proctoringStatus !== "connected") {
      return;
    }

    if (faceMonitorEnabled) {
      sendMessage({
        type: "stop_face_monitor",
      });

      setFaceMonitorEnabled(false);
      return;
    }

    sendMessage({
      type: "start_face_monitor",
    });

    setFaceMonitorEnabled(true);
  };

  const handleTestFaceVerifier = () => {
    if (proctoringStatus !== "connected") {
      return;
    }

    sendMessage({
      type: "verify_face",
    });
  };

  const handleDisconnectPython = () => {
    setFaceMonitorEnabled(false);
    setFaceVerifierOpen(false);

    disconnectProctoring();
  };
  return (
    <main className="min-h-screen bg-surface-pearl px-4 py-10 text-foreground">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold text-primary">Proctoring Test</p>

          <h1 className="mt-2 text-2xl font-bold">
            {isQuizStarted ? "Test Quiz" : "Camera Preparation"}
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {isQuizStarted
              ? "The mock quiz is running. Camera monitoring must remain active."
              : "Allow camera access before starting the mock quiz."}
          </p>

          <CameraPrecheck
            locked={isQuizStarted}
            onReadyChange={setIsCameraReady}
            onStreamChange={setCameraStream}
          />

          <p className="mt-2 text-sm">
            Camera stream:{" "}
            <strong>{cameraStream ? "available" : "not available"}</strong>
          </p>

          {!isQuizStarted ? (
            <button
              className="mt-6 min-h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isCameraReady}
              onClick={handleStartQuiz}
              type="button"
            >
              Start Quiz
            </button>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-background p-6">
              <p className="font-semibold">Mock quiz started</p>

              <div className="mt-3 space-y-2 text-sm">
                <p>
                  Python server: <strong>{proctoringStatus}</strong>
                </p>

                {lastMessage && (
                  <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {JSON.stringify(lastMessage, null, 2)}
                  </pre>
                )}

                <button
                  type="button"
                  onClick={handleToggleFaceMonitor}
                  disabled={proctoringStatus !== "connected"}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {faceMonitorEnabled
                    ? "Stop Face Monitor"
                    : "Test Face Monitor"}
                </button>

                <button
                  type="button"
                  onClick={() => setFaceVerifierOpen(true)}
                  disabled={proctoringStatus !== "connected"}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Test Face Verifier
                </button>

                <button
                  type="button"
                  onClick={handleDisconnectPython}
                  disabled={proctoringStatus === "disconnected"}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Disconnect Python
                </button>

                <p>
                  Frame streaming:{" "}
                  <strong>
                    {isQuizStarted && proctoringStatus === "connected"
                      ? `${fps} FPS`
                      : "stopped"}
                  </strong>
                </p>

                <p>
                  Frames sent: <strong>{framesSent}</strong>
                </p>
              </div>

              {faceVerifierOpen && (
                <FaceVerifierTest
                  stream={cameraStream}
                  onVerify={handleTestFaceVerifier}
                  onClose={() => setFaceVerifierOpen(false)}
                />
              )}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mock session
            </p>

            <div className="mt-2 space-y-1 text-sm">
              <p>Student: {MOCK_SESSION.studentId}</p>
              <p>Assessment: {MOCK_SESSION.assessmentId}</p>
              <p>Attempt: {MOCK_SESSION.attemptId}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
