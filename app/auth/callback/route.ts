import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Menukar `code` dari Google menjadi sesi, lalu mengantar user ke tujuannya.
 *
 * `next` dipakai alur undangan: user yang datang dari link invite harus kembali
 * ke /join/<token> setelah daftar, bukan ke Home — supaya dialog konfirmasi
 * langsung muncul dan wizard bikin tabungan di-skip.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  // Hanya terima path internal. Tanpa cek ini, `next` bisa dipakai untuk
  // mengarahkan user ke domain lain sesudah login (open redirect).
  const requested = searchParams.get("next") ?? "/";
  const next =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Kode otorisasi tidak ada.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
