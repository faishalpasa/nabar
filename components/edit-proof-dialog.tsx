"use client"

import { Pencil } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { editTransactionProof, getProofUrl } from "@/app/actions/transactions"
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
import { removeProof, uploadProof } from "@/lib/upload-proof"

type EditProofDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  txId: string
  groupId: string
  userId: string
  currentProofPath: string
  onSaved: () => void
}

/**
 * Ganti foto bukti transaksi milik sendiri (owner-only, lihat trigger
 * transactions_guard_update). Perubahan tercatat sebagai baris "proof_edited"
 * di transaction_events, bukan menimpa riwayat transaksi yang dilihat member —
 * ini log audit, bukan bagian dari tab History.
 */
export const EditProofDialog = ({
  open,
  onOpenChange,
  txId,
  groupId,
  userId,
  currentProofPath,
  onSaved,
}: EditProofDialogProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [loadingCurrent, setLoadingCurrent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pending, startTransition] = useTransition()

  const busy = saving || pending

  const handleOpenChange = (next: boolean) => {
    if (next) {
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
    if (!file) return

    setSaving(true)
    const uploaded = await uploadProof(groupId, userId, file)
    setSaving(false)

    if ("error" in uploaded) {
      toast.error("Gagal mengunggah bukti", { description: uploaded.error })
      return
    }

    startTransition(async () => {
      const { error } = await editTransactionProof(txId, groupId, uploaded.path)

      if (error) {
        await removeProof(uploaded.path)
        toast.error("Gagal menyimpan bukti", { description: error })
        return
      }

      toast.success("Bukti transfer diperbarui")
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
              Ganti bukti transfer
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs">
              Foto lama tidak hilang — perubahan ini tercatat di log, terpisah
              dari riwayat transaksi.
            </DialogDescription>
          </div>
        </DialogHeader>

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

        <DialogFooter className="flex-row gap-2.5">
          <Button
            variant="outline"
            className="bg-background h-[46px] flex-1 rounded-full font-bold"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            disabled={!file || busy}
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
