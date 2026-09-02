import { StatusBadge } from "./status-badge";
import { dateShort } from "@/lib/format";
import type { StatusHistoryEntry } from "@/lib/api/types";

/**
 * The *Riwayat* panel: a straight render of the status history.
 *
 * Every transition writes its row in the same transaction as the status change,
 * which is the only reason this is trustworthy. If it ever looks wrong, the
 * transition discipline is wrong — do not paper over it here.
 *
 * The *keterangan* column is where the shipment step puts
 * `J&T Express | JD0463672772`.
 */
export function PoHistoryPanel({
  entries,
}: {
  entries: StatusHistoryEntry[];
}) {
  return (
    <div className="rounded-card border border-border-subtle bg-surface-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="px-5 py-4 text-left font-normal text-text-secondary">
              Tanggal
            </th>
            <th className="px-5 py-4 text-left font-normal text-text-secondary">
              Status
            </th>
            <th className="px-5 py-4 text-left font-normal text-text-secondary">
              Oleh
            </th>
            <th className="px-5 py-4 text-left font-normal text-text-secondary">
              Keterangan
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-text-muted">
                Belum ada riwayat.
              </td>
            </tr>
          )}
          {entries.map((entry, index) => (
            <tr
              key={`${entry.changedAt}-${index}`}
              className="border-b border-border-subtle last:border-0"
            >
              <td className="px-5 py-4 text-text-secondary">
                {dateShort(entry.changedAt)}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={entry.newStatus} />
              </td>
              <td
                className="max-w-[10rem] truncate px-5 py-4 text-text-secondary"
                title={entry.changedBy}
              >
                {entry.changedBy ?? "—"}
              </td>
              <td className="px-5 py-4 text-text-secondary">
                {entry.note?.trim() ? entry.note : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
