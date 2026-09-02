"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setFormError(
        body?.error?.message ?? "Username atau kata sandi tidak cocok.",
      );
      return;
    }

    // `mustChangePassword` exists in the contract but no endpoint accepts a new
    // password, so v1 can only say so. Raised as a backend gap.
    if (body?.mustChangePassword) {
      setNotice(
        "Kata sandi awal dari HQ masih digunakan. Hubungi IOH HQ untuk menggantinya.",
      );
    }

    const from = params.get("from");
    router.replace(from && from.startsWith("/") ? from : "/");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          autoComplete="username"
          autoFocus
          placeholder="mis. dp.advan"
          className="h-11 w-full"
          {...form.register("username")}
        />
        {form.formState.errors.username && (
          <p className="text-xs text-destructive">
            {form.formState.errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Kata Sandi</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            className="h-11 w-full pr-11"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={
              showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
            }
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted transition-colors hover:text-hifi-magenta"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      {formError && (
        <p
          role="alert"
          className="rounded-control bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      {notice && (
        <p className="rounded-control bg-hifi-tint px-3 py-2 text-sm text-hifi-magenta">
          {notice}
        </p>
      )}

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="h-11 w-full rounded-full bg-hifi-cta text-base hover:bg-hifi-magenta"
      >
        {form.formState.isSubmitting && (
          <Loader2 className="size-4 animate-spin" />
        )}
        Masuk
      </Button>
    </form>
  );
}
