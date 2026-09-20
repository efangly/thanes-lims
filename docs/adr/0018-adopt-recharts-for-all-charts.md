# ใช้ Recharts สำหรับกราฟข้อมูลทั้งหมด (เก็บ `Ring` เป็น SVG เดิม)

กราฟทุกตัวเดิมเป็น SVG เขียนมือใน `components/ui.tsx` (polyline + คำนวณ scale/hover เอง) พอ
ต้องทำกราฟย้อนหลัง partner device (หลาย probe, แถบ min–max, แกนเวลาจริง, tooltip) โค้ดเขียนมือ
ยาวและดูแลยาก และ `BarChart` เดิมใช้ค่าข้อมูลเป็น pixel height ตรง ๆ (นับ 3 รายการ = สูง 3px)

ตัดสินใจ: เพิ่ม **Recharts** (v3, รองรับ React 19) และย้ายกราฟข้อมูลทั้งหมดไป `components/charts.tsx`:
`HistoryChart`, `TimeseriesChart`, `BarChart` (stacked), `Donut` (PieChart)
- **คง props ของ component เดิมทุกตัว** และ re-export จาก `components/ui.tsx` → หน้าที่เรียกใช้ไม่ต้องแก้
- สีส่งเป็น CSS var (`var(--color-teal)`) เพื่อให้ light/dark theme ทำงานต่อ; tooltip เขียน `content`
  เองให้หน้าตาเหมือน token ของระบบ (`border-line bg-panel shadow-card`, ตัวเลข mono)
- render กราฟหลัง mount (`ResponsiveContainer` วัดขนาด 0×0 ตอน SSR) และปิด animation
- **เก็บ `Ring`** เป็น SVG เดิม: เป็น progress indicator 40px ต่อแถวตาราง ไม่ใช่กราฟข้อมูล
  การใช้ RadialBarChart จะหนักเกินเหตุ
- ลบ `Sparkline` และ `AreaChart` ที่ไม่มีที่ไหนเรียกใช้
- พฤติกรรมที่เปลี่ยนโดยตั้งใจ: แท่ง `BarChart` ใน dashboard ใช้ scale จริงตามจำนวน แทน pixel ตรง ๆ

## Considered Options

- **เขียน SVG มือต่อ** — ปฏิเสธ: ต้องเขียน hover/แกน/tooltip/responsive ซ้ำทุกกราฟ
- **ย้ายเฉพาะหน้า partner device** — ปฏิเสธ: ทิ้งสองแนวทางในโปรเจคเดียว (ผู้ใช้ต้องการให้ใช้ Recharts ทั้งหมด)
- **ย้าย `Ring` ด้วย** — ปฏิเสธ: ดูเหตุผลข้างบน

ผลข้างเคียง: bundle เพิ่ม (~100 kB+ gzip) ในหน้าที่มีกราฟ ถ้าเป็นปัญหาให้แยกโหลดด้วย `next/dynamic` ภายหลัง
