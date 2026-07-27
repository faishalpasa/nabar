import { createBrowserClient } from "@supabase/ssr"

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env"
import type { Database } from "@/lib/types"

/**
 * Client Supabase untuk Client Component.
 *
 * Memakai publishable key, jadi semua query tetap tunduk pada RLS — itu memang
 * yang diinginkan. Aturan bisnis (siapa boleh approve, siapa boleh tarik dana)
 * ditegakkan trigger di database, bukan di sini.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
}
