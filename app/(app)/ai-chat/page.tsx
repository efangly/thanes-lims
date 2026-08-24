"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "@/lib/icons";
import { AI_FALLBACK, AI_GREETING, AI_SCRIPT, type AiBlock, type AiTurn } from "@/lib/ai-script";
import { BarChart, Button, Card, CardHead, KpiCard, PageHead, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

/* ---------- ชนิดข้อความในบทสนทนา ---------- */
interface ChatMsg {
  id: string;
  role: "user" | "ai";
  /** ข้อความที่แสดงอยู่ขณะนี้ (ค่อย ๆ เพิ่มระหว่าง streaming) */
  text: string;
  /** ข้อความเต็มของฝั่ง AI ใช้ตอนกด "หยุด" เพื่อเติมให้จบทันที */
  fullText?: string;
  turn?: AiTurn;
  done?: boolean;
}

type Phase = "idle" | "thinking" | "streaming";

const GENERIC_THINKING = [
  "ตีความคำถามและระบุโมดูลที่เกี่ยวข้อง",
  "ค้นข้อมูลจากทะเบียนตัวอย่างและเซนเซอร์",
  "เรียบเรียงคำตอบ",
];

const THINK_STEP_MS = 700;
const STREAM_TICK_MS = 16;
const STREAM_CHARS_PER_TICK = 2;

const greetingMsg = (): ChatMsg => ({
  id: "greeting",
  role: "ai",
  text: AI_GREETING,
  fullText: AI_GREETING,
  done: true,
});

/* ---------- กราฟอุณหภูมิพร้อมเส้นเกณฑ์ (ดัดแปลงจาก AreaChart ใน ui.tsx ให้รับค่าเป็น prop) ---------- */
function TempChart({ points, limit, unit }: { points: number[]; limit: number; unit: string }) {
  const w = 560;
  const h = 150;
  const pad = 2;
  const max = Math.max(...points, limit) + pad;
  const min = Math.min(...points, limit) - pad;
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const step = w / (points.length - 1);
  const line = points.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[150px] w-full">
        <defs>
          <linearGradient id="aiTempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-red)" stopOpacity="0.24" />
            <stop offset="1" stopColor="var(--color-red)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={y(limit)}
          x2={w}
          y2={y(limit)}
          stroke="var(--color-red)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          opacity={0.6}
        />
        <polygon points={area} fill="url(#aiTempGrad)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-red)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-0.5 flex justify-between font-mono text-[10.5px] text-muted-2">
        <span>-24 ชม.</span>
        <span>-18 ชม.</span>
        <span>-12 ชม.</span>
        <span>-6 ชม.</span>
        <span>ตอนนี้</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-[18px] text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full bg-red" />
          อุณหภูมิจริง ({unit})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full border-t-2 border-dashed border-red opacity-70" />
          เกณฑ์ที่กำหนด {limit}
          {unit}
        </span>
      </div>
    </>
  );
}

/* ---------- บล็อกข้อมูลที่แนบมากับคำตอบ ---------- */
const thStyle =
  "whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted";

