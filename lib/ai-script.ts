import {
  AI_AT_RISK_SAMPLES,
  AI_FREEZER_LIMIT,
  AI_FREEZER_TREND,
  AI_INTAKE_7D,
  AI_URGENT_BY_OWNER,
  AI_URGENT_SAMPLES,
  type AiSampleRow,
  type Tag,
} from "@/lib/data";

/*
  บทสนทนาเดโมของผู้ช่วย AI — เป็นสคริปต์ตายตัว ไม่ได้เรียกโมเดลจริง
  แต่ละ turn ประกอบด้วยขั้นตอน "กำลังคิด" ที่ไล่ทีละบรรทัด, ข้อความคำตอบ
  ที่จะพิมพ์แบบ streaming และบล็อกข้อมูล (ตาราง/กราฟ/การ์ด) ที่โผล่ตามหลัง
*/

export type AiBlock =
  | {
      kind: "kpi";
      items: { accent: "teal" | "amber" | "red" | "green" | "violet"; label: string; value: string; unit?: string; trend?: string; trendDown?: boolean }[];
    }
  | {
      kind: "bar";
      title: string;
      data: { label: string; a: number; b: number }[];
      legendA: string;
      legendB: string;
      note?: string;
    }
  | { kind: "table"; title: string; columns: string[]; rows: AiSampleRow[] }
  | { kind: "temp-chart"; title: string; points: number[]; limit: number; unit: string; badge: Tag; note: string }
  | {
      kind: "record";
      title: string;
      rows: { id: string; name: string; action: string; status: Tag }[];
      audit: { label: string; value: string }[];
    };

export interface AiTurn {
  id: string;
  /** ข้อความที่จะแสดงบนชิปคำถามแนะนำ */
  question: string;
  /** ขั้นตอนที่ไล่แสดงระหว่าง "กำลังคิด" */
  thinking: string[];
  answer: string;
  blocks: AiBlock[];
  /** ปุ่มลัดใต้คำตอบ ที่กดแล้วเดินไป turn ถัดไปทันที */
  followUp?: string;
}

