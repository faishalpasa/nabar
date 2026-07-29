"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { getProofUrl } from "@/app/actions/transactions"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { formatDateTime, formatRupiah } from "@/lib/format"
import type { TransactionFeedRow } from "@/lib/types"
import { cn } from "@/lib/utils"

type TransactionDetailDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tx: TransactionFeedRow | null
}

const STATUS_TONE = {
  pending: {
    badge: "bg-warn-surface text-warn",
    label: "Menunggu persetujuan",
  },
  verified: { badge: "bg-ok-surface text-ok", label: "Terverifikasi" },
  rejected: { badge: "bg-bad-surface text-bad", label: "Ditolak" },
} as const

/**
 * Detail lengkap satu transaksi: nama pelaku, nominal, status, catatan/alasan,
 * dan foto bukti — bukan cuma foto bukti sendirian yang sebelumnya dibuka di
 * tab baru. Foto tetap bisa dibuka full-size lewat tap di dalam drawer ini.
 */
export const TransactionDetailDrawer = ({
  open,
  onOpenChange,
  tx,
}: TransactionDetailDrawerProps) => {
  if (!tx) return null

  const isWithdrawal = tx.type === "withdrawal"
  const tone = STATUS_TONE[tx.status]
  const sign = tx.status === "verified" ? (isWithdrawal ? "−" : "+") : ""
  const noteLabel = tx.status === "rejected" ? "Alasan ditolak" : "Catatan"
  const noteValue = tx.status === "rejected" ? tx.reject_reason : tx.note

  return (
    <Drawer open={open} showSwipeHandle onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex flex-col gap-[18px] overflow-y-auto p-[22px]">
          <DrawerHeader className="p-0 text-left">
            <DrawerTitle className="truncate text-base font-extrabold tracking-[-0.02em]">
              {isWithdrawal ? "Tarik dana" : tx.display_name}
            </DrawerTitle>
            <p className="text-muted-foreground text-[11px]">
              {formatDateTime(tx.created_at)}
              {isWithdrawal ? ` · oleh ${tx.display_name}` : ""}
            </p>
          </DrawerHeader>

          <div className="bg-background flex items-center justify-between rounded-[18px] px-[15px] py-[13px]">
            <div>
              <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.03em] uppercase">
                Nominal
              </p>
              <p className="tnum mt-0.5 text-xl font-extrabold">
                {sign}
                {formatRupiah(tx.amount)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                tone.badge,
              )}
            >
              {tone.label}
            </span>
          </div>

          {noteValue ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-bold">{noteLabel}</p>
              <p className="bg-background rounded-[18px] px-[15px] py-[13px] text-[13px] leading-relaxed">
                {noteValue}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-bold">Foto bukti</p>
            <ProofPreview key={tx.id} proofPath={tx.proof_path} />
          </div>

          <DrawerFooter className="p-0">
            <Button
              variant="outline"
              className="bg-background h-[46px] w-full rounded-full font-bold"
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const ProofPreview = ({ proofPath }: { proofPath: string }) => {
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getProofUrl(proofPath).then((result) => {
      if (cancelled) return
      setLoading(false)
      if ("url" in result) setProofUrl(result.url)
    })
    return () => {
      cancelled = true
    }
  }, [proofPath])

  if (loading) {
    return (
      <div className="bg-background flex h-[220px] items-center justify-center rounded-[20px] text-xs text-muted-foreground">
        Memuat foto…
      </div>
    )
  }

  if (!proofUrl) {
    return (
      <div className="bg-background flex h-[220px] items-center justify-center rounded-[20px] text-xs text-muted-foreground">
        Bukti tidak bisa dimuat.
      </div>
    )
  }

  return (
    <a
      href={proofUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-card block overflow-hidden rounded-[20px] shadow-[0_0_0_1px_var(--border)]"
    >
      <Image
        src={proofUrl}
        alt="Bukti transfer"
        width={400}
        height={400}
        unoptimized
        className="max-h-[320px] w-full object-contain"
      />
    </a>
  )
}
