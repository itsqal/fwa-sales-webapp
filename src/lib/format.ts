import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Money is an integer of whole rupiah everywhere in this app. It is formatted
 * here and nowhere else — never stored or computed on a formatted string.
 */
export function idr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

export function count(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("id-ID").format(value);
}

/** `23 Mei 2025` — the table date format. */
export function dateId(value: string | null | undefined): string {
  const d = parse(value);
  return d ? format(d, "d MMMM yyyy", { locale: id }) : "—";
}

/** `03/07/2025` — the Riwayat panel's compact column. */
export function dateShort(value: string | null | undefined): string {
  const d = parse(value);
  return d ? format(d, "dd/MM/yyyy", { locale: id }) : "—";
}

/** `Pukul 12.13` — detail panels show the time above the date. */
export function timeId(value: string | null | undefined): string {
  const d = parse(value);
  return d ? `Pukul ${format(d, "HH.mm", { locale: id })}` : "—";
}

/** `Selasa, 3 Juli 2025` — detail panels. */
export function dateLongId(value: string | null | undefined): string {
  const d = parse(value);
  return d ? format(d, "EEEE, d MMMM yyyy", { locale: id }) : "—";
}

/** `13 Juli` — the delivery tracker's milestone captions. */
export function dateDayMonth(value: string | null | undefined): string {
  const d = parse(value);
  return d ? format(d, "d MMMM", { locale: id }) : "—";
}

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * PO codes are long and get truncated in tables. Middle ellipsis rather than a
 * trailing one: the tail carries the sequence number, which is what
 * distinguishes two codes raised on the same day.
 */
export function truncateMiddle(value: string, max = 22): string {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}
