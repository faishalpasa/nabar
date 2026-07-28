"use client"

import { Pencil } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { editTransaction, getProofUrl } from "@/app/actions/transactions"
import { AmountInput } from "@/components/amount-input"
import { PhotoPicker } from "@/components/photo-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { removeProof, uploadProof } from "@/lib/upload-proof"

type EditTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  txId: string
  groupId: string
  userId: string
  currentAmount: number
  currentProofPath: string
  onSaved: () => void
}

/**
 * Edit nominal transaksi milik sendiri (owner-only, lihat trigger
 * transactions_guard_update). Ganti foto bukti bersifat OPSIONAL — kalau
 * tidak pilih foto baru, bukti lama tetap dipakai. Perubahan tercatat sebagai
 * baris "amount_edited" / "proof_edited" di transaction_events, bukan
 * menimpa riwayat transaksi yang dilihat member — ini log audit, bukan
 * bagian dari tab History.
 */
export const EditTransactionDialog = ({
  open,
  onOpenChange,
  txId,
  groupId,
  userId,
  currentAmount,
  currentProofPath,
  onSaved,
}: EditTransactionDialogProps) => {
  const [amount, setAmount] = useState(currentAmount)
  const [file, setFile] = useState<File | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [loadingCurrent, setLoadingCurrent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pending, startTransition] = useTransition()

  const busy = saving || pending

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setAmount(currentAmount)
      setFile(null)
      setCurrentUrl(null)
      setLoadingCurrent(true)
      getProofUrl(currentProofPath).then((result) => {
        setLoadingCurrent(false)
        if ("url" in result) setCurrentUrl(result.url)
      })
    }
    onOpenChange(next)
  }

  const save = async () => {
    if (!amount || amount <= 0) return

    let proofPath: string | undefined

    if (file) {
      setSaving(true)
      const uploaded = await uploadProof(groupId, userId, file)
      setSaving(false)

      if ("error" in uploaded) {
        toast.error("Gagal mengunggah bukti", { description: uploaded.error })
        return
      }
      proofPath = uploaded.path
    }

    startTransition(async () => {
      const { error } = await editTransaction(txId, groupId, {
        amount,
        proofPath,
      })

      if (error) {
        if (proofPath) await removeProof(proofPath)
        toast.error("Gagal menyimpan perubahan", { description: error })
        return
      }

      toast.success("Transaksi diperbarui")
      onOpenChange(false)
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[21.25rem] rounded-[26px] p-[22px]">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
          <span className="bg-accent text-accent-foreground grid size-[38px] shrink-0 place-items-center rounded-[14px]">
            <Pencil className="size-[17px]" strokeWidth={2.2} />
          </span>
          <div>
            <DialogTitle className="text-base font-extrabold tracking-[-0.02em]">
              Edit transaksi
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs">
              Perubahan tercatat di log, terpisah dari riwayat transaksi.
            </DialogDescription>
          </div>
        </DialogHeader>

        <AmountInput
          id="edit-amount"
          name="amount"
          label="Nominal"
          value={amount}
          onValueChange={setAmount}
        />

        <div className="flex flex-col gap-2.5">
          <Label className="flex items-center gap-2 text-[13px] font-bold">
            Bukti transfer
            <span className="bg-neutral-surface text-muted-foreground rounded-lg px-[7px] py-[3px] text-[10px] font-bold tracking-[0.03em] uppercase">
              opsional
            </span>
          </Label>

          {loadingCurrent ? (
            <div className="bg-background flex h-[190px] items-center justify-center rounded-[20px] text-xs text-muted-foreground">
              Memuat bukti saat ini…
            </div>
          ) : (
            <PhotoPicker
              file={file}
              onFileChange={setFile}
              initialPreviewUrl={currentUrl}
            />
          )}
        </div>

        <DialogFooter className="flex-row gap-2.5">
          <Button
            variant="outline"
            className="bg-background h-[46px] flex-1 rounded-full font-bold"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            disabled={!amount || amount <= 0 || busy}
            onClick={save}
            className="bg-ink hover:bg-ink/90 h-[46px] flex-1 rounded-full font-bold text-white"
          >
            {busy ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
