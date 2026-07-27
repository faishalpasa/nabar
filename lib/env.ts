/**
 * Akses env yang tervalidasi sekali di satu tempat.
 *
 * Nama variabelnya sengaja ditulis literal, bukan lewat `process.env[name]`:
 * Next hanya mengganti referensi `process.env.NEXT_PUBLIC_*` yang statis saat
 * build. Akses dinamis tidak ikut ter-inline, jadi nilainya akan undefined di
 * bundle browser.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY wajib di-set. Salin dari .env.local.",
  )
}

export const SUPABASE_URL = url
export const SUPABASE_PUBLISHABLE_KEY = publishableKey

/** Dipakai untuk menyusun link undangan yang bisa dibuka di perangkat lain. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ""
