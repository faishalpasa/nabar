import { PiggyBank, Repeat, Target } from "lucide-react"
import Link from "next/link"

import { AvatarStack, type StackedMember } from "@/components/avatar-stack"
import { ProgressRing } from "@/components/progress-ring"
import { formatRupiah, formatShort, timeLeft } from "@/lib/format"
import type { GroupOverview } from "@/lib/types"
import { cn } from "@/lib/utils"

export const GroupCard = ({
  group,
  members,
  currentUserId,
}: {
  group: GroupOverview
  members: StackedMember[]
  currentUserId: string
}) => {
  const hasGoal = group.goal_amount !== null
  const reached = hasGoal && Number(group.balance) >= Number(group.goal_amount)
  const left = timeLeft(group.goal_deadline)
  const isOwner = group.owner_id === currentUserId

  return (
    <Link
      href={`/g/${group.group_id}`}
      className="ink-card focus-visible:ring-ring active:bg-muted/40 flex gap-3.5 rounded-lg p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {hasGoal ? (
        <ProgressRing value={Number(group.progress ?? 0)} />
      ) : (
        <span className="bg-accent text-accent-foreground grid size-[52px] shrink-0 place-items-center rounded-[18px]">
          <Repeat className="size-[22px]" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 text-[15px] font-bold tracking-[-0.015em]">
            {group.name}
          </h3>

          <div className="flex shrink-0 items-center gap-1.5">
            {group.pending_count > 0 ? (
              <span className="bg-warn-surface text-warn shrink-0 rounded-full px-2 py-[3px] text-[10px] font-extrabold tracking-[0.03em]">
                {group.pending_count} MENUNGGU
              </span>
            ) : !hasGoal ? (
              <span className="bg-neutral-surface text-muted-foreground shrink-0 rounded-full px-2 py-[3px] text-[10px] font-extrabold tracking-[0.03em]">
                KAS
              </span>
            ) : null}

            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-[3px] text-[10px] font-extrabold tracking-[0.03em]",
                isOwner
                  ? "bg-accent text-accent-foreground"
                  : "bg-neutral-surface text-muted-foreground",
              )}
            >
              {isOwner ? "OWNER" : "MEMBER"}
            </span>
          </div>
        </div>

        <p className="tnum mt-[5px] text-[21px] font-extrabold tracking-[-0.03em]">
          {formatRupiah(group.balance)}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <AvatarStack members={members} total={group.member_count} />
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-[11px]">
            {!hasGoal
              ? `${group.member_count} member · jalan terus`
              : reached
                ? "target tercapai"
                : `dari ${formatShort(group.goal_amount ?? 0)}${left ? ` · ${left}` : ""}`}
          </span>
        </div>
      </div>
    </Link>
  )
}

export const TYPE_HINTS = [
  {
    icon: Target,
    title: "Sekali jalan",
    body: "Punya target nominal — liburan, kado",
    tone: "bg-accent text-accent-foreground",
  },
  {
    icon: Repeat,
    title: "Berkelanjutan",
    body: "Kas yang jalan terus tanpa target",
    tone: "bg-muted text-muted-foreground",
  },
]

export const EmptyState = () => (
  <>
    <div className="ink-card rounded-[26px] px-6 py-7 text-center">
      <div className="bg-accent text-primary mx-auto mb-4 grid size-14 place-items-center rounded-[20px]">
        <PiggyBank className="size-6" />
      </div>
      <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">
        Mulai tabungan pertamamu
      </h2>
      <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
        Kumpulkan uang bareng teman untuk satu target, atau kelola kas yang
        jalan terus. Bisa juga tunggu link undangan dari temanmu.
      </p>
    </div>

    <ul className="mt-4 flex flex-col gap-2.5">
      {TYPE_HINTS.map((hint) => {
        const Icon = hint.icon
        return (
          <li
            key={hint.title}
            className="ink-card flex items-center gap-3 rounded-[20px] px-4 py-3.5"
          >
            <span
              className={cn(
                "grid size-[34px] shrink-0 place-items-center rounded-xl",
                hint.tone,
              )}
            >
              <Icon className="size-[17px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold">{hint.title}</p>
              <p className="text-muted-foreground mt-px text-[11px]">
                {hint.body}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  </>
)
