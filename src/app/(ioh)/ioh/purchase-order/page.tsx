import type { Metadata } from "next";
import { IohMsisdnPoScreen } from "@/features/msisdn-po";

export const metadata: Metadata = { title: "Provide List MSISDN" };

export default function Page() {
  return <IohMsisdnPoScreen />;
}
