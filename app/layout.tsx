import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Geist_Mono, Outfit } from "next/font/google"

import { TourProvider } from "@/app/providers"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { RegisterServiceWorker } from "@/components/register-service-worker"
import { TourSpotlight } from "@/components/tour-spotlight"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

/** Dipakai khusus di wordmark brand lockup (BrandLockup*), lihat components/brand.tsx. */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Nabar",
  description:
    "Catat tabungan dan kas bareng teman, lengkap dengan bukti transfer.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale 1 mencegah Safari iOS auto-zoom saat sebuah input di-fokus
  // (perilaku bawaan iOS untuk field dengan font-size < 16px) — tanpa
  // userScalable: false, jadi pinch-zoom manual tetap jalan untuk aksesibilitas.
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#083A3D" },
    { media: "(prefers-color-scheme: dark)", color: "#062a2c" },
  ],
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => (
  <html
    lang="id"
    className={`${jakarta.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
  >
    <body className="bg-background min-h-full">
      <TourProvider>
        <div className="app-frame">
          <PullToRefresh>{children}</PullToRefresh>
        </div>
        <Toaster position="top-center" />
        <PWAInstallPrompt />
        <RegisterServiceWorker />
        <TourSpotlight />
      </TourProvider>
    </body>
  </html>
)

export default RootLayout
