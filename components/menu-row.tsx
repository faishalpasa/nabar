import { ChevronRight, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type MenuRowContentProps = {
  icon: LucideIcon
  label: string
  tone?: "default" | "destructive"
}

/**
 * Konten visual satu baris menu (icon + label + chevron) — dipakai di dalam
 * elemen interaktif yang sebenarnya (button, Link, DrawerTrigger) oleh
 * pemanggilnya, bukan merender elemen interaktif sendiri, supaya cocok
 * dipakai di ketiganya tanpa nested-button/nested-link.
 */
export const MenuRowContent = ({
  icon: Icon,
  label,
  tone = "default",
}: MenuRowContentProps) => (
  <span className="flex flex-1 items-center gap-3 py-3.5 text-left">
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl",
        tone === "destructive"
          ? "bg-bad-surface text-bad"
          : "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2.2} />
    </span>
    <span
      className={cn(
        "flex-1 text-sm font-bold",
        tone === "destructive" && "text-bad",
      )}
    >
      {label}
    </span>
    <ChevronRight className="text-muted-foreground size-[18px] shrink-0" />
  </span>
)
