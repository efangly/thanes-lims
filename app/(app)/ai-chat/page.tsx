"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "@/lib/icons";
import { Button, Card, CardHead, PageHead, Tag } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { useLims } from "@/components/lims-data-context";
import {
  askChatbot,
  ChatUnavailableError,
  ChatValidationError,
  type ChatAnswer,
} from "@/lib/chat-api";

/* ---------- ข้อความในบทสนทนา ---------- */
interface UserMsg {
  id: string;
  role: "user";
  text: string;
}
interface AiMsg {
  id: string;
  role: "ai";
  /** คำตอบ Markdown (มีเมื่อสำเร็จ) */
  data?: ChatAnswer;
  /** ข้อความ error (มีเมื่อไม่สำเร็จ) */
  error?: string;
}
type ChatMsg = UserMsg | AiMsg;

const GREETING =
  "สวัสดีค่ะ ถามข้อมูลตัวอย่าง ผลตรวจ วัสดุคงคลัง หรือใบสั่งซื้อได้เลย " +
  "แต่ละคำถามเป็นอิสระต่อกัน (ไม่มีบทสนทนาต่อเนื่อง) โปรดถามให้ครบใจความในครั้งเดียว";

/** จาก docs/chatbot-frontend-integration.md §5 — ตรงกับ seed data */
const SUGGESTIONS = [
  "มี sample อะไรบ้างที่ยังค้างสถานะ pending เกิน 7 วัน",
  "test result อะไรบ้างที่ flag เป็น hi หรือ lo",
  "สารเคมี/วัสดุคงคลังอะไรบ้างที่ต่ำกว่าจุดสั่งซื้อขั้นต่ำ",
  "มีใบสั่งซื้อที่ยังรออนุมัติหรือส่งให้ vendor แล้วกี่ใบ",
];

const THINKING_STEPS = [
  "ตีความคำถามและเลือกโมดูลที่เกี่ยวข้อง",
  "สร้าง SQL แล้วรันกับฐานข้อมูล (อ่านอย่างเดียว)",
  "เรียบเรียงคำตอบเป็นภาษาไทย",
];

const MAX_LEN = 500;

