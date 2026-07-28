import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env"
import type { Database } from "@/lib/types"

/**
 * Client Supabase untuk Server Component, Server Action, dan Route Handler.
 *
 * Selalu terikat cookie sesi user yang sedang login, jadi RLS berlaku persis
 * seperti di browser. Tidak ada jalur service_role di aplikasi ini.
 *
 * Efek samping penting: membaca cookies() membuat route ini dynamic, sehingga
 * Next tidak akan meng-cache halaman berisi data grup dan menyajikannya ke user
 * lain. Jangan menambahkan `revalidate` atau fetch ber-cache di halaman
 * yang menampilkan data tabungan.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Component tidak boleh menulis cookie. Refresh token
          // ditangani middleware, jadi ini aman diabaikan.
        }
      },
    },
  })
}

export type SessionUser = {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
}

/**
 * User yang sedang login, atau null.
 *
 * Memakai getClaims(), bukan getUser(). Keduanya sama-sama tepercaya, tapi
 * getUser() selalu memanggil server Auth Supabase, sementara getClaims()
 * memverifikasi tanda tangan JWT secara lokal memakai kunci publik ES256 dari
 * JWKS (yang di-cache setelah pengambilan pertama).
 *
 * Bedanya terasa karena fungsi Vercel berjalan jauh dari Supabase: satu
 * panggilan jaringan lintas benua hilang di setiap halaman. Yang tidak boleh
 * dipakai di sini adalah getSession() — itu membaca cookie tanpa memverifikasi
 * tanda tangannya, jadi isinya tidak boleh dipercaya di server.
 */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  const claims = data?.claims
  if (!claims?.sub) return null

  const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>
  const email = typeof claims.email === "string" ? claims.email : null

  const nameFromMetadata =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null

  return {
    id: claims.sub,
    email,
    displayName: nameFromMetadata ?? email?.split("@")[0] ?? "Kamu",
    avatarUrl:
      typeof metadata.avatar_url === "string"
        ? metadata.avatar_url
        : typeof metadata.picture === "string"
          ? metadata.picture
          : null,
  }
}
