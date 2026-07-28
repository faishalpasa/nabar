"use client"

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Clock,
  Eye,
  Pencil,
  Receipt,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  approveTransaction,
  getProofUrl,
  rejectTransaction,
  unapproveTransaction,
} from "@/app/actions/transactions"
import { tintFor } from "@/components/avatar-stack"
import { EditTransactionDialog } from "@/components/edit-transaction-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  formatDateTime,
  formatRupiah,
  initials,
  monthLabel,
} from "@/lib/format"
import type { TransactionFeedRow } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  rows: TransactionFeedRow[]
  groupId: string
  isOwner: boolean
  currentUserId: string
}

type ReasonTarget = { tx: TransactionFeedRow; mode: "reject" | "unapprove" }

/** Alasan yang paling sering dipakai, biar owner tidak perlu mengetik. */
const QUICK_REASONS = ["Bukti buram", "Nominal beda", "Dobel"]

export const HistoryList = ({
  rows,
  groupId,
  isOwner,
  currentUserId,
}: Props) => {
  const [reasonTarget, setReasonTarget] = useState<ReasonTarget | null>(null)
  const [reason, setReason] = useState("")
  const [editTarget, setEditTarget] = useState<TransactionFeedRow | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  // Yang menunggu persetujuan diangkat ke atas sebagai kartu aksi — itu
  // satu-satunya baris yang menuntut owner melakukan sesuatu.
  const awaiting = isOwner ? rows.filter((r) => r.status === "pending") : []
  const settled = rows.filter((r) => !awaiting.includes(r))

  const months: { label: string; items: TransactionFeedRow[] }[] = []
  for (const tx of settled) {
    const label = monthLabel(tx.created_at)
    const last = months.at(-1)
    if (last?.label === label) last.items.push(tx)
    else months.push({ label, items: [tx] })
  }

  const approve = (tx: TransactionFeedRow) => {
    startTransition(async () => {
      const { error } = await approveTransaction(tx.id, groupId)
      if (error) {
        toast.error("Gagal menyetujui", { description: error })
        return
      }
      toast.success(`Setoran ${tx.display_name} disetujui`)
      router.refresh()
    })
  }

  const submitReason = () => {
    if (!reasonTarget) return
    const { tx, mode } = reasonTarget

    startTransition(async () => {
      const { error } =
        mode === "reject"
          ? await rejectTransaction(tx.id, groupId, reason)
          : await unapproveTransaction(tx.id, groupId, reason)

      if (error) {
        toast.error(mode === "reject" ? "Gagal menolak" : "Gagal membatalkan", {
          description: error,
        })
        return
      }

      toast.success(
        mode === "reject"
          ? `Setoran ${tx.display_name} ditolak`
          : `Persetujuan ${tx.display_name} dibatalkan`,
      )
      setReasonTarget(null)
      setReason("")
      router.refresh()
    })
  }

  const viewProof = async (tx: TransactionFeedRow) => {
    const result = await getProofUrl(tx.proof_path)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  if (rows.length === 0) {
    return (
      <div className="ink-card rounded-[26px] px-6 py-10 text-center">
        <div className="bg-muted text-muted-foreground mx-auto mb-3 grid size-12 place-items-center rounded-2xl">
          <Receipt className="size-5" />
        </div>
        <p className="text-sm font-bold">Belum ada transaksi</p>
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-[28ch] text-xs leading-relaxed">
          Transfer dulu secara manual, lalu catat setoran pertamamu di sini
          beserta bukti transfernya.
        </p>
      </div>
    )
  }

  return (
    <>
      {awaiting.map((tx) => (
        <div
          key={tx.id}
          className="bg-card mb-3 rounded-[22px] p-3.5 shadow-[0_0_0_1.5px_oklch(0.83_0.10_78)]"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "grid size-[34px] shrink-0 place-items-center rounded-full text-[11px] font-bold",
                tintFor(tx.user_id),
              )}
            >
              {initials(tx.display_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{tx.display_name}</p>
              <p className="text-muted-foreground truncate text-[11px]">
                {formatDateTime(tx.created_at)}
                {tx.note ? ` · ${tx.note}` : ""}
              </p>
            </div>
            <span className="tnum text-base font-extrabold">
              {formatRupiah(tx.amount)}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => viewProof(tx)}
              className="bg-muted text-foreground/80 hover:bg-muted/70 h-[38px] flex-1 gap-1.5 rounded-xl text-[13px] font-semibold"
            >
              <Eye className="size-[15px]" strokeWidth={2.2} />
              Lihat bukti
            </Button>

            <Button
              aria-label={`Tolak setoran ${tx.display_name}`}
              disabled={pending}
              onClick={() => {
                setReason("")
                setReasonTarget({ tx, mode: "reject" })
              }}
              className="bg-bad-surface text-bad hover:bg-bad-surface/70 size-[38px] rounded-xl p-0"
            >
              <X className="size-4" strokeWidth={2.4} />
            </Button>

            <Button
              disabled={pending}
              onClick={() => approve(tx)}
              className="bg-ok hover:bg-ok/90 h-[38px] flex-1 gap-1.5 rounded-xl text-[13px] font-bold text-white"
            >
              <Check className="size-[15px]" strokeWidth={2.6} />
              Setujui
            </Button>
          </div>
        </div>
      ))}

      {months.map((month) => (
        <section key={month.label}>
          <h3 className="text-muted-foreground mt-5 mb-2 text-[11px] font-bold tracking-[0.1em] uppercase">
            {month.label}
          </h3>
          <ul className="ink-card overflow-hidden rounded-[22px]">
            {month.items.map((tx, i) => (
              <li key={tx.id} className={cn(i > 0 && "border-t")}>
                <TransactionRow
                  tx={tx}
                  isMine={tx.user_id === currentUserId}
                  isOwner={isOwner}
                  disabled={pending}
                  onViewProof={() => viewProof(tx)}
                  onUnapprove={() => {
                    setReason("")
                    setReasonTarget({ tx, mode: "unapprove" })
                  }}
                  onEditTransaction={() => setEditTarget(tx)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Dialog
        open={reasonTarget !== null}
        onOpenChange={(open) => !open && setReasonTarget(null)}
      >
        <DialogContent className="max-w-[21.25rem] rounded-[26px] p-[22px]">
          <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
            <span className="bg-bad-surface text-bad grid size-[38px] shrink-0 place-items-center rounded-[14px]">
              <X className="size-[18px]" strokeWidth={2.4} />
            </span>
            <div>
              <DialogTitle className="text-base font-extrabold tracking-[-0.02em]">
                {reasonTarget?.mode === "reject"
                  ? "Tolak setoran ini?"
                  : "Batalkan persetujuan?"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {reasonTarget?.mode === "reject"
                  ? `${reasonTarget?.tx.display_name.split(" ")[0]} bisa unggah ulang sebagai transaksi baru.`
                  : "Transaksi kembali berstatus ditolak dan tidak lagi dihitung ke saldo."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            aria-label="Alasan"
            placeholder="Contoh: foto bukti buram, nominal tidak sesuai"
            className="bg-background min-h-[76px] resize-none rounded-[18px] px-[15px] py-[13px] text-[13px]"
          />

          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setReason(q)}
                className="bg-background text-foreground/80 hover:bg-muted focus-visible:ring-ring rounded-full px-[11px] py-1.5 text-[11px] font-semibold shadow-[0_0_0_1px_var(--border)] focus-visible:ring-2 focus-visible:outline-none"
              >
                {q}
              </button>
            ))}
          </div>

          <p className="text-muted-foreground text-[11px]">
            Alasan wajib diisi dan terlihat oleh semua member.
          </p>

          <DialogFooter className="flex-row gap-2.5">
            <Button
              variant="outline"
              className="bg-background h-[46px] flex-1 rounded-full font-bold"
              onClick={() => setReasonTarget(null)}
            >
              Batal
            </Button>
            <Button
              disabled={pending || reason.trim().length === 0}
              onClick={submitReason}
              className="bg-bad h-[46px] flex-1 rounded-full font-bold text-white hover:bg-[oklch(0.50_0.155_25)]"
            >
              {pending
                ? "Menyimpan…"
                : reasonTarget?.mode === "reject"
                  ? "Tolak setoran"
                  : "Batalkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editTarget ? (
        <EditTransactionDialog
          open={editTarget !== null}
          onOpenChange={(open) => !open && setEditTarget(null)}
          txId={editTarget.id}
          groupId={groupId}
          userId={currentUserId}
          currentAmount={Number(editTarget.amount)}
          currentProofPath={editTarget.proof_path}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </>
  )
}

const TransactionRow = ({
  tx,
  isMine,
  isOwner,
  disabled,
  onViewProof,
  onUnapprove,
  onEditTransaction,
}: {
  tx: TransactionFeedRow
  isMine: boolean
  isOwner: boolean
  disabled: boolean
  onViewProof: () => void
  onUnapprove: () => void
  onEditTransaction: () => void
}) => {
  const who = isMine ? "Kamu" : tx.display_name
  const isWithdrawal = tx.type === "withdrawal"

  const { Icon, tone, title, detail, amountClass } = (() => {
    if (tx.status === "rejected") {
      return {
        Icon: X,
        tone: "bg-bad-surface text-bad",
        title: `${who} ditolak`,
        detail: tx.reject_reason,
        amountClass: "text-muted-foreground line-through",
      }
    }
    if (tx.status === "pending") {
      return {
        Icon: Clock,
        tone: "bg-warn-surface text-warn",
        title: `${who} setor`,
        detail: "menunggu persetujuan owner",
        amountClass: "text-muted-foreground",
      }
    }
    if (isWithdrawal) {
      return {
        Icon: ArrowUpFromLine,
        tone: "bg-neutral-surface text-foreground/80",
        title: `${who} tarik dana`,
        detail: tx.note,
        amountClass: "text-muted-foreground",
      }
    }
    return {
      Icon: ArrowDownToLine,
      tone: "bg-ok-surface text-ok",
      title: `${who} setor`,
      detail: tx.note ?? "terverifikasi",
      amountClass: "text-[oklch(0.42_0.09_160)]",
    }
  })()

  const sign = tx.status === "verified" ? (isWithdrawal ? "−" : "+") : ""

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={cn(
          "grid size-[34px] shrink-0 place-items-center rounded-full",
          tone,
        )}
      >
        <Icon className="size-4" strokeWidth={2.2} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="text-muted-foreground truncate text-[11px]">
          {formatDateTime(tx.created_at)}
          {detail ? ` · ${detail}` : ""}
          {tx.was_edited ? " · nominal diedit" : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className={cn("tnum text-sm font-bold", amountClass)}>
          {sign}
          {formatRupiah(tx.amount)}
        </span>

        <button
          type="button"
          onClick={onViewProof}
          aria-label="Lihat bukti"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-lg p-1.5 focus-visible:ring-2 focus-visible:outline-none"
        >
          <Eye className="size-[15px]" strokeWidth={2.2} />
        </button>

        {isOwner && isMine && tx.status !== "rejected" ? (
          <button
            type="button"
            onClick={onEditTransaction}
            aria-label="Edit transaksi"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-lg p-1.5 focus-visible:ring-2 focus-visible:outline-none"
          >
            <Pencil className="size-[15px]" strokeWidth={2.2} />
          </button>
        ) : null}

        {isOwner && tx.status === "verified" && !isWithdrawal && !isMine ? (
          <button
            type="button"
            onClick={onUnapprove}
            disabled={disabled}
            aria-label="Batalkan persetujuan"
            className="text-muted-foreground hover:text-bad focus-visible:ring-ring rounded-lg p-1.5 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            <X className="size-[15px]" strokeWidth={2.2} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
