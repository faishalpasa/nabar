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

/**
 * Domain kanonik, opsional.
 *
 * Kalau di-set, link undangan selalu memakai domain ini. Kalau dibiarkan
 * kosong, link dibangun dari origin request yang sedang berjalan — itu yang
 * membuat preview deployment Vercel (URL-nya berubah tiap commit) dan localhost
 * tetap menghasilkan link yang benar tanpa konfigurasi apa pun.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ""
