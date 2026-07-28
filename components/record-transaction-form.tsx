"use client"

import { ImagePlus, Info, Loader2, X } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { recordTransaction } from "@/app/actions/transactions"
import { AmountInput } from "@/components/amount-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatRupiah } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { TxType } from "@/lib/types"

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"]
const DEPOSIT_PRESETS = [100_000, 250_000, 500_000, 1_000_000]

type Props = {
  groupId: string
  userId: string
  type: TxType
  isOwner: boolean
  balance: string
}

export const RecordTransactionForm = ({
  groupId,
  userId,
  type,
  isOwner,
  balance,
}: Props) => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState("")
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isWithdrawal = type === "withdrawal"
  const noteRequired = isWithdrawal
  const busy = uploading || pending

  const canSubmit =
    amount > 0 && file !== null && (!noteRequired || note.trim().length > 0)

  const pickFile = (selected: File | null) => {
    if (!selected) return

    if (!ACCEPTED.includes(selected.type)) {
      toast.error("Format file tidak didukung", {
        description: "Gunakan JPG, PNG, WEBP, atau HEIC.",
      })
      return
    }
    if (selected.size > MAX_BYTES) {
      toast.error("Ukuran file terlalu besar", {
        description: "Maksimal 5 MB per foto.",
      })
      return
    }

    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const submit = async () => {
    if (!file) return

    setUploading(true)

    // Path WAJIB berpola {group_id}/{user_id}/{nama} — baik policy Storage
    // maupun trigger transactions_before_insert memverifikasinya, supaya tidak
    // ada yang bisa mengklaim bukti transfer orang lain.
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${groupId}/${userId}/${crypto.randomUUID()}.${ext}`

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(path, file, { contentType: file.type, upsert: false })

    setUploading(false)

    if (uploadError) {
      toast.error("Gagal mengunggah bukti", {
        description: uploadError.message,
      })
      return
    }

    startTransition(async () => {
      const { error } = await recordTransaction({
        groupId,
        type,
        amount,
        proofPath: path,
        note,
      })

      if (error) {
        // File sudah terunggah tapi transaksinya gagal. Bersihkan supaya tidak
        // meninggalkan objek nyangkut di bucket.
        await supabase.storage.from("proofs").remove([path])
        toast.error("Gagal menyimpan transaksi", { description: error })
        return
      }

      toast.success(
        isWithdrawal
          ? "Penarikan dana tercatat"
          : isOwner
            ? "Setoran tercatat dan langsung terverifikasi"
            : "Setoran terkirim, menunggu persetujuan owner",
      )
      router.push(`/g/${groupId}`)
    })
  }

  const after = Number(balance) - amount

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5.5 px-4 pt-5.5 pb-2">
        <div className="flex flex-col gap-2">
          <AmountInput
            id="amount"
            name="amount"
            label={isWithdrawal ? "Nominal ditarik" : "Nominal setoran"}
            required
            autoFocus
            emphasis
            placeholder="500.000"
            value={amount}
            onValueChange={setAmount}
            presets={isWithdrawal ? undefined : DEPOSIT_PRESETS}
          />

          {isWithdrawal && amount > 0 ? (
            <p className="tnum text-muted-foreground text-[11px]">
              Sisa saldo setelah ditarik: {formatRupiah(after)}
              {after < 0 ? " — saldo jadi minus" : ""}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5">
          <Label className="flex items-center gap-2 text-[13px] font-bold">
            {isWithdrawal ? "Foto bukti" : "Foto bukti transfer"}
            <span className="bg-bad-surface text-bad rounded-lg px-[7px] py-[3px] text-[10px] font-bold tracking-[0.03em] uppercase">
              wajib
            </span>
          </Label>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            capture="environment"
            className="sr-only"
            id="proof"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
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
                onClick={clearFile}
                aria-label="Hapus foto"
                className="focus-visible:ring-ring absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-[oklch(0.22_0.015_240_/_0.7)] text-white focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="size-[15px]" strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <label
              htmlFor="proof"
              className="bg-card focus-within:ring-ring hover:bg-muted/40 flex h-[150px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[20px] shadow-[0_0_0_1.5px_var(--input)] transition-colors focus-within:ring-2"
            >
              <span className="bg-accent text-accent-foreground grid size-11 place-items-center rounded-2xl">
                <ImagePlus className="size-[21px]" />
              </span>
              <span className="text-sm font-bold">Ambil atau pilih foto</span>
              <span className="text-muted-foreground text-[11px]">
                JPG, PNG, WEBP, atau HEIC · maksimal 5 MB
              </span>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <Label
            htmlFor="note"
            className="flex items-center gap-2 text-[13px] font-bold"
          >
            {isWithdrawal ? "Keterangan pengeluaran" : "Catatan"}
            <span
              className={
                noteRequired
                  ? "bg-bad-surface text-bad rounded-lg px-[7px] py-[3px] text-[10px] font-bold tracking-[0.03em] uppercase"
                  : "bg-neutral-surface text-muted-foreground rounded-lg px-[7px] py-[3px] text-[10px] font-bold tracking-[0.03em] uppercase"
              }
            >
              {noteRequired ? "wajib" : "opsional"}
            </span>
          </Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            required={noteRequired}
            placeholder={
              isWithdrawal ? "DP tiket pesawat" : "Setoran bulan Juli"
            }
            className="bg-card min-h-20 resize-none rounded-[20px] border-0 px-4 py-3.5 text-sm shadow-[0_0_0_1px_var(--border)]"
          />
          {isWithdrawal ? (
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Keterangan ini terlihat semua member — tulis sejelas mungkin.
            </p>
          ) : null}
        </div>

        {!isOwner && !isWithdrawal ? (
          <p className="bg-accent text-accent-foreground flex gap-2.5 rounded-[20px] px-4 py-3.5 text-xs leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0" />
            Setoranmu berstatus menunggu sampai owner menyetujui. Kalau ditolak,
            kamu bisa unggah ulang sebagai transaksi baru.
          </p>
        ) : null}
      </div>

      <div className="ink-dock">
        <Button
          type="button"
          size="lg"
          onClick={submit}
          disabled={!canSubmit || busy}
          className="ink-cta bg-ink hover:bg-ink/90 h-[52px] w-full gap-2 rounded-full text-[15px] font-bold text-white"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {uploading
            ? "Mengunggah bukti…"
            : pending
              ? "Menyimpan…"
              : isWithdrawal
                ? "Catat penarikan"
                : "Kirim setoran"}
        </Button>
      </div>
    </div>
  )
}
