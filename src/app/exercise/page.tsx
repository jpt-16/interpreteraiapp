import type { Metadata } from "next";
import { Suspense } from "react";
import { ExerciseLoader } from "@/components/exercise/ExerciseLoader";

export const metadata: Metadata = { title: "Exercise" };

export default function ExercisePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ExerciseLoader />
    </Suspense>
  );
}
