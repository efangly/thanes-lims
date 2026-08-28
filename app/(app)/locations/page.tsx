import { Suspense } from "react";
import { LocationsView } from "@/components/locations-view";

export default function LocationsPage() {
  return (
    <Suspense fallback={null}>
      <LocationsView />
    </Suspense>
  );
}
