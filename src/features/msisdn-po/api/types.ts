export type {
  Envelope,
  IssuedMsisdn,
  MsisdnPo,
  MsisdnPoDetail,
  MsisdnPoStatus,
  Paginated,
  PairingResult,
  PairingValidation,
  SupplyResult,
  SupplyValidation,
} from "@/lib/api/types";

import type { PairingRow } from "@/lib/api/types";

/** One `{ msisdn, imei }` pair as the pairing endpoints accept it. */
export type PairingBodyRow = PairingRow;
