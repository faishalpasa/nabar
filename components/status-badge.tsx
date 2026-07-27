import { cn } from "@/lib/utils";
import type { TxStatus, TxType } from "@/lib/types";

const STYLES = {
  verified: "bg-ok-surface text-ok",
  pending: "bg-warn-surface text-warn",
  rejected: "bg-bad-surface text-bad",
  withdrawal: "bg-neutral-surface text-foreground",
} as const;

const LABELS = {
  verified: "Terverifikasi",
  pending: "Menunggu",
  rejected: "Ditolak",
  withdrawal: "Tarik dana",
} as const;

/** Withdrawal punya badge sendiri — statusnya selalu verified, jadi tidak informatif. */
export function StatusBadge({
  status,
  type,
  className,
}: {
  status: TxStatus;
  type: TxType;
  className?: string;
}) {
  const key = type === "withdrawal" ? "withdrawal" : status;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        STYLES[key],
        className,
      )}
    >
      {LABELS[key]}
    </span>
  );
}
