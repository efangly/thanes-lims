import { Suspense } from "react";
import { LocationsView } from "@/components/locations-view";

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <LocationsView currentId={id} />
    </Suspense>
  );
}
