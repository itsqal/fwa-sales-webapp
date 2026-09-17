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

/** Which kind of order a status belongs to. Both enums contain `DITERIMA`. */
export type PoKind = "msisdn-po" | "device-po";

/**
 * Where one side of a record reads the same state differently, the word changes
 * here and nowhere else. The status value on the wire never changes.
 *
 * The rule is the same on both orders: `DITERIMA` means the counterparty has
 * received what was asked for, so the party that fulfilled it reads the order as
 * *Selesai*, while the party that received it keeps *Diterima*.
 *
 * It is keyed by order kind as well as role because a Device Partner is the
 * receiver on an MSISDN PO and the fulfiller on a device PO — the same role
 * needs different words on its two screens.
 */
const CONTEXT_LABELS: Record<
  PoKind,
  Partial<Record<string, Partial<Record<AnyPoStatus, string>>>>
> = {
  // IOH supplied the numbers; the Device Partner received them.
  "msisdn-po": { IOH_ADMIN: { DITERIMA: "Selesai" } },
  // The Device Partner shipped the devices; the MPX received them.
  "device-po": { DP_ADMIN: { DITERIMA: "Selesai" } },
};

export function statusLabel(
  status: string,
  context?: { kind: PoKind; role?: string },
): string {
  const override =
    context?.role !== undefined
      ? CONTEXT_LABELS[context.kind][context.role]?.[status as AnyPoStatus]
      : undefined;
  return override ?? LABELS[status as AnyPoStatus] ?? status;
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

/** The milestone values the API records against a shipment. */
export type ShipmentMilestone =
  | "SHIPPED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

export type TrackerStepKey = "PREPARING" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED";

export interface TrackerStep {
  key: TrackerStepKey;
  label: string;
  icon: string;
  /** API milestones that complete this step, earliest first. */
  milestones: readonly ShipmentMilestone[];
  /** What a Device Partner records to complete it by hand. Absent: never by hand. */
  recordAs?: ShipmentMilestone;
}

const statusIcon = (name: string) => `/assets/icons/status/${name}.svg`;

/**
 * The four steps of the Delivery Progress tracker, and how each maps onto the
 * milestones the API actually stores. The tracker shows steps; the API stores
 * milestones; this is the one place the two meet.
 *
 * * **Preparing** is not a milestone. It is the packing that happens before the
 *   courier takes the box, so it is complete as soon as a shipment exists.
 * * **Shipped** is recorded by the API itself when the Device Partner ships, so
 *   nobody ever marks it by hand.
 * * **In Transit** also accepts `OUT_FOR_DELIVERY`, which the API still defines
 *   and older shipments may carry. It is never offered as a step of its own.
 */
export const TRACKER_STEPS: readonly TrackerStep[] = [
  { key: "PREPARING", label: "Preparing", icon: statusIcon("box"), milestones: [] },
  {
    key: "SHIPPED",
    label: "Shipped",
    icon: statusIcon("truck"),
    milestones: ["SHIPPED"],
  },
  {
    key: "IN_TRANSIT",
    label: "In Transit",
    icon: statusIcon("truck"),
    milestones: ["IN_TRANSIT", "OUT_FOR_DELIVERY"],
    recordAs: "IN_TRANSIT",
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    icon: statusIcon("check"),
    milestones: ["DELIVERED"],
    recordAs: "DELIVERED",
  },
];
