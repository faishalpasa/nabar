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

/** User yang sedang login, atau null. */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
