import type { AdminRole } from "@/lib/api/types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Menus with no screen yet, routed to the "Belum tersedia" placeholder. */
  placeholder?: boolean;
}

export interface NavSection {
  /** `null` for the ungrouped item at the top of the MPX sidebar. */
  title: string | null;
  items: NavItem[];
}

const icon = (name: string) => `/assets/icons/nav/${name}.svg`;

/**
 * The three menu sets, read off the mockups.
 *
 * Placeholder entries are deliberate: the brief asks for the navigation users
 * expect to see during core-feature development, so they are rendered and route
 * to a "Belum tersedia" page rather than being hidden.
 *
 * `Alamat` sits under KELOLA for IOH and PENGATURAN for MPX because that is
 * where each mockup puts it (issue #15 proposes making it consistent, still an
 * open design decision). IOH's is a placeholder — `/admin/addresses` is scoped
 * to the calling MPX, so there is nothing for IOH to read there.
 */
export const NAV: Record<AdminRole, NavSection[]> = {
  DP_ADMIN: [
    {
      title: "KELOLA",
      items: [
        {
          label: "Purchase Order MSISDN",
          href: "/dp/msisdn-po",
          icon: icon("purchase-order"),
        },
        {
          label: "Purchase Order Device",
          href: "/dp/device-po",
          icon: icon("purchase-order-device"),
        },
      ],
    },
    {
      title: "PENGATURAN",
      items: [
        {
          label: "Umum",
          href: "/dp/settings/general",
          icon: icon("general"),
          placeholder: true,
        },
        {
          label: "Akun",
          href: "/dp/settings/account",
          icon: icon("account"),
          placeholder: true,
        },
      ],
    },
  ],

  IOH_ADMIN: [
    {
      title: "KELOLA",
      items: [
        {
          label: "Purchase Order",
          href: "/ioh/purchase-order",
          icon: icon("purchase-order"),
        },
        {
          label: "Alamat",
          href: "/ioh/addresses",
          icon: icon("address"),
          placeholder: true,
        },
      ],
    },
    {
      title: "PENGATURAN",
      items: [
        {
          label: "Umum",
          href: "/ioh/settings/general",
          icon: icon("general"),
          placeholder: true,
        },
        {
          label: "Akun",
          href: "/ioh/settings/account",
          icon: icon("account"),
          placeholder: true,
        },
      ],
    },
  ],

  MPX_ADMIN: [
    {
      title: null,
      items: [
        {
          label: "Beranda",
          href: "/mpx",
          icon: icon("home"),
          placeholder: true,
        },
      ],
    },
    {
      title: "KELOLA",
      items: [
        {
          label: "Purchase Order",
          href: "/mpx/purchase-order",
          icon: icon("purchase-order"),
        },
        { label: "Stok", href: "/mpx/stock", icon: icon("stock") },
        {
          label: "Account Executive",
          href: "/mpx/account-executives",
          icon: icon("account-executive"),
        },
      ],
    },
    {
      title: "PENGATURAN",
      items: [
        { label: "Alamat", href: "/mpx/addresses", icon: icon("address") },
        {
          label: "Akun",
          href: "/mpx/settings/account",
          icon: icon("account"),
          placeholder: true,
        },
        {
          label: "Umum",
          href: "/mpx/settings/general",
          icon: icon("general"),
          placeholder: true,
        },
      ],
    },
  ],
};

export const DASHBOARD_TITLE: Record<AdminRole, string> = {
  DP_ADMIN: "Dasbor Device Partner",
  IOH_ADMIN: "Dasbor IOH",
  MPX_ADMIN: "Dasbor MPX",
};

/** The topbar label under the user's name. IOH is bound to no counterparty. */
export function organisationLabel(
  role: AdminRole,
  organisation: { name?: string; legalName?: string } | null | undefined,
): string {
  if (role === "IOH_ADMIN") return "Indosat Ooredoo Hutchison";
  return organisation?.legalName ?? organisation?.name ?? "";
}
