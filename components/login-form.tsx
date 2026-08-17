"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export function LoginForm() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState("admin@thanes-lims.demo");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch {
      // error is surfaced via useAuth().error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid h-screen place-items-center bg-bg px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-[10px] border border-line bg-panel p-6 shadow-card">
        <h1 className="mb-1 text-[18px] font-semibold">Thanes LIMS</h1>
        <p className="mb-5 text-[12.5px] text-muted">เข้าสู่ระบบเพื่อจัดการห้องปฏิบัติการ</p>
        <div className="flex flex-col gap-3.5">
          <Field label="อีเมล">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@thanes-lims.demo"
              autoFocus
            />
          </Field>
          <Field label="รหัสผ่าน">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          {error && <p className="text-[12px] text-red">{error}</p>}
          <Button type="submit" variant="teal" disabled={submitting}>
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </div>
      </form>
    </div>
  );
}
