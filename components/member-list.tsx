import Image from "next/image"

import { tintFor } from "@/components/avatar-stack"
import { formatRupiah, initials } from "@/lib/format"
import type { MemberContribution } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Kontribusi ditampilkan sebagai bar yang dibandingkan ke penyetor terbesar,
 * bukan ke target tabungan — pertanyaan yang dijawab tab ini adalah "siapa
 * menyetor berapa dibanding yang lain", bukan "seberapa dekat ke target".
 */
export const MemberList = ({
  members,
  currentUserId,
}: {
  members: MemberContribution[]
  currentUserId: string
}) => {
  const top = Math.max(1, ...members.map((m) => Number(m.total_contributed)))

  return (
    <>
      <div className="ink-card rounded-[22px] px-4">
        {members.map((m, i) => {
          const amount = Number(m.total_contributed)
          const share = amount / top

          return (
            <div
              key={m.user_id}
              className={cn(
                "flex items-center gap-3 py-3.5",
                i > 0 && "border-t",
              )}
            >
              <span
                className={cn(
                  "grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold",
                  tintFor(m.user_id),
                )}
              >
                {m.avatar_url ? (
                  <Image
                    src={m.avatar_url}
                    alt=""
                    width={38}
                    height={38}
                    unoptimized
                    className="size-full object-cover"
                  />
                ) : (
                  initials(m.display_name)
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">
                    {m.display_name}
                    {m.user_id === currentUserId ? (
                      <span className="text-muted-foreground font-medium">
                        {" "}
                        · Kamu
                      </span>
                    ) : null}
                  </p>
                  <span className="tnum shrink-0 text-sm font-extrabold">
                    {formatRupiah(amount)}
                  </span>
                </div>

                <div className="mt-[7px] flex items-center gap-2">
                  <div className="bg-neutral-surface relative h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className="bg-primary absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${share * 100}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-bold",
                      m.pending_count > 0
                        ? "text-warn"
                        : "text-muted-foreground",
                    )}
                  >
                    {m.pending_count > 0
                      ? `${m.pending_count} menunggu`
                      : m.role === "owner"
                        ? "Owner"
                        : "Member"}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-muted-foreground mt-3.5 px-0.5 text-[11px] leading-relaxed">
        Bar dibandingkan ke penyetor terbesar. Angka ini total setoran
        terverifikasi dan tidak berkurang saat ada penarikan.
      </p>
    </>
  )
}
