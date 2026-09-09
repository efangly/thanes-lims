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

/* ---------- รายการในบันทึกการสอบถาม ---------- */
interface UserMsg {
  id: string;
  role: "user";
  text: string;
}
interface AiMsg {
  id: string;
  role: "ai";
  data?: ChatAnswer;
  error?: string;
}
type ChatMsg = UserMsg | AiMsg;

const GREETING =
  "สอบถามข้อมูล Sample · TestResult · Inventory · PurchaseOrder ด้วยภาษาไทย " +
  "แต่ละคำสั่งเป็นอิสระต่อกัน (ไม่มีบทสนทนาต่อเนื่อง) — ถามให้ครบใจความในครั้งเดียว";

/** จาก docs/chatbot-frontend-integration.md §5 — ตรงกับ seed data */
const SUGGESTIONS = [
  "มี sample อะไรบ้างที่ยังค้างสถานะ pending เกิน 7 วัน",
  "test result อะไรบ้างที่ flag เป็น hi หรือ lo",
  "สารเคมี/วัสดุคงคลังอะไรบ้างที่ต่ำกว่าจุดสั่งซื้อขั้นต่ำ",
  "มีใบสั่งซื้อที่ยังรออนุมัติหรือส่งให้ vendor แล้วกี่ใบ",
];

const MAX_LEN = 500;

/* ---------- accordion SQL ---------- */
function SqlAccordion({ queries }: { queries: string[] }) {
  const [open, setOpen] = useState(false);
  if (queries.length === 0) return null;
  return (
    <div className="mt-2 overflow-hidden rounded border border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-bg px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.5px] text-muted transition hover:text-ink"
      >
        <Icons.Chevron className={`h-3.5 w-3.5 flex-none transition ${open ? "rotate-90" : ""}`} />
        SQL ที่ใช้ · {queries.length}
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

/* ---------- ผลลัพธ์ ---------- */
function AiResult({ msg }: { msg: AiMsg }) {
  if (msg.error) {
    return (
      <div className="border-l-2 border-red bg-red-bg px-3 py-2 text-[13px] leading-relaxed text-red">
        {msg.error}
      </div>
    );
  }
  if (!msg.data) return null;
  const { answer, sql_queries, rows, elapsed_ms } = msg.data;
  return (
    <div className="min-w-0">
      <div className="rounded border border-line bg-panel px-4 py-3">
        <Markdown text={answer} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] text-muted-2">
        <span>{rows} rows</span>
        <span>·</span>
        <span>{(elapsed_ms / 1000).toFixed(1)}s</span>
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
  const [elapsed, setElapsed] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, elapsed]);

  // ตัวนับวินาทีระหว่างรอ backend
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
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
      setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text: question }]);

      try {
        const data = await askChatbot(question);
        setMessages((prev) => [...prev, { id: aiId, role: "ai", data }]);
      } catch (err) {
        if (err instanceof ChatUnavailableError) {
          setUnavailable(true);
        } else if (err instanceof ChatValidationError) {
          setMessages((prev) => [...prev, { id: aiId, role: "ai", error: err.message }]);
        } else {
          const timedOut = err instanceof Error && err.message.startsWith("ผู้ช่วยใช้เวลานาน");
          setMessages((prev) => [
            ...prev,
            {
              id: aiId,
              role: "ai",
              error:
                timedOut && err instanceof Error ? err.message : "ตอบไม่สำเร็จ ลองถามใหม่อีกครั้ง",
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
    <div className="flex h-full flex-col">
      <PageHead
        title="คอนโซลสอบถามข้อมูล"
        desc="สอบถามข้อมูลตัวอย่าง ผลตรวจ วัสดุคงคลัง และใบสั่งซื้อด้วยภาษาไทย ระบบสร้าง SQL จากข้อมูลจริง (อ่านอย่างเดียว) แล้วสรุปคำตอบพร้อมตาราง"
        actions={
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy || messages.length === 0}>
            ล้างบันทึก
          </Button>
        }
      />

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHead
          icon={<Icons.Ai />}
          title="SQL QUERY CONSOLE"
          right={
            <Tag
              tone={unavailable ? "red" : "green"}
              label={unavailable ? "OFFLINE" : "READY"}
            />
          }
        />

        {/* บันทึกการสอบถาม */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4 font-mono text-[13px] leading-relaxed"
        >
          <div className="mx-auto flex max-w-[880px] flex-col gap-4">
            <p className="font-sans text-[12.5px] text-muted">{GREETING}</p>

            {unavailable && (
              <div className="border-l-2 border-red bg-red-bg px-3 py-2 font-sans text-[13px] text-red">
                ระบบไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex gap-2 text-accent-d">
                  <span className="flex-none select-none text-muted-2">&gt;</span>
                  <span className="whitespace-pre-wrap break-words">{m.text}</span>
                </div>
              ) : (
                <div key={m.id} className="font-sans">
                  <AiResult msg={m} />
                </div>
              )
            )}

            {busy && (
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[1px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse-dot" />
                  กำลังสอบถาน… {elapsed}s
                </div>
                <div className="mt-2 h-[2px] w-24 bg-accent" />
              </div>
            )}
          </div>
        </div>

        {/* แถบป้อนคำสั่ง */}
        <div className="flex-none border-t border-line p-4">
          <div className="mx-auto max-w-[880px]">
            {showSuggestions && (
              <div className="mb-2.5 flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[1px] text-muted-2">
                  ตัวอย่างคำสั่ง
                </span>
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="flex gap-2 text-left font-mono text-[12px] text-muted transition hover:text-accent-d"
                  >
                    <span className="flex-none select-none text-muted-2">&gt;</span>
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
              className="flex items-center gap-2 rounded border border-line-2 bg-panel px-[13px] py-2 transition focus-within:border-ink focus-within:outline focus-within:outline-1 focus-within:outline-ink"
            >
              <span className="flex-none select-none font-mono text-[14px] text-muted-2">&gt;</span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={busy || unavailable}
                maxLength={MAX_LEN + 20}
                placeholder={
                  unavailable
                    ? "ระบบไม่พร้อมใช้งาน"
                    : busy
                      ? "กำลังประมวลผล…"
                      : "พิมพ์คำสั่งสอบถามข้อมูล…"
                }
                className="w-full bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-muted-2 disabled:cursor-not-allowed"
              />
              <span className="hidden font-mono text-[10px] text-muted-2 sm:inline">
                {draft.length}/{MAX_LEN}
              </span>
              <Button type="submit" variant="ink" size="sm" disabled={busy || unavailable || !draft.trim()}>
                RUN
              </Button>
            </form>

            <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-muted-2">
              <Icons.Shield className="h-[12px] w-[12px] flex-none" />
              Sample · TestResult · Inventory · PurchaseOrder — อ่านอย่างเดียว โปรดตรวจทานก่อนใช้ตัดสินใจ
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
