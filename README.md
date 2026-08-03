# Thanes LIMS

ระบบบริหารจัดการข้อมูลห้องปฏิบัติการ (Laboratory Information Management System) สร้างด้วย **Next.js 16 (App Router)** + **Tailwind CSS v4** พร้อมรองรับ **Light / Dark theme** ผ่าน `next-themes`

## เริ่มต้นใช้งาน

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. รันโหมดพัฒนา (Turbopack)
npm run dev

# 3. เปิดเบราว์เซอร์
# http://localhost:3000
```

คำสั่งอื่น: `npm run build` (สร้าง production), `npm run start` (รัน production), `npm run lint`

## Stack

- **Next.js 16** — App Router, React 19, Turbopack, React Compiler-ready
- **Tailwind CSS v4** — CSS-first config ผ่าน `@theme` ใน `app/globals.css` (ไม่มี `tailwind.config.js`)
- **next-themes** — สลับ light/dark ด้วย class `.dark` บน `<html>`
- **TypeScript** — typed mock data ทั้งหมดใน `lib/data.ts`

## โครงสร้างโปรเจกต์

```
thanes-lims/
├── app/
│   ├── globals.css        # Tailwind v4 + design tokens (light & dark)
│   ├── layout.tsx         # Root layout + ThemeProvider + fonts
│   └── page.tsx           # หน้าหลัก → <LimsApp/>
├── components/
│   ├── lims-app.tsx       # App shell + view routing (client state)
│   ├── sidebar.tsx        # เมนูนำทาง 6 โมดูล
│   ├── topbar.tsx         # breadcrumb, ค้นหา, แจ้งเตือน, theme toggle
│   ├── theme-provider.tsx # ครอบ next-themes
│   ├── theme-toggle.tsx   # ปุ่มสลับธีม (hydration-safe)
│   ├── ui.tsx             # UI primitives: Card, Tag, KpiCard, charts ฯลฯ
│   └── modules/           # 6 โมดูลหลัก + dashboard
│       ├── dashboard.tsx
│       ├── samples.tsx      # 01 การจัดการตัวอย่าง + Chain of Custody
│       ├── equipment.tsx    # 02 การจัดการเครื่องมือ
│       ├── environment.tsx  # 03 ควบคุมสภาพแวดล้อม (live readout)
│       ├── inventory.tsx    # 04 สินค้าคงคลัง + auto-reorder
│       ├── documents.tsx    # 05 การจัดการเอกสาร + version history
│       └── tests.tsx        # 06 ทดสอบ & วิเคราะห์ (AI panel)
└── lib/
    ├── data.ts            # types + mock data
    └── icons.tsx          # SVG icon components
```

## ระบบธีม (Theming)

Design tokens ถูกกำหนดเป็น CSS variables ใน `app/globals.css`:

- `:root { ... }` — ค่าสำหรับ **light mode**
- `.dark { ... }` — override สำหรับ **dark mode**
- `@theme inline { ... }` — แมป variables เข้า Tailwind utilities (เช่น `bg-panel`, `text-muted`, `border-line`)

`next-themes` เพิ่ม/ลบ class `.dark` บน `<html>` เมื่อผู้ใช้กดปุ่มสลับ ทำให้ทุก component เปลี่ยนสีอัตโนมัติโดยไม่ต้องเขียน logic ในแต่ละที่ ปุ่มสลับอยู่ที่ `components/theme-toggle.tsx` (มุมขวาบน)

## ต่อยอด (ขั้นตอนถัดไป)

- เชื่อม backend จริง: แทนที่ข้อมูลใน `lib/data.ts` ด้วย API / Server Components (Cache Components ของ Next 16)
- เพิ่ม routing จริงต่อโมดูล: แยกเป็น `app/samples/page.tsx` ฯลฯ แทน client state
- Auth & Role-Based Access Control: NextAuth (Auth.js v5) ตามที่ออกแบบในโมดูลเอกสาร
- ต่อ sensor / IoT จริงเข้าโมดูลสภาพแวดล้อม (WebSocket แทน mock clock)
- เชื่อม AI analysis เข้าโมดูลทดสอบ (ฟังก์ชันเสริมในอนาคต)

หมายเหตุ: ข้อมูลทั้งหมดเป็น mock สำหรับสาธิต UI/UX
