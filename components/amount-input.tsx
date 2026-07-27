"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPlain, parseAmount } from "@/lib/format"

type Props = {
  id: string
  name: string
  label: string
  optional?: boolean
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  /**
   * Nilai numerik. Kalau diisi bersama onValueChange, komponen jadi controlled;
   * kalau tidak, ia mengelola state sendiri dan nilainya ikut terkirim lewat
   * FormData karena atribut `name`.
   */
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
  value,
  onValueChange,
}: Props) => {
  const [internal, setInternal] = useState(0)

  const controlled = value !== undefined && onValueChange !== undefined
  const current = controlled ? value : internal
  const display = current === 0 ? "" : formatPlain(current)

  function handleChange(raw: string) {
    const next = parseAmount(raw)
    if (controlled) onValueChange(next)
    else setInternal(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={id}
        className="flex items-center gap-2 text-[13px] font-semibold"
      >
        {label}
        {optional ? (
          <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
            opsional
          </span>
        ) : null}
      </Label>

      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] font-semibold">
          Rp
        </span>
        <Input
          id={id}
          name={name}
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="tnum h-12 rounded-xl pl-10 text-[15px] font-semibold"
        />
      </div>
    </div>
  )
}
