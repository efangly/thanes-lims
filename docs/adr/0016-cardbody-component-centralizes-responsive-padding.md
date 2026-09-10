# Card padding รวมศูนย์ที่ `CardBody` component เดียว + responsive (mobile compact)

`Card` (`components/ui.tsx`) ไม่มี padding ในตัว — ตั้งแค่ `rounded-[10px] border bg-panel
shadow-card` padding ของเนื้อหาการ์ดกระจายเป็น literal ในหลายสิบไฟล์ และมี ≥ 4 convention
แข่งกัน: `px-5 py-4`, `px-5 py-3.5`, `p-[18px]`, `px-[18px] py-3.5` ส่วนใหญ่ยัง fuse padding
เข้ากับ `flex flex-col gap-3.5` / `grid ... gap-3` / `border-b` บน mobile `p-6` ของ content
wrapper (`app/(app)/layout.tsx`) ซ้อนกับ padding การ์ดแต่ละใบ + KPI 4 ใบเต็มความกว้าง ทำให้
เนื้อหาจริงเหลือพื้นที่น้อย

ตัดสินใจ: สร้าง **`CardBody`** — signature เดียวกับ `Card` (`{ children, className = "" }`,
inline prop type, ไม่มี forwardRef), padding responsive default **`p-4 md:px-[18px]
md:py-[15px]`** (mobile 16px, desktop ตรงกับ `CardHead`) `className` ต่อท้ายสุดเพื่อส่ง
`flex`/`gap`/`grid`/`border-b` ผ่านเข้าไป migrate card-body ที่มี padding จริง (~16 จุด)
มาใช้ `CardBody` — ยอมรับว่าการ์ดที่เดิม `px-5 py-4` (20/16) จะ normalize เป็น 18/15 บน
desktop (ต่าง ~2px)

พร้อมกันปรับ padding แบบ mobile-compact ที่จุดรวมอื่น:
- `CardHead` → `px-4 py-3.5 md:px-[18px] md:py-[15px]`
- `KpiCard` → `p-3 md:p-4`
- content wrapper (`app/(app)/layout.tsx`) → `p-4 md:p-6`
- modal shell (`components/modal.tsx`) body/header/footer → mobile-compact เทียบเท่า
- environment readout strip + gauge cells (ไม่อยู่ใน `Card`) → แก้ className ตรง ๆ ให้
  responsive ไม่ผ่าน `CardBody`

## Considered Options

- **ลด padding ทุก breakpoint (desktop ด้วย)** — ปฏิเสธ: ปัญหาอยู่ที่พื้นที่จอ mobile
  desktop ไม่ได้บ่น responsive คุมความเสี่ยง regression บน layout หนาแน่นบน desktop
- **`CardBody` มี prop `pad?: "default" | "tight" | "none"`** — ปฏิเสธ: กลับไปมีหลาย
  convention อีก ค่าเดียว + normalize ~2px คุ้มกว่า การ์ดที่ต้อง `p-0` จริง ๆ (scroll/table
  wrapper) แค่ไม่ใช้ `CardBody` ตรงนั้น
- **แก้ literal ทีละจุดในที่ ไม่สร้าง component** — ปฏิเสธ: ไม่แก้รากของเรื่อง (padding
  กระจัดกระจายเป็น literal) ครั้งหน้าที่อยากปรับ density ต้องไล่ทั้งโปรเจคอีก
- **introduce Tailwind `@theme` spacing token (`--spacing-card`)** — ปฏิเสธในเฟสนี้: token
  ตัวเดียวไม่ครอบ padding แบบ asymmetric ที่มีอยู่ และ `CardBody` ให้ที่แขวน layout class
  ด้วย token เก็บไว้พิจารณาถ้ามี density scale หลายระดับในอนาคต
- **รวม table cell (~27 จุด) + empty-state (~25 จุด) ใน PR เดียวกัน** — เลื่อนออกไป:
  กระทบ readability ต้องดูจริงบนอุปกรณ์ แยก PR ให้ revert อิสระได้

## Consequences

- `CardBody` เป็น PR แยกจาก ADR-0015 (topbar) — migration กว้าง (~16 ไฟล์) review/​revert
  แยกกันได้
- กลุ่ม bare `<div>` ที่ลูก ๆ self-pad (`px-4`/`px-5 py-…` ที่ row) = ไม่แตะ padding อยู่ที่ row
- scroll wrapper (`overflow-x-auto lg:flex-1`), grid-centered card (`document-preview-panel`),
  hand-rolled card header = ไม่ใช่ `CardBody` candidate ข้ามไป
- การ์ดที่เดิม `px-5 py-4` ขยับ desktop เป็น 18/15 — ถือเป็นการ normalize ให้ตรงกับ
  `CardHead` (สม่ำเสมอขึ้น)
- ไม่มี radius/spacing token ใน `globals.css` — `CardBody` ใช้ literal Tailwind class
  ต่อจากแพตเทิร์นเดิมของ `Card`/`CardHead`