export const AI_SCRIPT: AiTurn[] = [
  {
    id: "intake-today",
    question: "วันนี้มีตัวอย่างรับเข้า และ มีสถานะเร่งด่วนเท่าไร",
    thinking: [
      "กำลังค้นทะเบียนตัวอย่างของวันที่ 21 ก.ค. 2569",
      "เทียบยอดรับเข้ากับข้อมูลเมื่อวาน",
      "จัดกลุ่มตามระดับความเร่งด่วน",
    ],
    answer:
      "วันนี้มีรายการตัวอย่างที่รับเข้าระบบ จำนวน 12 รายการ มากกว่าเมื่อวาน 3 รายการ และ 5 รายการมีสถานะเร่งด่วน คุณต้องการให้เราดูในส่วนไหนเพิ่มเติมไหม",
    blocks: [
      {
        kind: "kpi",
        items: [
          { accent: "teal", label: "รับเข้าวันนี้", value: "12", unit: "รายการ", trend: "▲ 3 เทียบเมื่อวาน" },
          { accent: "amber", label: "สถานะเร่งด่วน", value: "5", unit: "รายการ", trend: "42% ของยอดวันนี้", trendDown: true },
          { accent: "green", label: "ผ่านการตรวจรับ", value: "7", unit: "รายการ", trend: "เข้าคิวทดสอบแล้ว" },
        ],
      },
      {
        kind: "bar",
        title: "แนวโน้มการรับตัวอย่าง 7 วันล่าสุด (ก.ค. 2569)",
        data: AI_INTAKE_7D,
        legendA: "รับเข้าตามปกติ",
        legendB: "สถานะเร่งด่วน",
        note: "สัดส่วนรายการเร่งด่วนของวันนี้สูงกว่าค่าเฉลี่ย 7 วันอยู่ 11%",
      },
    ],
    followUp: "ดูผู้รับผิดชอบรายการเร่งด่วน",
  },
  {
    id: "urgent-owners",
    question: "แล้ว 5 รายการที่มีสถานะเร่งด่วน ใครเป็นผู้รับผิดชอบบ้าง",
    thinking: [
      "ดึงรายการเร่งด่วนทั้ง 5 รายการ",
      "อ่าน Chain of Custody เพื่อหาผู้ดูแลปัจจุบัน",
      "สรุปภาระงานรายบุคคล",
    ],
    answer:
      "รายการที่มีสถานะเร่งด่วน มี คุณพิมพ์ชนก, คุณวิภา และ คุณ สมชาย เป็นผู้ดูแล",
    blocks: [
      {
        kind: "table",
        title: "รายการเร่งด่วนและผู้รับผิดชอบ",
        columns: ["รหัสตัวอย่าง", "ตัวอย่าง", "ผู้ดูแลปัจจุบัน", "สถานะ"],
        rows: AI_URGENT_SAMPLES,
      },
      {
        kind: "kpi",
        items: AI_URGENT_BY_OWNER.map((o, i) => ({
          accent: (["teal", "violet", "amber"] as const)[i] ?? "teal",
          label: `คุณ${o.name}`,
          value: String(o.count),
          unit: "รายการ",
          trend: o.count > 1 ? "ต้องติดตามใกล้ชิด" : "อยู่ในเกณฑ์ปกติ",
          trendDown: o.count > 1,
        })),
      },
    ],
    followUp: "ตรวจความเสี่ยงในตู้ cold room",
  },
  {
    id: "cold-room-risk",
    question: "ตัวอย่างใดในตู้ cold room ที่ความคงตัวมีความเสี่ยงบ้าง",
    thinking: [
      "อ่านค่าเซนเซอร์ทั้ง 4 จุดย้อนหลัง 24 ชั่วโมง",
      "ตรวจหาช่วงที่อุณหภูมิเกินเกณฑ์ที่กำหนด",
      "จับคู่ตัวอย่างกับตำแหน่งจัดเก็บที่ได้รับผลกระทบ",
    ],
    answer:
      "วันนี้ Freezer-B มีค่าอุณหภูมิสูงเกินกำหนดที่ -11.2 องศา (กำหนดไว้ไม่เกิน -18 องศา) ส่วน Sample ที่มีความเสี่ยงมีทั้งหมด 4 รายการ ที่ถูกกำหนดจัดเก็บไม่เกิน -18 องศา ประกอบด้วย SMP-2569-04820, SMP-2569-04818, SMP-2569-04821 และ SMP-2569-04816 คุณต้องการที่จะทำการตรวจสอบและบันทึกผลการตรวจสอบเลยไหม",
    blocks: [
      {
        kind: "temp-chart",
        title: "อุณหภูมิ Freezer-B ย้อนหลัง 24 ชั่วโมง",
        points: AI_FREEZER_TREND,
        limit: AI_FREEZER_LIMIT,
        unit: "°C",
        badge: { tone: "red", label: "-11.2°C · วิกฤต" },
        note: "อุณหภูมิเกินเกณฑ์ -18°C ต่อเนื่องมาแล้ว 3 ชั่วโมง 20 นาที",
      },
      {
        kind: "table",
        title: "ตัวอย่างที่มีความเสี่ยงด้านความคงตัว",
        columns: ["รหัสตัวอย่าง", "ตัวอย่าง", "ผู้ดูแลปัจจุบัน", "ระดับความเสี่ยง"],
        rows: AI_AT_RISK_SAMPLES,
      },
    ],
    followUp: "ตรวจสอบและบันทึกผล",
  },
  {
    id: "record-review",
    question: "ได้ทำการตรวจสอบทั้งหมดแล้ว ตัวอย่าง SMP-2569-04820 มีความเห็นว่าจำเป็นต้องทิ้ง และ ทดสอบใหม่",
    thinking: [
      "บันทึกผลการตรวจสอบความคงตัวทั้ง 4 รายการ",
      "อัปเดตสถานะตัวอย่าง SMP-2569-04820 เป็น ทิ้ง และเปิดคำสั่งทดสอบใหม่",
      "เขียน Audit Trail ตามข้อกำหนด ISO/IEC 17025",
    ],
    answer:
      "ระบบได้ทำการบันทึกค่า เป็นที่เรียบร้อยแล้ว คุณต้องการให้ตรวจสอบเรื่องไหนเพิ่มเติมไหม",
    blocks: [
      {
        kind: "record",
        title: "ผลการตรวจสอบที่บันทึกแล้ว",
        rows: [
          { id: "SMP-2569-04820", name: "ปัสสาวะ 24 ชม.", action: "ทิ้ง + เปิดคำสั่งทดสอบใหม่", status: { tone: "red", label: "ทิ้ง / ทดสอบใหม่" } },
          { id: "SMP-2569-04818", name: "เนื้อเยื่อชิ้นเนื้อ", action: "ย้ายเข้า Freezer-A (-80°C)", status: { tone: "amber", label: "เฝ้าระวังต่อ" } },
          { id: "SMP-2569-04821", name: "เลือด EDTA – ผู้ป่วยนอก", action: "ย้ายเข้า Freezer-A (-80°C)", status: { tone: "amber", label: "เฝ้าระวังต่อ" } },
          { id: "SMP-2569-04816", name: "ซีรั่ม – แผนกภูมิคุ้มกัน", action: "ย้ายเข้า Freezer-A (-80°C)", status: { tone: "amber", label: "เฝ้าระวังต่อ" } },
        ],
        audit: [
          { label: "รหัสอ้างอิง", value: "AUD-2569-1183" },
          { label: "ผู้บันทึก", value: "ธเนศ สุขใจ · Lab Manager" },
          { label: "เวลาบันทึก", value: "21 ก.ค. 2569 · 11:42" },
          { label: "คำสั่งทดสอบใหม่", value: "TST-2569-0917" },
        ],
      },
    ],
  },
];

export const AI_GREETING =
  "สวัสดีครับ ผมคือผู้ช่วยอัจฉริยะของ Thanes LIMS เชื่อมต่อกับทะเบียนตัวอย่าง เซนเซอร์สภาพแวดล้อม และคลังเอกสารของห้องปฏิบัติการแบบเรียลไทม์ ลองเลือกคำถามด้านล่าง หรือพิมพ์คำถามของคุณได้เลยครับ";

export const AI_FALLBACK =
  "ตอนนี้ยังไม่พบข้อมูลเพิ่มเติมที่เกี่ยวข้องกับคำถามนี้ในชุดข้อมูลเดโมครับ คุณสามารถกด “เริ่มบทสนทนาใหม่” เพื่อทบทวนบทสนทนาตั้งแต่ต้น หรือสอบถามเรื่องตัวอย่างรับเข้า ผู้รับผิดชอบ และสภาพแวดล้อมการจัดเก็บได้ครับ";
