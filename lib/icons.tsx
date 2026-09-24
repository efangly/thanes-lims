import type { ComponentType, SVGProps } from "react";
import {
  ArrowRight,
  Battery,
  Bell,
  ChartLine,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Cpu,
  DoorClosed,
  Download,
  Droplet,
  EllipsisVertical,
  ExternalLink,
  File,
  FlaskConical,
  Info,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Microscope,
  Moon,
  Package,
  Pencil,
  Plug,
  Plus,
  Power,
  Printer,
  RotateCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Thermometer,
  Trash2,
  TriangleAlert,
  User,
  Wrench,
  X,
  Zap,
} from "lucide-react";

/**
 * lucide-react เป็นไอคอนหลักของโปรเจค (ADR-0019) — ที่นี่ map ชื่อ domain (`Icons.Sample` ฯลฯ)
 * ไปยังไอคอน lucide เพื่อให้เรียกใช้ด้วยชื่อเดียวกันทั้งแอป
 * ไอคอนที่ lucide ไม่มีให้เขียนเองด้านล่างด้วย stroke แบบเดียวกัน (24×24, stroke 2, round)
 */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

/** lucide ไม่มีไอคอน SD card */
function SdCard(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M15 3l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9z" />
      <path d="M8 3v5h8" />
    </svg>
  );
}

export const Icons = {
  Dashboard: LayoutDashboard,
  Sample: FlaskConical,
  Equipment: Wrench,
  Env: Thermometer,
  Inventory: Package,
  Doc: File,
  Test: ChartLine,
  Microscope,
  Bell,
  Check,
  Clock,
  Bolt: Zap,
  Shield: ShieldCheck,
  Plus,
  Arrow: ArrowRight,
  Edit: Pencil,
  Trash: Trash2,
  Chevron: ChevronRight,
  More: EllipsisVertical,
  Download,
  ExternalLink,
  Refresh: RotateCw,
  Drop: Droplet,
  Cart: ShoppingCart,
  Ai: Cpu,
  Loc: MapPin,
  User,
  Lock,
  Power,
  Printer,
  Logout: LogOut,
  Search,
  Sun,
  Moon,
  Menu,
  Close: X,
  Battery,
  Plug,
  Door: DoorClosed,
  SdCard,
};

export type IconKey = keyof typeof Icons;

/** ชื่อไอคอนแบบ lucide ที่ backend ส่งมาใน field `icon` ของ notification (ดู backend cmd/seed) */
const BACKEND_ICON_ALIASES: Record<string, ComponentType<IconProps>> = {
  AlertTriangle: TriangleAlert,
  AlertCircle: CircleAlert,
  CheckCircle: CircleCheck,
  Info,
  FileText: File,
  Thermometer,
  Clock,
  Bell,
};

/**
 * แปลงชื่อไอคอนจาก backend เป็น component — รับทั้งชื่อ `IconKey` ของเรา (`Env`, `Sample` ...)
 * และชื่อแบบ lucide; ถ้าไม่รู้จักให้ใช้กระดิ่งแทน (ไม่ปล่อยกล่องว่าง)
 */
export function resolveIcon(name: string | null | undefined): ComponentType<IconProps> {
  if (name && Object.hasOwn(Icons, name)) return Icons[name as IconKey];
  if (name && Object.hasOwn(BACKEND_ICON_ALIASES, name)) return BACKEND_ICON_ALIASES[name];
  return Bell;
}
