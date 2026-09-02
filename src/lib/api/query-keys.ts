/**
 * Every TanStack Query key in the app, in one place, so an invalidation after a
 * transition cannot miss a list that shows the same record from the other side.
 */
export const queryKeys = {
  me: ["me"] as const,

  reference: {
    callPlans: ["reference", "call-plans"] as const,
    brands: ["reference", "brands"] as const,
    deviceModels: ["reference", "device-models"] as const,
    devicePartners: ["reference", "device-partners"] as const,
    mpx: ["reference", "mpx"] as const,
  },

  msisdnPos: {
    all: ["msisdn-pos"] as const,
    list: (params: object) =>
      ["msisdn-pos", "list", params] as const,
    detail: (id: string) => ["msisdn-pos", "detail", id] as const,
    numbers: (id: string) => ["msisdn-pos", "numbers", id] as const,
    pairing: (id: string) => ["msisdn-pos", "pairing", id] as const,
  },

  devicePos: {
    all: ["device-pos"] as const,
    list: (params: object) =>
      ["device-pos", "list", params] as const,
    detail: (id: string) => ["device-pos", "detail", id] as const,
    bundles: (id: string) => ["device-pos", "bundles", id] as const,
    shipment: (id: string) => ["device-pos", "shipment", id] as const,
    receipt: (id: string) => ["device-pos", "receipt", id] as const,
  },

  addresses: {
    all: ["addresses"] as const,
    list: (params: object) =>
      ["addresses", "list", params] as const,
    detail: (id: string) => ["addresses", "detail", id] as const,
  },

  stock: {
    all: ["stock"] as const,
    summary: ["stock", "summary"] as const,
    bundles: (params: object) =>
      ["stock", "bundles", params] as const,
  },

  accountExecutives: {
    all: ["account-executives"] as const,
    list: (params: object) =>
      ["account-executives", "list", params] as const,
    detail: (id: string) => ["account-executives", "detail", id] as const,
  },

  allocations: {
    all: ["allocations"] as const,
    list: (params: object) =>
      ["allocations", "list", params] as const,
  },
} as const;
