import Image from "next/image"

import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export type StackedMember = {
  user_id: string
  display_name: string
  avatar_url: string | null
}

/**
 * Warna latar avatar fallback diputar berdasarkan user id, bukan acak, supaya
 * orang yang sama selalu tampil dengan warna yang sama di seluruh aplikasi.
 */
const TINTS = [
  "bg-[oklch(0.90_0.035_175)] text-[oklch(0.32_0.05_200)]",
  "bg-[oklch(0.93_0.035_32)] text-[oklch(0.47_0.15_32)]",
  "bg-[oklch(0.93_0.02_200)] text-[oklch(0.32_0.05_200)]",
  "bg-[oklch(0.945_0.006_240)] text-[oklch(0.53_0.017_240)]",
]

export const tintFor = (userId: string) => {
  let sum = 0
  for (let i = 0; i < userId.length; i += 1) sum += userId.charCodeAt(i)
  return TINTS[sum % TINTS.length]
}

export const AvatarStack = ({
  members,
  total,
  max = 3,
  className,
}: {
  members: StackedMember[]
  /** Jumlah member sebenarnya; sisanya diringkas jadi "+n". */
  total: number
  max?: number
  className?: string
}) => {
  const shown = members.slice(0, max)
  const rest = total - shown.length

  return (
    <div className={cn("flex shrink-0", className)}>
      {shown.map((m, i) => (
        <span
          key={m.user_id}
          className={cn(
            "border-card grid size-[22px] shrink-0 place-items-center overflow-hidden rounded-full border-2 text-[9px] leading-none font-bold",
            tintFor(m.user_id),
            i > 0 && "-ml-[7px]",
          )}
        >
          {m.avatar_url ? (
            <Image
              src={m.avatar_url}
              alt=""
              width={22}
              height={22}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            initials(m.display_name)
          )}
        </span>
      ))}

      {rest > 0 ? (
        <span className="bg-neutral-surface text-muted-foreground border-card -ml-[7px] grid size-[22px] shrink-0 place-items-center rounded-full border-2 text-[9px] leading-none font-bold">
          +{rest}
        </span>
      ) : null}
    </div>
  )
}
