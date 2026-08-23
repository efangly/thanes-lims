"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { Icons } from "@/lib/icons";
import { useAuth } from "@/lib/auth-context";

const flaskPath = (
  <>
    <path d="M9 3h6M10 3v6.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-8.5V3" />
    <path d="M7.5 14h9" />
  </>
);

function BrandBadge({ size = "md" }: { size?: "md" | "sm" }) {
  const dims = size === "md" ? "h-[46px] w-[46px] rounded-[13px]" : "h-[42px] w-[42px] rounded-xl";
  const icon = size === "md" ? "h-6 w-6" : "h-[22px] w-[22px]";
  return (
    <div
      className={`grid flex-none place-items-center bg-gradient-to-br from-teal to-teal-d shadow-[0_0_0_1px_rgba(255,255,255,0.09)_inset] ${dims}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={icon}>
        {flaskPath}
      </svg>
    </div>
  );
}

const features = [
  { icon: <Icons.Sample />, label: "การจัดการตัวอย่าง" },
  { icon: <Icons.Microscope />, label: "การจัดการเครื่องมือ" },
  { icon: <Icons.Doc />, label: "การจัดการเอกสาร" },
];

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
    <div className="flex min-h-screen bg-bg">
      {/* Graphic / brand panel */}
      <section className="relative hidden flex-1 overflow-hidden border-r border-line bg-bg-2 md:flex" aria-hidden="true">
        <div
          className="pointer-events-none absolute -left-40 -top-36 h-[480px] w-[480px] rounded-full blur-[60px] dark:blur-[90px]"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-teal) 30%, transparent) 0%, transparent 72%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-52 -right-56 h-[520px] w-[520px] rounded-full blur-[60px] dark:blur-[90px]"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-teal) 20%, transparent) 0%, transparent 72%)" }}
        />

        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute -bottom-16 -right-16 h-[340px] w-[340px] stroke-teal fill-none opacity-[0.14]" strokeWidth={1.2}>
          {flaskPath}
        </svg>
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-[-30px] top-[14%] h-[120px] w-[120px] stroke-teal fill-none opacity-[0.16]" strokeWidth={1.4}>
          <path d="M8.5 5.8v3.2" />
          <path d="M8.5 9l6.5 6.5" />
          <path d="M9.5 12h5" />
          <path d="M15 15.5a5.5 5.5 0 0 1-5.5 5.5" />
          <path d="M6 21h9" />
          <circle cx="8.5" cy="4.5" r="1.3" />
        </svg>

        <span className="pointer-events-none absolute left-[20%] top-[22%] h-1.5 w-1.5 rounded-full bg-teal opacity-50" />
        <span className="pointer-events-none absolute left-[calc(20%-7px)] top-[calc(22%-7px)] h-5 w-5 rounded-full border border-teal/45" />
        <span className="pointer-events-none absolute left-[68%] top-[16%] h-1.5 w-1.5 rounded-full bg-teal opacity-50" />
        <span className="pointer-events-none absolute left-[82%] top-[46%] h-1.5 w-1.5 rounded-full bg-teal opacity-50" />
        <span className="pointer-events-none absolute left-[calc(82%-9px)] top-[calc(46%-9px)] h-6 w-6 rounded-full border border-teal/45" />

        <div className="relative z-[2] flex max-w-[460px] flex-col justify-center gap-[34px] p-14">
          <div className="flex items-center gap-3">
            <BrandBadge />
            <div>
              <div className="font-display text-[17.5px] font-bold leading-tight">Thanes LIMS</div>
              <div className="mt-px font-mono text-[9.5px] uppercase tracking-[1.6px] text-muted">Lab Data System</div>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <h2 className="text-balance font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.22] tracking-[-0.2px]">
              จัดการห้องปฏิบัติการของคุณ
              <br />
              <span className="text-teal-d">อย่างแม่นยำ</span> ในที่เดียว
            </h2>
            <p className="max-w-[40ch] text-[14px] leading-relaxed text-muted">
              ตัวอย่าง เครื่องมือ สภาพแวดล้อม และเอกสาร — ติดตามได้แบบเรียลไทม์ พร้อมข้อมูลที่เชื่อถือได้ในทุกขั้นตอน
            </p>
          </div>

          <div className="mt-1 flex flex-col gap-2.5">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 text-[13px] font-medium">
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-teal-bg text-teal-d">
                  <span className="h-[15px] w-[15px]">{f.icon}</span>
                </span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="grid flex-1 place-items-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-[22px] flex items-center gap-3 md:hidden">
            <BrandBadge size="sm" />
            <div className="font-display text-[19px] font-bold">Thanes LIMS</div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[18px] border border-line bg-panel/90 p-7 pb-[26px] shadow-card"
          >
            <h1 className="mb-1 font-display text-[20px] font-semibold">เข้าสู่ระบบ</h1>
            <p className="mb-6 text-[13px] text-muted">เข้าสู่ระบบเพื่อจัดการห้องปฏิบัติการ</p>

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
              <Button type="submit" variant="teal" disabled={submitting} className="w-full justify-center">
                {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
            </div>

            <p className="mt-[22px] flex items-center justify-center gap-1.5 font-mono text-[10.5px] tracking-[0.5px] text-muted-2">
              <span className="h-[7px] w-[7px] rounded-full bg-teal animate-pulse-dot" />
              SECURE CONNECTION · TLS 1.3
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
