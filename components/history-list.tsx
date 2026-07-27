"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Pencil, Receipt, X } from "lucide-react";
import { toast } from "sonner";

import {
  approveTransaction,
  getProofUrl,
  rejectTransaction,
  unapproveTransaction,
} from "@/app/actions/transactions";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatSigned, initials } from "@/lib/format";
import type { TransactionFeedRow } from "@/lib/types";

type Props = {
  rows: TransactionFeedRow[];
  groupId: string;
  isOwner: boolean;
  currentUserId: string;
};

type ReasonTarget = {
  tx: TransactionFeedRow;
  mode: "reject" | "unapprove";
};

export function HistoryList({ rows, groupId, isOwner, currentUserId }: Props) {
  const [reasonTarget, setReasonTarget] = useState<ReasonTarget | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function approve(tx: TransactionFeedRow) {
    startTransition(async () => {
      const { error } = await approveTransaction(tx.id, groupId);
      if (error) {
        toast.error("Gagal menyetujui", { description: error });
        return;
      }
      toast.success(`Setoran ${tx.display_name} disetujui`);
      router.refresh();
    });
  }

  function submitReason() {
    if (!reasonTarget) return;
    const { tx, mode } = reasonTarget;

    startTransition(async () => {
      const { error } =
        mode === "reject"
          ? await rejectTransaction(tx.id, groupId, reason)
          : await unapproveTransaction(tx.id, groupId, reason);

      if (error) {
        toast.error(mode === "reject" ? "Gagal menolak" : "Gagal membatalkan", {
          description: error,
        });
        return;
      }

      toast.success(
        mode === "reject"
          ? `Setoran ${tx.display_name} ditolak`
          : `Persetujuan ${tx.display_name} dibatalkan`,
      );
      setReasonTarget(null);
      setReason("");
      router.refresh();
    });
  }

  async function viewProof(tx: TransactionFeedRow) {
    const result = await getProofUrl(tx.proof_path);
    if ("error" in result) return toast.error(result.error);
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <div className="bg-muted text-muted-foreground mb-3 grid size-12 place-items-center rounded-2xl">
          <Receipt className="size-5" />
        </div>
        <p className="text-sm font-bold">Belum ada transaksi</p>
        <p className="text-muted-foreground mt-1 max-w-[26ch] text-xs leading-relaxed">
          Setor pertama kali, lalu unggah bukti transfernya di sini.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y">
        {rows.map((tx) => {
          const isMine = tx.user_id === currentUserId;
          const isWithdrawal = tx.type === "withdrawal";
          const canApprove = isOwner && tx.status === "pending";
          const canUnapprove =
            isOwner && tx.status === "verified" && !isWithdrawal && !isMine;
          const canEdit = isOwner && isMine && tx.status !== "rejected";

          return (
            <li key={tx.id} className="flex gap-3 py-3.5">
              <Avatar className="mt-0.5 size-9 shrink-0">
                {tx.avatar_url ? <AvatarImage src={tx.avatar_url} alt="" /> : null}
                <AvatarFallback className="text-[11px] font-semibold">
                  {initials(tx.display_name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {tx.display_name}
                      {isMine ? (
                        <span className="text-muted-foreground font-medium">
                          {" "}
                          · Kamu
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDateTime(tx.created_at)}
                      {tx.was_edited ? " · nominal diedit" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className="tnum text-sm font-bold"
                      style={
                        isWithdrawal ? { color: "var(--muted-foreground)" } : undefined
                      }
                    >
                      {formatSigned(tx.signed_amount)}
                    </span>
                    <StatusBadge status={tx.status} type={tx.type} />
                  </div>
                </div>

                {tx.note ? (
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {tx.note}
                  </p>
                ) : null}

                {tx.reject_reason ? (
                  <p className="bg-bad-surface text-bad mt-1.5 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed">
                    Alasan: {tx.reject_reason}
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => viewProof(tx)}
                    className="text-muted-foreground h-7 gap-1.5 rounded-lg px-2 text-xs"
                  >
                    <Eye className="size-3.5" />
                    Bukti
                  </Button>

                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled
                      title="Belum tersedia"
                      className="text-muted-foreground h-7 gap-1.5 rounded-lg px-2 text-xs"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  ) : null}

                  {canApprove ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approve(tx)}
                        disabled={pending}
                        className="h-7 gap-1.5 rounded-lg px-2.5 text-xs font-bold"
                      >
                        <Check className="size-3.5" />
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          setReason("");
                          setReasonTarget({ tx, mode: "reject" });
                        }}
                        className="h-7 gap-1.5 rounded-lg px-2.5 text-xs font-bold"
                      >
                        <X className="size-3.5" />
                        Tolak
                      </Button>
                    </>
                  ) : null}

                  {canUnapprove ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        setReason("");
                        setReasonTarget({ tx, mode: "unapprove" });
                      }}
                      className="text-bad h-7 gap-1.5 rounded-lg px-2 text-xs"
                    >
                      <X className="size-3.5" />
                      Batalkan
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={reasonTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReasonTarget(null);
        }}
      >
        <DialogContent className="max-w-[21rem] rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {reasonTarget?.mode === "reject"
                ? "Tolak setoran ini?"
                : "Batalkan persetujuan?"}
            </DialogTitle>
            <DialogDescription>
              {reasonTarget?.mode === "reject"
                ? `${reasonTarget?.tx.display_name} bisa mengunggah ulang sebagai transaksi baru.`
                : "Transaksi akan kembali berstatus ditolak dan tidak lagi dihitung ke saldo."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason" className="text-[13px] font-semibold">
              Alasan
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Contoh: foto bukti buram, nominal tidak sesuai"
              className="resize-none rounded-xl text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Alasan wajib diisi dan akan terlihat oleh semua member.
            </p>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setReasonTarget(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl font-bold"
              disabled={pending || reason.trim().length === 0}
              onClick={submitReason}
            >
              {pending ? "Menyimpan…" : "Kirim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
