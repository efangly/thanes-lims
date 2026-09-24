import type { Tag } from "@/lib/data";
import type { CalibrationSchedule } from "@/lib/equipment-api";
import { formatDate } from "@/lib/backend-mappers";

const DUE_SOON_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

export interface CalibrationStanding {
  /** Tag for the status chip. */
  status: Tag;
  /** Localised due date of the soonest schedule, or a placeholder when there is none. */
  nextDueLabel: string;
  /** 0–100 for the remaining-time ring, or null when there is no schedule. */
  pct: number | null;
  /** Ring colour token. */
  ringColor: string;
  hasSchedule: boolean;
}

/**
 * ADR-0006: the equipment table's due date and ring come from the soonest-due
 * CalibrationSchedule. The status *badge* now comes from the backend's
 * `calibration_status` (ADR-0020) — `status` here is kept for older callers.
 */
export function calibrationStanding(schedules: CalibrationSchedule[], now: Date = new Date()): CalibrationStanding {
  if (schedules.length === 0) {
    return {
      status: { tone: "grey", label: "ยังไม่ตั้งรอบสอบเทียบ" },
      nextDueLabel: "—",
      pct: null,
      ringColor: "var(--color-line)",
      hasSchedule: false,
    };
  }

  const soonest = schedules.reduce((a, b) => (new Date(a.nextDueDate) <= new Date(b.nextDueDate) ? a : b));
  const due = new Date(soonest.nextDueDate);
  const msLeft = due.getTime() - now.getTime();
  const daysLeft = msLeft / DAY;

  // Ring horizon: the schedule's own interval when it has one, else 180 days.
  const horizonDays = soonest.intervalMonths ? soonest.intervalMonths * 30 : 180;
  const pct = Math.max(0, Math.min(100, Math.round((daysLeft / horizonDays) * 100)));

  let status: Tag;
  let ringColor: string;
  if (msLeft < 0) {
    status = { tone: "red", label: "เลยกำหนด" };
    ringColor = "var(--color-red)";
  } else if (daysLeft <= DUE_SOON_DAYS) {
    status = { tone: "amber", label: "ใกล้สอบเทียบ" };
    ringColor = "var(--color-amber)";
  } else {
    status = { tone: "green", label: "พร้อมใช้" };
    ringColor = "var(--color-green)";
  }

  return { status, nextDueLabel: formatDate(soonest.nextDueDate), pct, ringColor, hasSchedule: true };
}

/** Localised due date of the soonest schedule (Calibration or Maintenance), or null when there is none. */
export function soonestDueLabel(schedules: CalibrationSchedule[]): string | null {
  if (schedules.length === 0) return null;
  const soonest = schedules.reduce((a, b) => (new Date(a.nextDueDate) <= new Date(b.nextDueDate) ? a : b));
  return formatDate(soonest.nextDueDate);
}

/** Groups a flat schedule list by equipment id. */
export function groupSchedules(schedules: CalibrationSchedule[]): Map<string, CalibrationSchedule[]> {
  const by = new Map<string, CalibrationSchedule[]>();
  for (const s of schedules) {
    const list = by.get(s.equipmentId) ?? [];
    list.push(s);
    by.set(s.equipmentId, list);
  }
  return by;
}
