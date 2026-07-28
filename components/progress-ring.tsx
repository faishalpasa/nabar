import { cn } from "@/lib/utils"

const SIZE = 52
const STROKE = 5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Cincin progres dengan persentase di tengahnya, dipakai di kartu tabungan
 * bertarget. Menggantikan bar linier: di daftar, bentuk lingkaran lebih cepat
 * dibaca sebagai "seberapa penuh" ketimbang garis tipis.
 */
export const ProgressRing = ({
  value,
  className,
}: {
  /** 0..1 */
  value: number
  className?: string
}) => {
  const clamped = Math.min(1, Math.max(0, value))
  const percent = Math.round(clamped * 100)

  return (
    <div
      className={cn("relative size-[52px] shrink-0", className)}
      role="img"
      aria-label={`${percent} persen dari target`}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${clamped * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      </svg>
      <span className="tnum absolute inset-0 grid place-items-center text-xs font-extrabold">
        {percent}%
      </span>
    </div>
  )
}
