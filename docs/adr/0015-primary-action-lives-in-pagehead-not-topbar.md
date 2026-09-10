# Primary action อยู่ที่ `PageHead` เท่านั้น — topbar ไม่มีปุ่ม action

> เลข 0012 เว้นไว้ให้ ADR ของ branch `redesign/lab-instrument-ui` ที่ยังไม่ merge

`components/topbar.tsx` เดิมมีปุ่ม "เพิ่มรายการใหม่" (`variant="ink"`) ที่ route-aware — map
`addModalByModule` แปลงโมดูลปัจจุบันเป็น `ModalKey` แล้ว `openModal()` ปุ่มนี้ซ้ำกับปุ่ม
primary `variant="teal"` ที่อยู่ใน `PageHead actions=` ของทุกหน้าอยู่แล้ว (ทั้ง 6 โมดูล:
samples, equipment, environment, inventory, documents, tests เปิด modal key เดียวกัน) และ
บน mobile มันเบียดกับ code+ชื่อโมดูล + theme toggle + กระดิ่ง บนแถบสูง 60px

ตัดสินใจ: **primary action มี source เดียวคือ `PageHead`** ลบปุ่ม + map `addModalByModule`
ออกจาก topbar ทุก breakpoint (ไม่ใช่แค่ซ่อนบน mobile) topbar เหลือเฉพาะ navigation +
utility (hamburger, search, theme toggle, กระดิ่ง) ต่อจาก ADR-0003 ที่ให้ `app/(app)/`
layout ถือ Topbar/Sidebar ร่วมกัน — ADR นี้ narrow บทบาท Topbar ให้ไม่ถือ action

พร้อมกันนี้ปรับ topbar บน `< md` ให้ปุ่ม icon ทั้งสาม (hamburger / theme toggle / กระดิ่ง)
เป็น touch target 44×44 (desktop คง 38×38), ลด `px-6 gap-4` → `px-4 gap-2`, และครอบ
code+ชื่อโมดูลด้วย `min-w-0 truncate` กันดันปุ่มตกขอบ

## ต่อเนื่อง: บน mobile topbar เป็น page identity, `PageHead` title/desc เป็น desktop chrome

(เพิ่มใน PR ถัดมา — งาน mobile density เดียวกัน) บน `< md` `PageHead` (`components/ui.tsx`)
ซ่อน title + description ที่กินแนวตั้ง ~120px ใต้ topbar โดย title ซ้ำกับ code+ชื่อโมดูล
ที่ topbar โชว์อยู่แล้ว:

- title → `sr-only` (คง `<h1>` ให้ screen reader / SEO ไม่กินพื้นที่จอ)
- description → `hidden md:block`
- แถว `actions` คงไว้ ชิดขวา + `flex-wrap` (ปุ่ม primary ยังอยู่ตามหลักด้านบน และแก้เคส
  `/equipment` ที่มี 4 ปุ่มล้นแนวนอนบน mobile ไปในตัว)

topbar จึงเป็น "ชื่อหน้า" ที่ผู้ใช้เห็นบน mobile `PageHead` title/desc กลายเป็น chrome
เฉพาะ desktop ที่พื้นที่เหลือเฟือ

## Considered Options

- **เก็บปุ่มไว้บน desktop (≥ md) ถอดเฉพาะ mobile** — ปฏิเสธ: ยังต้องคง `addModalByModule`
  map + `openModal` ใน topbar ทั้งก้อน และทำให้มีสองที่ที่เปิด add modal ได้ ต้อง sync กัน
  ตลอด การ coverage ของ `PageHead` ครบทั้ง 6 โมดูลอยู่แล้วจึงไม่มีเหตุให้เก็บ
- **ยุบปุ่ม utility (theme/กระดิ่ง) เข้า overflow menu บน mobile** — ปฏิเสธในเฟสนี้: เป็น
  icon เดี่ยวไม่มี label ไม่ได้เบียด ปัญหาจริงคือปุ่ม action ที่มี label ยาว
- **ทำ FAB สำหรับ primary action บน mobile** — ปฏิเสธ: `PageHead` มีปุ่ม teal ที่เด่นพออยู่
  แล้ว FAB เพิ่ม pattern ใหม่ที่ต้องดูแลทุกหน้าโดยไม่ได้แก้ปัญหาที่มี
- **ขยาย `Button` primitive ทั้งระบบให้สูง ≥ 44px** — เลื่อนออกไปก่อน: กระทบ layout
  หนาแน่นหลายที่ (PageHead actions, ตาราง, modal footer) เสี่ยง regression ทำเฉพาะ 3 ปุ่ม
  icon บน topbar ที่อยู่ใน scope "navbar"

## Consequences

- `components/topbar.tsx`: ลบ import `Button` (L7) และ `type ModalKey` (L9), ลบ `openModal`
  จาก `useLims()` destructure, ลบ map + `const addModal` + JSX ปุ่ม — ไม่มี dead code เหลือ
- โปรเจคไม่มี test infra (ไม่มี playwright/vitest/jest) — การถอดปุ่มไม่กระทบ automated test
- ระหว่าง 640–767px (`sm`–`md`) เดิมปุ่มโผล่ ตอนนี้หายไปด้วย — ผู้ใช้ใช้ปุ่มใน `PageHead` แทน
- โมดูลที่ไม่เคยมี mapping (dashboard, ai-chat, locations, vendors, users, profile) ไม่มี
  ผลอะไร — topbar ของหน้าเหล่านั้นไม่เคยมีปุ่มนี้
- topbar บน `< md`: ปุ่ม 44×44 ทำให้แถบดู "หนา" ขึ้นเล็กน้อยบน mobile แต่ยังอยู่ในกรอบสูง
  60px เดิม (44 < 60)
- `PageHead` บน `< md`: หน้าที่ไม่มี `actions` (dashboard, vendors, users, profile, locations,
  ai-chat) จะเหลือแค่ `<h1 class="sr-only">` — content เริ่มชิดใต้ topbar ทันที `mb-5` ของ
  `PageHead` ต้องเป็น responsive (`mb-0 md:mb-5` เมื่อไม่มีอะไรแสดง / `mb-4 md:mb-5` เมื่อมี
  actions) กันช่องว่างค้าง
