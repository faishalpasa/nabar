import Compressor from "compressorjs"

import { createClient } from "@/lib/supabase/client"

export type UploadProofResult = { path: string } | { error: string }

/** Turunkan quality biar ukuran unggahan kecil — bukti transfer tidak perlu resolusi penuh. */
const compressImage = (file: File) =>
  new Promise<File | Blob>((resolve, reject) => {
    new Compressor(file, {
      quality: 0.5,
      success: resolve,
      error: reject,
    })
  })

/**
 * Mengunggah foto bukti ke bucket privat `proofs`.
 *
 * Path WAJIB berpola `{group_id}/{user_id}/{nama}` — baik policy Storage
 * maupun trigger di database memverifikasinya, supaya tidak ada yang bisa
 * mengklaim bukti transfer orang lain sebagai miliknya.
 */
export async function uploadProof(
  groupId: string,
  userId: string,
  file: File,
): Promise<UploadProofResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `${groupId}/${userId}/${crypto.randomUUID()}.${ext}`

  // HEIC tidak bisa didekode lewat canvas di browser (dasar Compressor.js) —
  // kalau gagal, unggah file aslinya saja daripada gagal total.
  const compressed = await compressImage(file).catch(() => file)

  const supabase = createClient()
  const { error } = await supabase.storage
    .from("proofs")
    .upload(path, compressed, {
      contentType: compressed.type || file.type,
      upsert: false,
    })

  if (error) return { error: error.message }
  return { path }
}

/** Membersihkan file yang sudah terunggah kalau langkah setelahnya gagal. */
export async function removeProof(path: string) {
  const supabase = createClient()
  await supabase.storage.from("proofs").remove([path])
}
