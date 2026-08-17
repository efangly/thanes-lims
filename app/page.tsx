"use client";

import { LimsApp } from "@/components/lims-app";
import { LoginForm } from "@/components/login-form";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center text-muted">กำลังโหลด...</div>;
  if (!user) return <LoginForm />;
  return <LimsApp />;
}

export default function Home() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
