"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/lib/auth-context";
import { ConfirmProvider } from "@/lib/confirm-context";
import { LimsDataProvider } from "@/components/lims-data-context";
import { PageActionsProvider } from "@/components/page-actions-context";
import { ModalRouter } from "@/components/modal-router";
import { ToastStack } from "@/components/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [loading, user, pathname, router]);

  if (loading || !user) return <div className="grid h-screen place-items-center text-muted">กำลังโหลด...</div>;

  return (
    <ConfirmProvider>
      <LimsDataProvider>
        <PageActionsProvider>
          <div className="grid h-screen grid-cols-1 overflow-hidden md:grid-cols-[248px_1fr]">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex flex-col overflow-hidden bg-bg">
              <Topbar onMenuClick={() => setSidebarOpen(true)} />
              <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
            </div>
          </div>
          <ModalRouter />
          <ToastStack />
        </PageActionsProvider>
      </LimsDataProvider>
    </ConfirmProvider>
  );
}
