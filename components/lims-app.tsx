"use client";

import { useState } from "react";
import type { ModuleId } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { DashboardView } from "@/components/modules/dashboard";
import { AiChatView } from "@/components/modules/ai-chat";
import { SamplesView } from "@/components/modules/samples";
import { EquipmentView } from "@/components/modules/equipment";
import { EnvironmentView } from "@/components/modules/environment";
import { InventoryView } from "@/components/modules/inventory";
import { DocumentsView } from "@/components/modules/documents";
import { TestsView } from "@/components/modules/tests";
import { LimsDataProvider } from "@/components/lims-data-context";
import { ModalRouter } from "@/components/modal-router";
import { ToastStack } from "@/components/toast";

export function LimsApp() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderView = () => {
    switch (active) {
      case "dashboard":
        return <DashboardView onNavigate={setActive} />;
      case "ai-chat":
        return <AiChatView />;
      case "samples":
        return <SamplesView />;
      case "equipment":
        return <EquipmentView />;
      case "environment":
        return <EnvironmentView />;
      case "inventory":
        return <InventoryView />;
      case "documents":
        return <DocumentsView />;
      case "tests":
        return <TestsView />;
    }
  };

  return (
    <LimsDataProvider>
      <div className="grid h-screen grid-cols-1 overflow-hidden md:grid-cols-[248px_1fr]">
        <Sidebar
          active={active}
          onNavigate={setActive}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-col overflow-hidden bg-bg">
          <Topbar active={active} onNavigate={setActive} onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex-1 overflow-y-auto p-6">{renderView()}</div>
        </div>
      </div>
      <ModalRouter />
      <ToastStack />
    </LimsDataProvider>
  );
}
