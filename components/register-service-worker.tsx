"use client"

import { useEffect } from "react"

/**
 * Tanpa service worker terdaftar (dengan fetch handler), Chrome/Android
 * tidak akan pernah memicu `beforeinstallprompt` — prompt instal custom di
 * pwa-install-prompt.tsx tidak akan muncul sama sekali, walau manifest dan
 * ikon sudah lengkap.
 */
export const RegisterServiceWorker = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])

  return null
}
