// Chrome mensyaratkan service worker dengan fetch handler sebelum mau memicu
// `beforeinstallprompt` di Android — tanpa file ini, prompt instal custom di
// components/pwa-install-prompt.tsx tidak akan pernah muncul, walau
// manifest dan ikon sudah lengkap.
//
// Strategi cache sengaja dibatasi ke aset statis milik app sendiri (ikon,
// manifest). Nabar aplikasi finansial: halaman dan data dari Supabase harus
// selalu diambil dari network, bukan cache — bukan aplikasi offline-first.
const CACHE_NAME = "nabar-static-v1"
const STATIC_ASSETS = [
  "/icon.png",
  "/apple-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/manifest.webmanifest",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (!STATIC_ASSETS.includes(url.pathname)) return

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  )
})
