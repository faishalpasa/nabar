import { createClient } from "@/lib/supabase/client"

export type UploadProofResult = { path: string } | { error: string }

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

  const supabase = createClient()
  const { error } = await supabase.storage
    .from("proofs")
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }
  return { path }
}

/** Membersihkan file yang sudah terunggah kalau langkah setelahnya gagal. */
export async function removeProof(path: string) {
  const supabase = createClient()
  await supabase.storage.from("proofs").remove([path])
}
