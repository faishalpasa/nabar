"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPlain, formatShort, MAX_AMOUNT, parseAmount } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  name: string
  label: string
  optional?: boolean
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  /** Tampilan besar untuk layar yang nominalnya jadi fokus utama. */
  emphasis?: boolean
  /** Nominal pintasan, mis. [100000, 250000, 500000, 1000000]. */
  presets?: number[]
  value?: number
  onValueChange?: (value: number) => void
}

/** Input nominal Rupiah dengan pemisah ribuan otomatis. */
export const AmountInput = ({
  id,
  name,
  label,
  optional,
  placeholder,
  required,
  autoFocus,
  emphasis,
  presets,
  value,
  onValueChange,
}: Props) => {
  const [internal, setInternal] = useState(0)

  const controlled = value !== undefined && onValueChange !== undefined
  const current = controlled ? value : internal
  const display = current === 0 ? "" : formatPlain(current)

  const set = (next: number) => {
    const clamped = Math.min(next, MAX_AMOUNT)
    if (controlled) onValueChange(clamped)
    else setInternal(clamped)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-2 text-[13px] font-bold"
      >
        {label}
        {optional ? (
          <span className="bg-neutral-surface text-muted-foreground rounded-lg px-[7px] py-[3px] text-[10px] font-bold tracking-[0.03em] uppercase">
            opsional
          </span>
        ) : null}
      </Label>

      <div className="relative">
        <span
          className={cn(
            "text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2 font-bold",
            emphasis ? "left-[18px] text-lg" : "left-4 text-[15px]",
          )}
        >
          Rp
        </span>
        <Input
          id={id}
          name={name}
          value={display}
          onChange={(e) => set(parseAmount(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={cn(
            "tnum bg-card border-0 font-bold shadow-[0_0_0_1px_var(--border)]",
            emphasis
              ? "h-16 rounded-[20px] pl-[52px] text-[26px] tracking-[-0.03em] shadow-[0_0_0_2px_var(--primary)]"
              : "h-[52px] rounded-2xl pl-11 text-[17px] tracking-[-0.02em]",
          )}
        />
      </div>

      {presets ? (
        <div className="flex flex-wrap gap-[7px]">
          {presets.map((amount) => {
            const active = current === amount
            return (
              <button
                key={amount}
                type="button"
                onClick={() => set(amount)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring rounded-full px-[11px] py-1.5 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "bg-accent text-accent-foreground shadow-[0_0_0_1px_var(--primary)]"
                    : "bg-card text-foreground/80 shadow-[0_0_0_1px_var(--border)]",
                )}
              >
                {formatShort(amount).replace("Rp", "")}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
