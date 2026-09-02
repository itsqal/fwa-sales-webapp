import type { Metadata } from "next";
import { DpMsisdnPoScreen } from "@/features/msisdn-po";

export const metadata: Metadata = { title: "Manajemen PO MSISDN" };

export default function Page() {
  return <DpMsisdnPoScreen />;
}
