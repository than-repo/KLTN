"use client";

import { useState } from "react";

import { CameraPrecheck } from "@/features/proctoring/components/camera-precheck";

type AssessmentAttemptPageV2Props = {
  accessToken: string;
  courseId: string;
  assessmentId: string;
  attemptId: string;
  courseSlug: string;
};

type AssessmentStage = "precheck" | "quiz";

export function AssessmentAttemptPageV2({
  assessmentId,
  attemptId,
}: AssessmentAttemptPageV2Props) {
  const [stage, setStage] = useState<AssessmentStage>("precheck");
  const [isCameraReady, setIsCameraReady] = useState(false);

  return (
    <section className="mx-auto max-w-4xl py-10">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold text-primary">Online assessment</p>

        {stage === "precheck" ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Assessment preparation</h1>

            <p className="mt-3 text-sm text-muted-foreground">
              Before starting the assessment, your device must pass the
              monitoring requirements.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold">Quiz</h1>

            <p className="mt-3 text-sm text-muted-foreground">
              Assessment interface placeholder.
            </p>
          </>
        )}

        <CameraPrecheck
          locked={stage === "quiz"}
          onReadyChange={setIsCameraReady}
        />

        {stage === "precheck" ? (
          <button
            className="mt-6 min-h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isCameraReady}
            onClick={() => setStage("quiz")}
            type="button"
          >
            Continue to quiz
          </button>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-background p-6">
            <p className="font-semibold">Quiz content will be added later.</p>

            <p className="mt-2 text-sm text-muted-foreground">
              Camera monitoring remains active while the assessment is open.
            </p>
          </div>
        )}

        <div className="mt-6 text-xs text-muted-foreground">
          Assessment: {assessmentId}
          <br />
          Attempt: {attemptId}
        </div>
      </div>
    </section>
  );
}
