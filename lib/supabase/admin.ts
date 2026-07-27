import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { SUPABASE_URL } from "@/lib/env"
import type { Database } from "@/lib/types"

/**
 * ⚠️  Client dengan service_role — MELEWATI RLS SEPENUHNYA.
 *
 * Ini satu-satunya pengecualian di project ini, dan sengaja dipisah ke file
 * sendiri supaya jelas kalau ada yang mengimpornya dari tempat yang salah.
 *
 * Kenapa perlu: mengirim notifikasi berarti membaca alamat email penerima,
 * sementara yang memicunya adalah member yang RLS-nya justru sengaja tidak boleh
 * melihat email siapa pun (lihat migrasi 20260728120500). Jadi pembacaannya
 * harus dilakukan oleh peran yang tidak bertindak atas nama user mana pun.
 *
 * Aturan pemakaian:
 *   1. HANYA dari kode notifikasi di server. Jangan sekali-kali dari komponen,
 *      dari Server Action yang melayani permintaan user secara langsung, atau
 *      dari route handler yang bisa dipicu pihak luar.
 *   2. Key-nya TIDAK boleh berprefix NEXT_PUBLIC_ — kalau iya, Next akan
 *      menyisipkannya ke bundle browser dan seluruh isolasi antar-tabungan
 *      hilang untuk semua orang.
 *   3. Kalau env-nya tidak ada, fungsi ini mengembalikan null, bukan throw:
 *      aplikasi harus tetap jalan tanpa email dikonfigurasi.
 */
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) return null

  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
