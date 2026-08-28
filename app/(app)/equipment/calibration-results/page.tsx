import { Suspense } from "react";
import { CalibrationResultsView } from "@/components/calibration-results-view";

export default function CalibrationResultsPage() {
  return (
    <Suspense fallback={null}>
      <CalibrationResultsView />
    </Suspense>
  );
}
