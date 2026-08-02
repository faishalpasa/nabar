"use client"

import { Calendar, Check, Repeat, Target } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createGroup } from "@/app/actions/groups"
import { AmountInput } from "@/components/amount-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { GroupType } from "@/lib/types"
import { cn } from "@/lib/utils"

const TYPES: {
  value: GroupType
  label: string
  hint: string
  icon: typeof Target
}[] = [
  {
    value: "one_time",
    label: "Sekali jalan",
    hint: "Punya target nominal, misalnya liburan atau beli kado",
    icon: Target,
  },
  {
    value: "ongoing",
    label: "Berkelanjutan",
    hint: "Kas yang jalan terus tanpa target, misalnya kas RT",
    icon: Repeat,
  },
]

const GOAL_PRESETS = [5_000_000, 15_000_000, 25_000_000, 50_000_000]

export const CreateGroupForm = () => {
  const [type, setType] = useState<GroupType>("one_time")
  const [pending, startTransition] = useTransition()

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createGroup(formData)
      // createGroup melakukan redirect saat sukses, jadi kode di bawah hanya
      // tercapai kalau gagal.
      if (result?.error) {
        toast.error("Gagal membuat tabungan", { description: result.error })
      }
    })
  }

  return (
    <form action={onSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5.5 px-4 pt-5.5 pb-28">
        <div className="flex flex-col gap-2.5" data-tour-target="new-name">
          <Label htmlFor="name" className="text-[13px] font-bold">
            Nama tabungan
          </Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={50}
            autoComplete="off"
            placeholder="Liburan ke Bali"
            className="bg-card h-[52px] rounded-2xl border-0 text-[15px] font-semibold shadow-[0_0_0_1px_var(--border)]"
          />
        </div>

        <fieldset className="flex flex-col gap-2.5" data-tour-target="new-type">
          <legend className="mb-2.5 text-[13px] font-bold">
            Jenisnya apa?
          </legend>
          <input type="hidden" name="type" value={type} />

          {TYPES.map((option) => {
            const Icon = option.icon
            const selected = type === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                aria-pressed={selected}
                className={cn(
                  "bg-card focus-visible:ring-ring flex w-full items-start gap-3 rounded-[20px] p-[15px] text-left transition-shadow focus-visible:ring-2 focus-visible:outline-none",
                  selected
                    ? "shadow-[0_0_0_2px_var(--primary)]"
                    : "shadow-[0_0_0_1px_var(--border)]",
                )}
              >
                <span
                  className={cn(
                    "mt-px grid size-[34px] shrink-0 place-items-center rounded-xl",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-[17px]" strokeWidth={2.2} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                    {option.hint}
                  </span>
                </span>

                {selected ? (
                  <span className="bg-primary text-primary-foreground grid size-5 shrink-0 place-items-center rounded-full">
                    <Check className="size-3" strokeWidth={3.4} />
                  </span>
                ) : null}
              </button>
            )
          })}
        </fieldset>

        {/* Kas berkelanjutan tidak boleh punya target — database menolaknya lewat
            constraint, jadi field ini disembunyikan sepenuhnya. */}
        {type === "one_time" ? (
          <div className="flex flex-col gap-5.5" data-tour-target="new-target">
            <AmountInput
              id="goal_amount"
              name="goal_amount"
              label="Target nominal"
              optional
              placeholder="15.000.000"
              presets={GOAL_PRESETS}
            />

            <div className="flex flex-col gap-2.5">
              <Label
                htmlFor="goal_deadline"
                className="flex items-center gap-2 text-[13px] font-bold"
              >
                Tanggal target
                <span className="bg-neutral-surface text-muted-foreground rounded-lg px-[7px] py-[3px] text-[10px] font-bold tracking-[0.03em] uppercase">
                  opsional
                </span>
              </Label>
              <div className="relative">
                <Calendar className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-[17px] -translate-y-1/2" />
                <Input
                  id="goal_deadline"
                  name="goal_deadline"
                  type="date"
                  className="bg-card h-[52px] rounded-2xl border-0 pl-[46px] text-[15px] font-semibold shadow-[0_0_0_1px_var(--border)]"
                />
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Boleh diisi tanggalnya saja walau target nominalnya belum tahu.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="ink-dock">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          data-tour-target="new-submit"
          className="ink-cta bg-ink hover:bg-ink/90 h-[52px] w-full rounded-full text-[15px] font-bold text-white"
        >
          {pending ? "Membuat…" : "Buat tabungan"}
        </Button>
      </div>
    </form>
  )
}
