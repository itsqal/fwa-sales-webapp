/**
 * THE status label and variant maps. Golden rule #1: status values are API
 * values, and there is exactly one place where one becomes a word and exactly
 * one place where it becomes a colour.
 *
 * Both enums are canonical in `openapi.yaml`. In particular the DP device-PO
 * mockup labels `DIKIRIM` as *Delivery* while the MPX mockup labels the same
 * state *Dikirim*; one state, two words, and `Dikirim` is the one that ships.
 */

export type MsisdnPoStatus =
  | "DIAJUKAN"
  | "DIPROSES"
  | "DITERIMA"
  | "DITOLAK"
  | "DIBATALKAN";

export type DevicePoStatus =
  | "DIAJUKAN"
  | "DIPROSES"
  | "DIKIRIM"
  | "PERIKSA"
  | "DITERIMA"
  | "DITOLAK"
  | "DIBATALKAN";

export type AnyPoStatus = MsisdnPoStatus | DevicePoStatus;

const LABELS: Record<AnyPoStatus, string> = {
  DIAJUKAN: "Diajukan",
  DIPROSES: "Diproses",
  DIKIRIM: "Dikirim",
  PERIKSA: "Periksa",
  DITERIMA: "Diterima",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
};

/**
 * Tailwind classes per status. Colour never carries the meaning on its own —
 * every badge renders its label too.
 *
 * `PERIKSA` is red because that is what the asset pack ships. It is a normal
 * step on the happy path, so red arguably overstates it (issue #10 in
 * `UI Review — Issues & Decisions.md`); that is a design decision, still open.
 */
const VARIANTS: Record<AnyPoStatus, string> = {
  DIAJUKAN: "bg-status-diajukan text-white",
  DIPROSES: "bg-status-diproses text-white",
  DIKIRIM: "bg-status-dikirim text-white",
  PERIKSA: "bg-status-periksa text-white",
  DITERIMA: "bg-status-diterima text-white",
  DITOLAK: "bg-status-ditolak text-white",
  DIBATALKAN: "bg-status-dibatalkan text-white",
};

export function statusLabel(status: string): string {
  return LABELS[status as AnyPoStatus] ?? status;
}

export function statusVariant(status: string): string {
  return VARIANTS[status as AnyPoStatus] ?? "bg-text-muted text-white";
}

export const MSISDN_PO_STATUSES: MsisdnPoStatus[] = [
  "DIAJUKAN",
  "DIPROSES",
  "DITERIMA",
  "DITOLAK",
  "DIBATALKAN",
];

export const DEVICE_PO_STATUSES: DevicePoStatus[] = [
  "DIAJUKAN",
  "DIPROSES",
  "DIKIRIM",
  "PERIKSA",
  "DITERIMA",
  "DITOLAK",
  "DIBATALKAN",
];

/* -------------------------------------------------------------------------
 * Which actions a status permits.
 *
 * These are not derivations of server state — they gate whether a button is
 * rendered, nothing more. The server validates every transition and is the
 * only thing that moves a PO; a stale tab gets a 409, which is why these are
 * allowed to be a hint rather than a guarantee.
 * ---------------------------------------------------------------------- */

export const msisdnPo = {
  canCancel: (s: string) => s === "DIAJUKAN",
  canProcess: (s: string) => s === "DIAJUKAN",
  canSupply: (s: string) => s === "DIAJUKAN" || s === "DIPROSES",
  canReject: (s: string) => s === "DIAJUKAN" || s === "DIPROSES",
  canPair: (s: string) => s === "DITERIMA",
  hasNumbers: (s: string) => s === "DITERIMA",
};

export const devicePo = {
  canCancel: (s: string) => s === "DIAJUKAN",
  canAccept: (s: string) => s === "DIAJUKAN",
  canReject: (s: string) => s === "DIAJUKAN",
  canAttachBundles: (s: string) => s === "DIPROSES",
  canShip: (s: string) => s === "DIPROSES",
  hasShipment: (s: string) =>
    s === "DIKIRIM" || s === "PERIKSA" || s === "DITERIMA",
  canInspect: (s: string) => s === "DIKIRIM",
  canConfirmReceipt: (s: string) => s === "PERIKSA",
  hasBundles: (s: string) =>
    s === "DIPROSES" || s === "DIKIRIM" || s === "PERIKSA" || s === "DITERIMA",
};

/** The four steps of the Delivery Progress tracker, in order. */
export const SHIPMENT_MILESTONES = [
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export type ShipmentMilestone = (typeof SHIPMENT_MILESTONES)[number];

const MILESTONE_LABELS: Record<ShipmentMilestone, string> = {
  SHIPPED: "Shipped",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

export function milestoneLabel(m: string): string {
  return MILESTONE_LABELS[m as ShipmentMilestone] ?? m;
}

/** Icon file in `public/assets/icons/status/`, one per milestone. */
export function milestoneIcon(m: string): string {
  const slug = m.toLowerCase().replace(/_/g, "-");
  return `/assets/icons/status/${slug}.svg`;
}
