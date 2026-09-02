import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getMe, homePathFor } from "@/lib/api/server";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Masuk" };

/**
 * No mockup covers authentication (issue #11), so this is built plainly in the
 * established design language: the magenta field on the left carries the brand,
 * the form on the right stays out of the way.
 */
export default async function LoginPage() {
  const me = await getMe();
  if (me) redirect(homePathFor(me.role));

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-hifi-magenta p-12 text-white lg:flex">
        <Image
          src="/assets/brand/hifiair-lockup-white.svg"
          alt="indosat HiFi Air"
          width={168}
          height={107}
          priority
        />
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight font-semibold">
            Semua proses HiFi Air, terhubung dalam satu tempat.
          </h1>
          <p className="mt-4 text-white/80">
            Satu dashboard untuk memantau nomor, perangkat, pengiriman,
            penerimaan, dan stok dalam satu alur.
          </p>
        </div>
        <p className="text-sm text-white/60">
          Akun dibuat oleh IOH HQ. Hubungi HQ jika Anda belum memilikinya.
        </p>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-white/10"
        />
      </section>

      <section className="flex items-center justify-center bg-surface-card px-6 py-12">
        <div className="w-full max-w-sm">
          <Image
            className="lg:hidden"
            src="/assets/brand/hifiair-lockup-color.svg"
            alt="indosat HiFi Air"
            width={136}
            height={87}
            priority
          />
          <h2 className="font-display mt-6 text-3xl font-semibold text-hifi-magenta lg:mt-0">
            Masuk
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Gunakan akun dasbor yang diberikan IOH HQ.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
