import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"

import { PullToRefresh } from "@/components/pull-to-refresh"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { RegisterServiceWorker } from "@/components/register-service-worker"
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

export const metadata: Metadata = {
  title: "Nabar",
  description:
    "Catat tabungan dan kas bareng teman, lengkap dengan bukti transfer.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
    className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
  >
    <body className="bg-background min-h-full">
      <div className="app-frame">
        <PullToRefresh>{children}</PullToRefresh>
      </div>
      <Toaster position="top-center" />
      <PWAInstallPrompt />
      <RegisterServiceWorker />
    </body>
  </html>
)

export default RootLayout
