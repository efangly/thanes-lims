import { apiFetch, ApiError, CHATBOT_API_BASE } from "@/lib/api-client";

/**
 * ผลลัพธ์จาก POST /chat บน chatbot service ใหม่ (NestJS + LangGraph.js,
 * แยกจาก Go API หลัก — ดู CHATBOT_API_BASE ใน lib/api-client.ts). แทนที่
 * shape เดิมของ Go backend (`sql_queries`/`rows`/`cache_*_tokens`) หลังย้าย
 * ไป MCP tool calls: `toolCalls` รับหน้าที่ความโปร่งใสแทน `sql_queries` เดิม
 * (ยังเป็น user-facing เหมือนเดิม ไม่ใช่แค่ debug log)
 */
export interface ChatToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface ChatAnswer {
  /** คำตอบภาษาไทย เป็น Markdown (ตาราง / ตัวหนา / bullet) */
  answer: string;
  /** MCP tool ที่เรียกจริงเพื่อตอบคำถามนี้ — โชว์เพื่อความโปร่งใส แทน sql_queries เดิม */
  toolCalls: ChatToolCall[];
  /** เวลาที่ chatbot service ใช้ทั้งหมด (LLM + MCP tool calls) มิลลิวินาที */
  elapsedMs: number;
}

/** ผู้ช่วยต่อไม่ได้ตอนนี้ (`assistant_unavailable`, HTTP 503 — MCP server ต่อไม่ได้) */
export class ChatUnavailableError extends Error {
  constructor() {
    super("ระบบผู้ช่วยไม่พร้อมใช้งานชั่วคราว");
    this.name = "ChatUnavailableError";
  }
}

/** คำถามยาว/สั้นเกินเงื่อนไข backend (1–500 ตัวอักษร) */
export class ChatValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatValidationError";
  }
}

const TIMEOUT_MS = 90_000;

/**
 * ถาม chatbot แบบ single-turn — ไม่มีบทสนทนาต่อเนื่อง แต่ละครั้งเป็นอิสระ
 * ถ้าต้องอ้างถึงคำถามก่อนหน้า ต้องใส่ context ลงในคำถามเอง
 */
export async function askChatbot(question: string): Promise<ChatAnswer> {
  try {
    return await apiFetch<ChatAnswer>(
      "/chat",
      {
        method: "POST",
        body: JSON.stringify({ question }),
        // service อาจใช้เวลาถึง ~60–90s ในเคสที่ LLM วน tool call หลายรอบ
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      CHATBOT_API_BASE,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      // assistant_unavailable (503) = MCP server ต่อไม่ได้ - แทนความหมายเดิมของ
      // 404 ("feature ทั้งก้อนไม่พร้อม") ที่ Go backend เคยใช้ตอนยังมี Oracle
      if (err.status === 503) throw new ChatUnavailableError();
      if (err.status === 400) {
        throw new ChatValidationError(err.message || "คำถามต้องมีความยาว 1–500 ตัวอักษร");
      }
      // 401 จัดการโดย api-client (refresh + retry) แล้ว ถ้ายังมาถึงนี่คือ session หมดจริง
      // 403 = ไม่มีสิทธิ์ chatbot:view จริง ๆ (ต่างจาก 503 - ไม่ใช่ "ระบบไม่พร้อม")
      // 502 (assistant_partial_failure) และ 500 ปล่อยผ่านเป็น ApiError ปกติ
    }
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error("ผู้ช่วยใช้เวลานานเกินไป กรุณาลองถามใหม่อีกครั้ง");
    }
    throw err;
  }
}
