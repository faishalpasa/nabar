"use client"

import { usePathname, useRouter } from "next/navigation"
import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"

import { useTour } from "@/app/providers"
import { Button } from "@/components/ui/button"
import { TOUR_STEPS } from "@/lib/tour/steps"

const PAD = 6

export const TourSpotlight = () => {
  const { status, step, next, skip, finish } = useTour()
  const pathname = usePathname()
  const router = useRouter()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const targetElRef = useRef<HTMLElement | null>(null)

  // Skip-until-valid (lompat step yang halamannya belum sampai, atau yang
  // elemennya tidak dirender — mis. field target/tanggal untuk tabungan
  // "Berkelanjutan"), lalu ukur posisi elemen target lewat DOM. Keduanya
  // butuh baca layout nyata, jadi tidak bisa dihitung saat render.
  useLayoutEffect(() => {
    if (status !== "active" || !step) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- rect disinkronkan ke status tur eksternal (belum ada step aktif), bukan derived render state
      setRect(null)
      return
    }

    if (!step.pathMatch(pathname)) {
      // Kalau halaman sekarang cocok dengan step BERIKUTNYA, berarti user
      // baru saja pindah halaman lewat elemen step ini (mis. submit form) —
      // lompat satu step maju. Kalau tidak, berarti belum sampai di halaman
      // step ini, tunggu di sini dulu.
      const currentIndex = TOUR_STEPS.findIndex((s) => s.id === step.id)
      const nextStep = TOUR_STEPS[currentIndex + 1]

      if (nextStep?.pathMatch(pathname)) {
        next()
      } else {
        setRect(null)
      }
      return
    }

    const el = document.querySelector<HTMLElement>(
      `[data-tour-target="${step.id}"]`,
    )

    if (!el) {
      next()
      return
    }

    targetElRef.current = el

    const updateRect = () => {
      setRect(el.getBoundingClientRect())
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    updateRect()
    window.addEventListener("scroll", updateRect, true)
    window.addEventListener("resize", updateRect)
    return () => {
      window.removeEventListener("scroll", updateRect, true)
      window.removeEventListener("resize", updateRect)
    }
  }, [status, step, pathname, next])

  if (status !== "active" || !step || !rect || !viewport.width) return null

  const stepIndex = TOUR_STEPS.findIndex((s) => s.id === step.id)
  const isLastStep = stepIndex === TOUR_STEPS.length - 1
  // Step di mana step BERIKUTNYA hidup di halaman lain, dan tidak ada elemen
  // asli di halaman ini yang otomatis membawa ke sana — "Lanjut" di sini
  // harus benar-benar memicu perpindahan (klik elemen asli, atau navigasi),
  // bukan cuma memajukan index. Kalau cuma next(), skip-until-valid effect di
  // atas cuma akan menyembunyikan tur sampai user pindah halaman sendiri.
  const isNavStep =
    step.id === "home-cta" ||
    step.id === "new-submit" ||
    step.id === "detail-actions"

  const target = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    right: rect.right + PAD,
    bottom: rect.bottom + PAD,
  }

  const tooltipWidth = Math.min(320, viewport.width - 32)
  const tooltipLeft = Math.min(
    Math.max(target.left, 16),
    viewport.width - tooltipWidth - 16,
  )
  const showBelow = viewport.height - target.bottom > 220 || target.top < 220

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[70]"
      data-test-id="tour_overlay_active"
    >
      {/* Empat panel dim yang mengelilingi target, bukan satu backdrop utuh —
          supaya elemen di dalam cutout tetap bisa diketuk langsung. Wrapper-nya
          sendiri pointer-events-none, cuma panel & tooltip ini yang aktif,
          supaya area cutout benar-benar tembus ke elemen asli di bawahnya. */}
      <div
        className="pointer-events-auto absolute inset-x-0 top-0 bg-black/70"
        style={{ height: Math.max(target.top, 0) }}
      />
      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 bg-black/70"
        style={{ top: target.bottom }}
      />
      <div
        className="pointer-events-auto absolute left-0 bg-black/70"
        style={{
          top: target.top,
          height: target.bottom - target.top,
          width: Math.max(target.left, 0),
        }}
      />
      <div
        className="pointer-events-auto absolute right-0 bg-black/70"
        style={{
          top: target.top,
          height: target.bottom - target.top,
          left: target.right,
        }}
      />

      <div
        className="border-primary pointer-events-none absolute rounded-[20px] border-2"
        style={{
          top: target.top,
          left: target.left,
          width: target.right - target.left,
          height: target.bottom - target.top,
        }}
      />

      <div
        className="bg-popover text-popover-foreground pointer-events-auto absolute flex flex-col gap-2.5 rounded-2xl p-4 shadow-lg"
        style={{
          left: tooltipLeft,
          width: tooltipWidth,
          ...(showBelow
            ? { top: target.bottom + 12 }
            : { bottom: viewport.height - target.top + 12 }),
        }}
      >
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
          Langkah {stepIndex + 1} dari {TOUR_STEPS.length}
        </p>
        <p className="font-heading text-base font-medium">{step.title}</p>
        <p className="text-sm text-balance text-muted-foreground">
          {step.description}
        </p>

        <div className="mt-1 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={skip}
            data-test-id="tour_button_skip"
          >
            Lewati tur
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (step.id === "detail-actions") {
                // Setor/Tarik tidak membawa balik ke home — step berikutnya
                // ("home-total") ada di sana, jadi navigasi eksplisit.
                router.push("/")
                return
              }

              if (isNavStep) {
                // Kalau elemennya submit button di dalam form yang belum
                // valid (mis. nama tabungan belum diisi), jangan klik —
                // itu memicu bubble validasi native browser yang aneh di
                // dalam overlay tur. Arahkan balik ke field yang bermasalah.
                const form = targetElRef.current?.closest("form")
                if (form && !form.checkValidity()) {
                  const firstInvalid =
                    form.querySelector<HTMLElement>(":invalid")
                  firstInvalid?.scrollIntoView({ block: "center" })
                  firstInvalid?.focus()
                  toast.error("Lengkapi dulu formnya", {
                    description: "Ada field wajib yang belum diisi.",
                  })
                  return
                }
                targetElRef.current?.click()
              } else if (isLastStep) {
                finish()
              } else {
                next()
              }
            }}
            data-test-id={
              isLastStep ? "tour_button_finish" : "tour_button_next"
            }
          >
            {isLastStep ? "Selesai" : "Lanjut"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