// memo: block ทุกตัวมาจากค่าคงที่ใน AI_SCRIPT จึงข้ามการ re-render
// ตารางและกราฟทิ้งได้ทั้งหมดระหว่างที่ข้อความกำลังพิมพ์ทีละตัว
const BlockView = memo(function BlockView({ block }: { block: AiBlock }) {
  switch (block.kind) {
    case "kpi":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {block.items.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      );

    case "bar":
      return (
        <Card>
          <CardHead icon={<Icons.Sample />} title={block.title} />
          <div className="px-5 py-[18px]">
            <BarChart data={block.data} legendA={block.legendA} legendB={block.legendB} />
            {block.note && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-muted-2">
                <Icons.Bolt className="h-[13px] w-[13px] flex-none" />
                {block.note}
              </div>
            )}
          </div>
        </Card>
      );

    case "table":
      return (
        <Card>
          <CardHead icon={<Icons.Sample />} title={block.title} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr>
                  {block.columns.map((c) => (
                    <th key={c} className={thStyle}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-bg/60">
                    <td className="whitespace-nowrap border-b border-line px-3.5 py-3 font-mono text-[12.5px] font-medium text-ink">
                      {r.id}
                    </td>
                    <td className="border-b border-line px-3.5 py-3">
                      <div className="text-[13px]">{r.name}</div>
                      <div className="text-[11.5px] text-muted">{r.detail}</div>
                    </td>
                    <td className="whitespace-nowrap border-b border-line px-3.5 py-3">{r.custodian}</td>
                    <td className="border-b border-line px-3.5 py-3">
                      <Tag {...r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );

    case "temp-chart":
      return (
        <Card>
          <CardHead icon={<Icons.Env />} title={block.title} right={<Tag {...block.badge} />} />
          <div className="px-5 py-[18px]">
            <TempChart points={block.points} limit={block.limit} unit={block.unit} />
            <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-red">
              <Icons.Bolt className="h-[13px] w-[13px] flex-none" />
              {block.note}
            </div>
          </div>
        </Card>
      );

    case "record":
      return (
        <Card>
          <CardHead
            icon={<Icons.Check />}
            title={block.title}
            right={<Tag tone="green" label="บันทึกแล้ว" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr>
                  {["รหัสตัวอย่าง", "ตัวอย่าง", "การดำเนินการ", "ผลสรุป"].map((c) => (
                    <th key={c} className={thStyle}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-bg/60">
                    <td className="whitespace-nowrap border-b border-line px-3.5 py-3 font-mono text-[12.5px] font-medium text-ink">
                      {r.id}
                    </td>
                    <td className="border-b border-line px-3.5 py-3">{r.name}</td>
                    <td className="border-b border-line px-3.5 py-3 text-muted">{r.action}</td>
                    <td className="border-b border-line px-3.5 py-3">
                      <Tag {...r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-line px-[18px] py-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {block.audit.map((a) => (
              <div key={a.label}>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted-2">
                  {a.label}
                </div>
                <div className="mt-0.5 font-mono text-[12.5px] text-ink">{a.value}</div>
              </div>
            ))}
          </div>
        </Card>
      );
  }
});

/* ---------- หน้าหลัก ---------- */
export default function AiChatPage() {
  const { pushToast } = useLims();

  const [messages, setMessages] = useState<ChatMsg[]>([greetingMsg()]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [thinking, setThinking] = useState<{ steps: string[]; visible: number } | null>(null);
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearInterval);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // เลื่อนไปท้ายบทสนทนาทุกครั้งที่มีความเคลื่อนไหว
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, phase]);

  const nextTurn: AiTurn | undefined = AI_SCRIPT[turnIndex];

  const finishAnswer = useCallback(
    (turn: AiTurn | undefined) => {
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, text: m.fullText ?? m.text, done: true } : m))
      );
      setPhase("idle");
      if (turn) {
        setTurnIndex((i) => i + 1);
        if (turn.id === "record-review") {
          pushToast("บันทึกผลการตรวจสอบความคงตัวเรียบร้อยแล้ว", "green");
        }
      }
    },
    [pushToast]
  );

  const startStreaming = useCallback(
    (turn: AiTurn | undefined) => {
      const full = turn ? turn.answer : AI_FALLBACK;
      setThinking(null);
      setPhase("streaming");
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "ai", text: "", fullText: full, turn, done: false },
      ]);

      let cursor = 0;
      const id = setInterval(() => {
        cursor += STREAM_CHARS_PER_TICK;
        if (cursor >= full.length) {
          clearInterval(id);
          timers.current = timers.current.filter((t) => t !== id);
          finishAnswer(turn);
          return;
        }
        const slice = full.slice(0, cursor);
        setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, text: slice } : m)));
      }, STREAM_TICK_MS);
      timers.current.push(id);
    },
    [finishAnswer]
  );

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || phase !== "idle") return;

      const turn = AI_SCRIPT[turnIndex];
      setDraft("");
      setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text: trimmed }]);

      const steps = turn ? turn.thinking : GENERIC_THINKING;
      setPhase("thinking");
      setThinking({ steps, visible: 0 });

      let visible = 0;
      const id = setInterval(() => {
        visible += 1;
        if (visible > steps.length) {
          clearInterval(id);
          timers.current = timers.current.filter((t) => t !== id);
          startStreaming(turn);
          return;
        }
        setThinking({ steps, visible });
      }, THINK_STEP_MS);
      timers.current.push(id);
    },
    [phase, turnIndex, startStreaming]
  );

  const stop = useCallback(() => {
    clearTimers();
    if (phase === "thinking") {
      // ยังไม่เริ่มพิมพ์คำตอบ — ยกเลิกกลับสู่สถานะพร้อมรับคำถาม
      setThinking(null);
      setPhase("idle");
      return;
    }
    if (phase === "streaming") finishAnswer(AI_SCRIPT[turnIndex]);
  }, [clearTimers, phase, turnIndex, finishAnswer]);

  const reset = useCallback(() => {
    clearTimers();
    setMessages([greetingMsg()]);
    setTurnIndex(0);
    setPhase("idle");
    setThinking(null);
    setDraft("");
  }, [clearTimers]);

  const busy = phase !== "idle";
  const last = messages[messages.length - 1];
  const followUpLabel =
    !busy && last?.role === "ai" && last.done ? last.turn?.followUp : undefined;

  return (
    <div className="animate-fade flex h-full flex-col">
      <PageHead
        title="ผู้ช่วยอัจฉริยะ"
        desc="สอบถามสถานะตัวอย่าง ผู้รับผิดชอบ และสภาพแวดล้อมการจัดเก็บด้วยภาษาธรรมชาติ ผู้ช่วยจะสรุปคำตอบพร้อมตารางและกราฟจากข้อมูลจริงในระบบให้ทันที"
        actions={
          <Button variant="ghost" size="sm" onClick={reset}>
            <Icons.Arrow className="h-[15px] w-[15px]" />
            เริ่มบทสนทนาใหม่
          </Button>
        }
      />

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHead
          icon={<Icons.Ai />}
          title="LIMS Copilot"
          right={
            <div className="flex items-center gap-2.5">
              <span className="hidden font-mono text-[10.5px] tracking-[0.5px] text-muted-2 sm:inline">
                CONNECTED · 6 MODULES
              </span>
              <Tag tone="teal" label="ออนไลน์" />
            </div>
          }
        />

        {/* บทสนทนา */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto flex max-w-[860px] flex-col gap-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-[14px] rounded-br-[4px] bg-teal px-4 py-2.5 text-[13.5px] leading-relaxed text-white">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-teal-bg text-teal-d">
                    <Icons.Ai className="h-[17px] w-[17px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-[14px] rounded-tl-[4px] border border-line bg-bg px-4 py-2.5 text-[13.5px] leading-relaxed">
                      {m.text}
                      {!m.done && (
                        <span className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-[2px] bg-teal animate-pulse-dot" />
                      )}
                    </div>
                    {m.done && m.turn && m.turn.blocks.length > 0 && (
                      <div className="animate-fade mt-3.5 flex flex-col gap-3.5">
                        {m.turn.blocks.map((b, i) => (
                          <BlockView key={`${m.id}-${i}`} block={b} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* การ์ด "กำลังคิด" */}
            {thinking && (
              <div className="animate-fade flex gap-3">
                <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-teal-bg text-teal-d">
                  <Icons.Ai className="h-[17px] w-[17px]" />
                </span>
                <div className="min-w-0 flex-1 overflow-hidden rounded-[14px] rounded-tl-[4px] border border-line bg-bg">
                  <div className="flex items-center gap-2 px-4 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[1.2px] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse-dot" />
                    กำลังคิด…
                  </div>
                  <div className="flex flex-col gap-1.5 px-4 pb-3.5 pt-1.5">
                    {thinking.steps.slice(0, Math.max(thinking.visible, 1)).map((s, i) => {
                      const finished = i < thinking.visible - 1;
                      return (
                        <div
                          key={s}
                          className={`animate-fade flex items-center gap-2 text-[12.5px] ${
                            finished ? "text-muted" : "text-ink"
                          }`}
                        >
                          <span
                            className={`grid h-[15px] w-[15px] flex-none place-items-center rounded-full ${
                              finished ? "bg-teal-bg text-teal-d" : "bg-bg-2 text-muted-2"
                            }`}
                          >
                            {finished ? (
                              <Icons.Check className="h-[10px] w-[10px]" />
                            ) : (
                              <span className="h-1 w-1 rounded-full bg-current" />
                            )}
                          </span>
                          {s}
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-[2px] w-full overflow-hidden bg-bg-2">
                    <div className="h-full w-1/3 bg-teal animate-progress-indet" />
                  </div>
                </div>
              </div>
            )}

            {/* ปุ่มลัดไปคำถามถัดไป */}
            {followUpLabel && nextTurn && (
              <div className="animate-fade flex justify-start pl-11">
                <Button variant="teal" size="sm" onClick={() => submit(nextTurn.question)}>
                  <Icons.Bolt className="h-[14px] w-[14px]" />
                  {followUpLabel}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* แถบป้อนคำถาม */}
        <div className="flex-none border-t border-line p-4">
          <div className="mx-auto max-w-[860px]">
            {nextTurn && !busy && (
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[1px] text-muted-2">
                  คำถามแนะนำ
                </span>
                <button
                  onClick={() => submit(nextTurn.question)}
                  className="rounded-full border border-line bg-bg px-3 py-1.5 text-left text-[12.5px] text-ink transition hover:border-teal hover:text-teal-d"
                >
                  {nextTurn.question}
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
              className="flex items-center gap-2.5 rounded-lg border border-line bg-bg px-[13px] py-2 transition focus-within:border-teal"
            >
              <Icons.Ai className="h-[16px] w-[16px] flex-none text-muted-2" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={busy}
                placeholder={busy ? "ผู้ช่วยกำลังประมวลผล…" : "พิมพ์คำถามเกี่ยวกับตัวอย่าง เครื่องมือ หรือสภาพแวดล้อม…"}
                className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted-2 disabled:cursor-not-allowed"
              />
              {busy ? (
                <Button type="button" variant="ghost" size="sm" onClick={stop}>
                  หยุด
                </Button>
              ) : (
                <Button type="submit" variant="teal" size="sm" disabled={!draft.trim()}>
                  <Icons.Arrow className="h-[14px] w-[14px]" />
                  ส่ง
                </Button>
              )}
            </form>

            <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-muted-2">
              <Icons.Shield className="h-[12px] w-[12px] flex-none" />
              คำตอบอ้างอิงข้อมูลภายในระบบ · โปรดตรวจทานก่อนนำไปใช้ตัดสินใจทางคุณภาพ
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
