# ใช้ Zustand + TanStack Query + lucide-react + Zod เป็นมาตรฐานของโปรเจค

เดิม `components/lims-data-context.tsx` (Context API) เก็บทั้งข้อมูลจาก backend และ UI state
โหลดด้วย `useEffect` + `Promise.allSettled` และอัปเดต state มือหลังทุก mutation; ไอคอนเป็น SVG
เขียนมือใน `lib/icons.tsx`; response จาก backend เป็น type ระดับ compile-time เท่านั้น (ไม่มี runtime validation)

ตัดสินใจ: แยกหน้าที่และเพิ่ม 4 ไลบรารี
- **TanStack Query** — server state ทั้งหมด (fetch, cache, mutation, invalidate, SSE เขียนลง cache)
- **Zustand** — client/UI state (modal, toast, layout ของ panel ฯลฯ)
- **lucide-react** — ไอคอนหลัก; ถ้า lucide ไม่มีไอคอนที่ตรงกับการใช้งานให้คงไอคอนเขียนเองใน `lib/icons.tsx`
- **Zod** — validate response จาก backend (ใน `apiFetch`) และข้อมูลจากฟอร์ม; ใช้ `z.infer` เป็น type

ย้ายเป็นขั้น ๆ (PR ละหัวข้อ) โดยคง `useLims()` เป็น facade ชั่วคราวเพื่อไม่ให้ทุกหน้าพังพร้อมกัน

## Considered Options

- **คง Context API** — ปฏิเสธ: ไม่มี cache/invalidate, re-render ทั้ง tree เมื่อ slice ใด slice หนึ่งเปลี่ยน
- **Redux Toolkit / RTK Query** — ปฏิเสธ: หนักเกินความจำเป็น ผู้ใช้เลือก Zustand + React Query
- **เขียนไอคอนมือทั้งหมดต่อ** — ปฏิเสธ: ดูแลยาก แต่คงไว้เฉพาะไอคอนที่ lucide ไม่มี
