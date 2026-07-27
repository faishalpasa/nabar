"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { flushNotifications } from "@/lib/notifications"
import { baseUrl } from "@/lib/request-url"
import { createClient } from "@/lib/supabase/server"
import type { Database, TxType } from "@/lib/types"

type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"]

export type ActionResult = { error?: string }

/**
 * Menguras antrean notifikasi setelah response dikirim.
 *
 * `after()` dari Next menjalankan ini di luar jalur response, jadi user tidak
 * menunggu Resend dan uploadnya tidak ikut gagal kalau pengiriman email
 * bermasalah. Kegagalan tidak menghilangkan notifikasi: barisnya tetap bertanda
 * belum terkirim di transaction_events dan dicoba lagi pada aksi berikutnya.
 */
const notifyAfterResponse = async () => {
  const url = await baseUrl()
  after(async () => {
    await flushNotifications(url)
  })
}

/**
 * PENTING soal RLS: kalau tidak ada policy yang cocok, Postgres tidak melempar
 * error — UPDATE/DELETE hanya mengenai 0 baris dan Supabase membalas sukses
 * dengan data kosong. Jadi setiap mutasi di sini memakai .select() lalu
 * memeriksa jumlah baris; memeriksa `error === null` saja tidak cukup.
 */
async function mutateTransaction(
  txId: string,
  groupId: string,
  patch: TransactionUpdate,
  deniedMessage: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", txId)
    .select("id")

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: deniedMessage }

  revalidatePath(`/g/${groupId}`)
  await notifyAfterResponse()
  return {}
}

export async function approveTransaction(txId: string, groupId: string) {
  return mutateTransaction(
    txId,
    groupId,
    { status: "verified", reject_reason: null },
    "Kamu tidak punya izin menyetujui transaksi ini.",
  )
}

export async function rejectTransaction(
  txId: string,
  groupId: string,
  reason: string,
) {
  const trimmed = reason.trim()
  if (!trimmed) return { error: "Alasan penolakan wajib diisi." }

  return mutateTransaction(
    txId,
    groupId,
    { status: "rejected", reject_reason: trimmed },
    "Kamu tidak punya izin menolak transaksi ini.",
  )
}

/** Membatalkan approval yang keliru: verified -> rejected. */
export async function unapproveTransaction(
  txId: string,
  groupId: string,
  reason: string,
) {
  const trimmed = reason.trim()
  if (!trimmed) return { error: "Alasan pembatalan wajib diisi." }

  return mutateTransaction(
    txId,
    groupId,
    { status: "rejected", reject_reason: trimmed },
    "Kamu tidak punya izin membatalkan transaksi ini.",
  )
}

/**
 * Mencatat transaksi setelah file bukti berhasil diunggah dari browser.
 *
 * `status`, `created_at`, dan field verifikasi sengaja tidak dikirim — semuanya
 * ditentukan trigger di database. Deposit owner otomatis verified, deposit
 * member masuk sebagai pending.
 */
export async function recordTransaction(input: {
  groupId: string
  type: TxType
  amount: number
  proofPath: string
  note: string
}): Promise<ActionResult> {
  const { groupId, type, amount, proofPath } = input
  const note = input.note.trim()

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Nominal harus lebih dari nol." }
  }
  if (!proofPath) return { error: "Bukti belum terunggah." }
  if (type === "withdrawal" && !note) {
    return { error: "Keterangan wajib diisi untuk penarikan dana." }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("transactions").insert({
    group_id: groupId,
    type,
    amount,
    proof_path: proofPath,
    note: note || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/g/${groupId}`)
  revalidatePath("/")
  await notifyAfterResponse()
  return {}
}

/** URL bertanda-tangan untuk menampilkan foto bukti dari bucket privat. */
export async function getProofUrl(proofPath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from("proofs")
    .createSignedUrl(proofPath, 60 * 5)

  if (error || !data) return { error: "Bukti tidak bisa dibuka." }
  return { url: data.signedUrl }
}
