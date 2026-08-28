import { Suspense } from "react";
import { InventoryReceiveView } from "@/components/inventory-receive-view";

export default function InventoryReceivePage() {
  return (
    <Suspense fallback={null}>
      <InventoryReceiveView />
    </Suspense>
  );
}
