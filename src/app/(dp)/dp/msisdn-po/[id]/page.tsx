import type { Metadata } from "next";
import { MsisdnPoDetail } from "@/features/msisdn-po";

export const metadata: Metadata = { title: "Detail PO MSISDN" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MsisdnPoDetail id={id} />;
}
