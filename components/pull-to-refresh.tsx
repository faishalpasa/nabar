"use client"

import { ArrowDown, Loader2 } from "lucide-react"

import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import { cn } from "@/lib/utils"

const THRESHOLD = 80

/**
 * Cuma aktif di iOS standalone (lihat usePullToRefresh) — Android/Chrome
 * dan tab browser biasa sudah punya pull-to-refresh bawaan browsernya
 * sendiri.
 */
export const PullToRefresh = ({ children }: { children: React.ReactNode }) => {
  const { pullDistance, isRefreshing } = usePullToRefresh(() =>
    window.location.reload(),
  )

  const isVisible = pullDistance > 0 || isRefreshing
  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const isTriggered = pullDistance >= THRESHOLD

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center"
        style={{
          transform: `translateY(${pullDistance - 52}px)`,
          transition:
            isRefreshing || pullDistance === 0
              ? "transform 0.2s ease"
              : undefined,
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div
          className={cn(
            "bg-card mt-2 grid size-10 place-items-center rounded-full shadow-[0_0_0_1px_var(--border)]",
            isTriggered ? "text-primary" : "text-muted-foreground",
          )}
        >
          {isRefreshing ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ArrowDown
              className="size-5 transition-transform duration-200"
              style={{ transform: `rotate(${progress * 180}deg)` }}
            />
          )}
        </div>
      </div>

      <div
        style={
          pullDistance > 0 || isRefreshing
            ? {
                transform: `translateY(${pullDistance}px)`,
                transition:
                  isRefreshing || pullDistance === 0
                    ? "transform 0.2s ease"
                    : undefined,
              }
            : undefined
        }
      >
        {children}
      </div>
    </>
  )
}