/* ---------- accordion SQL ---------- */
function SqlAccordion({ queries }: { queries: string[] }) {
  const [open, setOpen] = useState(false);
  if (queries.length === 0) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-bg px-3 py-2 text-left text-[12px] font-medium text-muted transition hover:text-ink"
      >
        <Icons.Chevron
          className={`h-3.5 w-3.5 flex-none transition ${open ? "rotate-90" : ""}`}
        />
        ดู SQL ที่ใช้ ({queries.length})
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-line bg-bg-2 p-3">
          {queries.map((q, i) => (
            <pre
              key={i}
              className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-ink"
            >
              {q}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- การ์ดคำตอบ AI ---------- */
function AiAnswer({ msg }: { msg: AiMsg }) {
  if (msg.error) {
    return (
      <div className="rounded-[14px] rounded-tl-[4px] border border-red/40 bg-red-bg px-4 py-2.5 text-[13px] leading-relaxed text-red">
        {msg.error}
      </div>
    );
  }
  if (!msg.data) return null;
  const { answer, sql_queries, rows, elapsed_ms } = msg.data;
  return (
    <div className="min-w-0">
      <div className="rounded-[14px] rounded-tl-[4px] border border-line bg-bg px-4 py-2.5">
        <Markdown text={answer} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 font-mono text-[10.5px] text-muted-2">
        <span>{rows} แถวจากฐานข้อมูล</span>
        <span>·</span>
        <span>{(elapsed_ms / 1000).toFixed(1)} วิ</span>
      </div>
      <SqlAccordion queries={sql_queries} />
    </div>
  );
}

/* ---------- หน้าหลัก ---------- */
export default function AiChatPage() {
  const { pushToast } = useLims();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinkStep, setThinkStep] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // เลื่อนไปท้ายบทสนทนาเมื่อมีความเคลื่อนไหว
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, thinkStep]);

  // ไล่ขั้นตอน "กำลังคิด" ระหว่างรอ backend
  useEffect(() => {
    if (!busy) {
      setThinkStep(0);
      return;
    }
    const id = setInterval(
      () => setThinkStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1)),
      2500
    );
    return () => clearInterval(id);
  }, [busy]);

  const submit = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || busy || unavailable) return;
      if (question.length > MAX_LEN) {
        pushToast(`คำถามต้องไม่เกิน ${MAX_LEN} ตัวอักษร`, "red");
        return;
      }

      setDraft("");
      setBusy(true);
      const aiId = `ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", text: question },
      ]);

      try {
        const data = await askChatbot(question);
        setMessages((prev) => [...prev, { id: aiId, role: "ai", data }]);
      } catch (err) {
        if (err instanceof ChatUnavailableError) {
          setUnavailable(true);
        } else if (err instanceof ChatValidationError) {
          setMessages((prev) => [
            ...prev,
            { id: aiId, role: "ai", error: err.message },
          ]);
        } else {
          const timedOut =
            err instanceof Error && err.message.startsWith("ผู้ช่วยใช้เวลานาน");
          setMessages((prev) => [
            ...prev,
            {
              id: aiId,
              role: "ai",
              error:
                timedOut && err instanceof Error
                  ? err.message
                  : "ตอบไม่สำเร็จ ลองถามใหม่อีกครั้ง",
            },
          ]);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, unavailable, pushToast]
  );

  const reset = useCallback(() => {
    if (busy) return;
    setMessages([]);
    setDraft("");
  }, [busy]);

  const showSuggestions = messages.length === 0 && !busy && !unavailable;

  return (
    <div className="animate-fade flex h-full flex-col">
      <PageHead
        title="ผู้ช่วยอัจฉริยะ"
        desc="สอบถามข้อมูลตัวอย่าง ผลตรวจ วัสดุคงคลัง และใบสั่งซื้อด้วยภาษาธรรมชาติ ผู้ช่วยจะสร้างคำค้นจากข้อมูลจริงในระบบ (อ่านอย่างเดียว) แล้วสรุปคำตอบพร้อมตารางให้"
        actions={
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy || messages.length === 0}>
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
            <Tag
              tone={unavailable ? "red" : "teal"}
              label={unavailable ? "ไม่พร้อมใช้งาน" : "ออนไลน์"}
            />
          }
        />

        {/* บทสนทนา */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto flex max-w-[860px] flex-col gap-5">
            {/* ทักทาย */}
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-teal-bg text-teal-d">
                <Icons.Ai className="h-[17px] w-[17px]" />
              </span>
              <div className="rounded-[14px] rounded-tl-[4px] border border-line bg-bg px-4 py-2.5 text-[13.5px] leading-relaxed text-muted">
                {GREETING}
              </div>
            </div>

            {unavailable && (
              <div className="flex gap-3">
                <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-red-bg text-red">
                  <Icons.Shield className="h-[17px] w-[17px]" />
                </span>
                <div className="rounded-[14px] rounded-tl-[4px] border border-red/40 bg-red-bg px-4 py-2.5 text-[13px] leading-relaxed text-red">
                  ระบบผู้ช่วยไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง
                </div>
              </div>
            )}

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
                    <AiAnswer msg={m} />
                  </div>
                </div>
              )
            )}

            {/* กำลังประมวลผล */}
            {busy && (
              <div className="animate-fade flex gap-3">
                <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-teal-bg text-teal-d">
                  <Icons.Ai className="h-[17px] w-[17px]" />
                </span>
                <div className="min-w-0 flex-1 overflow-hidden rounded-[14px] rounded-tl-[4px] border border-line bg-bg">
                  <div className="flex items-center gap-2 px-4 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[1.2px] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse-dot" />
                    กำลังประมวลผล… (ปกติ 5–10 วิ บางครั้งถึง ~30 วิ)
                  </div>
                  <div className="flex flex-col gap-1.5 px-4 pb-3.5 pt-1.5">
                    {THINKING_STEPS.slice(0, thinkStep + 1).map((s, i) => {
                      const finished = i < thinkStep;
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
          </div>
        </div>

        {/* แถบป้อนคำถาม */}
        <div className="flex-none border-t border-line p-4">
          <div className="mx-auto max-w-[860px]">
            {showSuggestions && (
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[1px] text-muted-2">
                  ลองถาม
                </span>
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="rounded-full border border-line bg-bg px-3 py-1.5 text-left text-[12.5px] text-ink transition hover:border-teal hover:text-teal-d"
                  >
                    {q}
                  </button>
                ))}
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
                disabled={busy || unavailable}
                maxLength={MAX_LEN + 20}
                placeholder={
                  unavailable
                    ? "ผู้ช่วยไม่พร้อมใช้งาน"
                    : busy
                      ? "ผู้ช่วยกำลังประมวลผล…"
                      : "พิมพ์คำถามเกี่ยวกับตัวอย่าง ผลตรวจ วัสดุคงคลัง หรือใบสั่งซื้อ…"
                }
                className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted-2 disabled:cursor-not-allowed"
              />
              <span className="hidden font-mono text-[10px] text-muted-2 sm:inline">
                {draft.length}/{MAX_LEN}
              </span>
              <Button
                type="submit"
                variant="teal"
                size="sm"
                disabled={busy || unavailable || !draft.trim()}
              >
                <Icons.Arrow className="h-[14px] w-[14px]" />
                ส่ง
              </Button>
            </form>

            <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-muted-2">
              <Icons.Shield className="h-[12px] w-[12px] flex-none" />
              ตอบได้เฉพาะ Sample · TestResult · Inventory · PurchaseOrder — อ่านอย่างเดียว โปรดตรวจทานก่อนใช้ตัดสินใจ
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
