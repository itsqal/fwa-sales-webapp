import type { Metadata } from "next";
import { AddressesScreen } from "@/features/addresses";

export const metadata: Metadata = { title: "Alamat" };

export default function Page() {
  return <AddressesScreen />;
}
