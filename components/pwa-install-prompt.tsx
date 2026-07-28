"use client"

import { Download, Share, Smartphone } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

const STORAGE_KEY = "pwa-install-prompt-last-shown"
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

const shouldShowPrompt = () => {
  const lastShown = localStorage.getItem(STORAGE_KEY)
  if (!lastShown) return true
  const lastShownTime = Number(lastShown)
  if (Number.isNaN(lastShownTime)) return true
  return Date.now() - lastShownTime >= ONE_WEEK_MS
}

const markPromptShown = () => {
  localStorage.setItem(STORAGE_KEY, String(Date.now()))
}

const isIOSDevice = () => {
  if (typeof navigator === "undefined") return false
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true
  // iPadOS 13+ menyamar sebagai desktop Safari, dibedakan lewat touch support.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/**
 * Prompt "install ke layar utama", muncul maksimal sekali seminggu — sekali
 * ditutup (baik lewat tombol maupun berhasil instal), tidak muncul lagi
 * sampai 7 hari berikutnya. Diadaptasi dari
 * reklub/member-dashboard/pwa-container.tsx, tanpa logika cek update versi
 * yang tidak relevan di sini.
 */
export const PWAInstallPrompt = () => {
  const [open, setOpen] = useState(false)
  const [isIOS] = useState(isIOSDevice)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone()) return
    if (window.innerWidth >= 768) return

    if (isIOS) {
      if (!shouldShowPrompt()) return
      const timer = setTimeout(() => {
        markPromptShown()
        setOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }

    const onBeforeInstallPrompt = (e: Event) => {
      if (!shouldShowPrompt()) return
      e.preventDefault()
      markPromptShown()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setOpen(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    // isIOS datang dari useState(isIOSDevice) — nilainya tetap sepanjang
    // hidup komponen, sengaja tidak dimasukkan supaya efek ini cuma jalan
    // sekali saat mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setOpen(false)
  }

  return (
    <Drawer
      open={open}
      showSwipeHandle
      onOpenChange={(next) => {
        if (!next) markPromptShown()
        setOpen(next)
      }}
    >
      <DrawerContent>
        <div className="flex flex-col gap-[18px] p-[22px]">
          <DrawerHeader className="flex-row items-center gap-3 p-0 text-left">
            <span className="bg-accent text-accent-foreground grid size-[38px] shrink-0 place-items-center rounded-[14px]">
              <Smartphone className="size-[18px]" strokeWidth={2.2} />
            </span>
            <div>
              <DrawerTitle className="text-base font-extrabold tracking-[-0.02em]">
                {isIOS ? "Tambah ke layar utama" : "Instal Nabar"}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-xs">
                Akses lebih cepat tanpa buka browser lagi.
              </DrawerDescription>
            </div>
          </DrawerHeader>

          {isIOS ? (
            <ol className="flex flex-col gap-2.5 text-[13px]">
              <li className="flex items-start gap-2.5">
                <span className="bg-accent text-accent-foreground grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold">
                  1
                </span>
                <span>
                  Ketuk tombol{" "}
                  <Share className="inline size-[15px] align-text-bottom" /> di
                  browser
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="bg-accent text-accent-foreground grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold">
                  2
                </span>
                <span>Gulir lalu ketuk &quot;Tambah ke Layar Utama&quot;</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="bg-accent text-accent-foreground grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold">
                  3
                </span>
                <span>Ketuk &quot;Tambah&quot; untuk konfirmasi</span>
              </li>
            </ol>
          ) : (
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              Instal Nabar di perangkatmu supaya bisa dibuka langsung dari layar
              utama, seperti aplikasi biasa.
            </p>
          )}

          <DrawerFooter className="flex-row gap-2.5 p-0">
            <Button
              variant="outline"
              className="bg-background h-[46px] flex-1 rounded-full font-bold"
              onClick={() => setOpen(false)}
            >
              {isIOS ? "Mengerti" : "Nanti aja"}
            </Button>
            {isIOS ? null : (
              <Button
                onClick={install}
                className="bg-ink hover:bg-ink/90 h-[46px] flex-1 gap-1.5 rounded-full font-bold text-white"
              >
                <Download className="size-4" strokeWidth={2.2} />
                Instal
              </Button>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
