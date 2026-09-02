import { apiFetch, ApiError } from "@/lib/api-client";

/** ผลลัพธ์จาก POST /chat — ดู docs/chatbot-frontend-integration.md */
export interface ChatAnswer {
  /** คำตอบภาษาไทย เป็น Markdown (ตาราง / ตัวหนา / bullet) */
  answer: string;
  /** SQL ที่ backend รันจริง เรียงตามลำดับ — โชว์เพื่อความโปร่งใส */
  sql_queries: string[];
  /** จำนวนแถวรวมที่ดึงมาจาก DB */
  rows: number;
  /** เวลาที่ backend ใช้ทั้งหมด (LLM + SQL) มิลลิวินาที */
  elapsed_ms: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

/** feature ทั้งก้อนไม่พร้อม (route ไม่ถูก mount / ADB ต่อไม่ได้) — ไม่ใช่ "ไม่พบข้อมูล" */
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
    return await apiFetch<ChatAnswer>("/chat", {
      method: "POST",
      body: JSON.stringify({ question }),
      // backend อาจใช้เวลาถึง ~60–90s ในเคสที่ LLM วน query หลายรอบ
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404 || err.status === 403) throw new ChatUnavailableError();
      if (err.status === 400) {
        throw new ChatValidationError("คำถามต้องมีความยาว 1–500 ตัวอักษร");
      }
      // 401 จัดการโดย api-client (refresh + retry) แล้ว ถ้ายังมาถึงนี่คือ session หมดจริง
    }
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error("ผู้ช่วยใช้เวลานานเกินไป กรุณาลองถามใหม่อีกครั้ง");
    }
    throw err;
  }
}
