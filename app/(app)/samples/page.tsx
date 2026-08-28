import { Suspense } from "react";
import { SamplesView } from "@/components/samples-view";

export default function SamplesPage() {
  return (
    <Suspense fallback={null}>
      <SamplesView />
    </Suspense>
  );
}
