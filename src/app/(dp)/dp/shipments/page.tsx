import type { Metadata } from "next";
import { DpDevicePoScreen } from "@/features/device-po";

export const metadata: Metadata = { title: "Pengiriman" };

/**
 * The same order list, filtered to what is waiting to leave the warehouse. The
 * AWB capture screen has no mockup (issue #1); this is where it lives.
 */
export default function Page() {
  return (
    <DpDevicePoScreen
      title="Pengiriman"
      subtitle="Catat AWB dan pantau pengiriman ke MPX"
      initialStatus="DIPROSES"
    />
  );
}
