import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/session"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Semua rute kecuali file statis dan gambar.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
