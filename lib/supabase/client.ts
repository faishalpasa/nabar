import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";

/**
 * Client Supabase untuk Client Component.
 *
 * Memakai publishable key, jadi semua query tetap tunduk pada RLS — itu memang
 * yang diinginkan. Aturan bisnis (siapa boleh approve, siapa boleh tarik dana)
 * ditegakkan trigger di database, bukan di sini.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
