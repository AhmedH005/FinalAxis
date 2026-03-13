import { format, isToday, isYesterday } from 'date-fns';
import type { UnitSystem } from '@/lib/supabase/database.types';

// ─── Weight ──────────────────────────────────────────────────────────────────

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 10) / 10;
}

export function toStorageWeight(value: number, units: UnitSystem): number {
  return units === 'imperial' ? lbsToKg(value) : value;
}

export function toDisplayWeight(kg: number, units: UnitSystem): number {
  return units === 'imperial' ? kgToLbs(kg) : kg;
}

export function weightLabel(units: UnitSystem): string {
  return units === 'imperial' ? 'lbs' : 'kg';
}

// ─── Height ──────────────────────────────────────────────────────────────────

export function cmToFeetInches(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

export function toStorageHeight(value: number, units: UnitSystem): number {
  return units === 'imperial' ? Math.round(value * 2.54) : value;
}

// ─── Duration ────────────────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Sleep ───────────────────────────────────────────────────────────────────

export function formatSleepEnd(isoString: string): string {
  const d = new Date(isoString);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

// ─── Hydration ───────────────────────────────────────────────────────────────

export function formatHydration(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${Math.round(ml)}ml`;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for local today */
export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Returns ISO string for start of a given local date (YYYY-MM-DD) */
export function dayStart(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

/** Returns ISO string for end of a given local date (YYYY-MM-DD) */
export function dayEnd(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

/** Returns YYYY-MM-DD N days ago */
export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return format(d, 'yyyy-MM-dd');
}

// ─── Progress ────────────────────────────────────────────────────────────────

export function progressPct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}
