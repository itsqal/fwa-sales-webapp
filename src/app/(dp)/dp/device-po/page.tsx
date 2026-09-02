import type { Metadata } from "next";
import { DpDevicePoScreen } from "@/features/device-po";

export const metadata: Metadata = { title: "Manajemen PO" };

export default function Page() {
  return <DpDevicePoScreen />;
}
