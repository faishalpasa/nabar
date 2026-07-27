"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { GoogleGlyph } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** Path tujuan setelah login selesai, mis. "/join/abc123". */
  next?: string;
  label?: string;
};

export function GoogleSignInButton({
  next,
  label = "Masuk dengan Google",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();

    // redirectTo harus menunjuk ke route handler kita, bukan langsung ke
    // halaman tujuan — handler itulah yang menukar `code` menjadi sesi.
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      setLoading(false);
      toast.error("Gagal membuka Google", { description: error.message });
    }
    // Kalau sukses, browser sudah berpindah ke Google — jangan reset loading.
  }

  return (
    <Button
      type="button"
      onClick={signIn}
      disabled={loading}
      variant="outline"
      size="lg"
      className="h-12 w-full gap-3 rounded-xl text-[15px] font-semibold"
    >
      {loading ? (
        <Loader2 className="size-[18px] animate-spin" />
      ) : (
        <GoogleGlyph />
      )}
      {loading ? "Menghubungkan…" : label}
    </Button>
  );
}
