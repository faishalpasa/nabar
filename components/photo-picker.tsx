"use client"

import { Camera, ImagePlus, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useId, useMemo } from "react"
import { toast } from "sonner"

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]

type PhotoPickerProps = {
  file: File | null
  onFileChange: (file: File | null) => void
  /** Pratinjau yang tampil sebelum user memilih foto baru — dipakai saat edit bukti lama. */
  initialPreviewUrl?: string | null
}

/**
 * Dua jalur pengambilan foto: kamera langsung (`capture="environment"`) dan
 * galeri (input file biasa, tanpa `capture`). Sebelumnya cuma ada satu input
 * dengan `capture` terpasang, yang di banyak browser mobile membuka kamera
 * langsung tanpa menawarkan opsi galeri sama sekali.
 */
export const PhotoPicker = ({
  file,
  onFileChange,
  initialPreviewUrl,
}: PhotoPickerProps) => {
  const cameraId = useId()
  const galleryId = useId()

  // `file` prop adalah satu-satunya sumber kebenaran — objectUrl diturunkan
  // darinya saat render (bukan disalin ke state sendiri, yang bisa tidak sinkron
  // kalau parent mengubah `file` lewat jalur lain, mis. reset form). Efek di
  // bawah cuma untuk pembersihan (revoke), bukan untuk menuliskan state.
  const objectUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  )

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    },
    [objectUrl],
  )

  const previewUrl = objectUrl ?? initialPreviewUrl ?? null

  const validate = (selected: File) => {
    if (!PHOTO_ACCEPTED.includes(selected.type)) {
      toast.error("Format file tidak didukung", {
        description: "Gunakan JPG, PNG, WEBP, atau HEIC.",
      })
      return false
    }
    if (selected.size > PHOTO_MAX_BYTES) {
      toast.error("Ukuran file terlalu besar", {
        description: "Maksimal 5 MB per foto.",
      })
      return false
    }
    return true
  }

  const pick = (selected: File | null) => {
    if (!selected || !validate(selected)) return
    onFileChange(selected)
  }

  const clear = () => onFileChange(null)

  return (
    <div className="flex flex-col gap-2.5">
      <input
        id={cameraId}
        type="file"
        accept={PHOTO_ACCEPTED.join(",")}
        capture="environment"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <input
        id={galleryId}
        type="file"
        accept={PHOTO_ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <div className="bg-card relative overflow-hidden rounded-[20px] shadow-[0_0_0_1px_var(--border)]">
          <Image
            src={previewUrl}
            alt="Pratinjau bukti transfer"
            width={400}
            height={400}
            unoptimized
            className="max-h-[190px] w-full object-contain"
          />
          <button
            type="button"
            onClick={clear}
            aria-label="Hapus foto"
            className="focus-visible:ring-ring absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-[oklch(0.22_0.015_240_/_0.7)] text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-[15px]" strokeWidth={2.4} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <label
            htmlFor={cameraId}
            className="bg-card focus-within:ring-ring hover:bg-muted/40 flex h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] shadow-[0_0_0_1.5px_var(--input)] transition-colors focus-within:ring-2"
          >
            <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-2xl">
              <Camera className="size-[19px]" />
            </span>
            <span className="text-xs font-bold">Ambil foto</span>
          </label>

          <label
            htmlFor={galleryId}
            className="bg-card focus-within:ring-ring hover:bg-muted/40 flex h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] shadow-[0_0_0_1.5px_var(--input)] transition-colors focus-within:ring-2"
          >
            <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-2xl">
              <ImagePlus className="size-[19px]" />
            </span>
            <span className="text-xs font-bold">Pilih dari galeri</span>
          </label>
        </div>
      )}

      <p className="text-muted-foreground text-[11px]">
        JPG, PNG, WEBP, atau HEIC · maksimal 5 MB
      </p>
    </div>
  )
}
