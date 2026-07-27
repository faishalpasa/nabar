import "server-only"

import { headers } from "next/headers"

import { SITE_URL } from "@/lib/env"

/**
 * Origin absolut untuk link yang dikirim ke luar aplikasi — link undangan dan
 * tombol di email.
 *
 * Pakai NEXT_PUBLIC_SITE_URL kalau di-set, kalau tidak turunkan dari header
 * request. Di belakang proxy Vercel host aslinya ada di x-forwarded-host;
 * `host` saja bisa berisi host internal. Menurunkannya dari request membuat
 * preview deployment (URL-nya berubah tiap commit) tetap menghasilkan link
 * benar tanpa konfigurasi apa pun.
 */
export const baseUrl = async () => {
  if (SITE_URL) return SITE_URL.replace(/\/$/, "")

  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https")

  return `${proto}://${host}`
}
