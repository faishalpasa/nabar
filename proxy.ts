import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/session"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Semua rute kecuali file statis, gambar, manifest, dan service worker.
    // manifest.webmanifest & sw.js WAJIB bisa diakses tanpa login — browser
    // mem-fetch keduanya di setiap halaman (termasuk /login, sebelum user
    // sempat login), dan kalau ke-redirect ke /login, Chrome menganggap
    // manifestnya invalid lalu app dianggap tidak installable sama sekali.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|webmanifest)$).*)",
  ],
}
