"use client"

import { useEffect } from "react"

import { useTour } from "@/app/providers"

// Tidak merender apa pun — cuma memulai tur sekali untuk siapa pun yang belum
// pernah selesai/lewati tur, baik akun baru maupun yang sudah lama pakai app
// (flag "selesai" cuma tersimpan lokal, jadi akun lama juga belum punya flag
// itu sebelum fitur ini ada).
export const FtueTrigger = () => {
  const { status, start } = useTour()

  useEffect(() => {
    if (status === "idle") start()
  }, [status, start])

  return null
}
