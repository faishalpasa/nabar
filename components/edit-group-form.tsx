"use client"

import { Calendar } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { updateGroup } from "@/app/actions/groups"
import { AmountInput } from "@/components/amount-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { GroupType } from "@/lib/types"

const GOAL_PRESETS = [5_000_000, 15_000_000, 25_000_000, 50_000_000]

type EditGroupFormProps = {
  groupId: string
  type: GroupType
  name: string
  goalAmount: number
  goalDeadline: string
}

export const EditGroupForm = ({
  groupId,
  type,
  name,
  goalAmount,
  goalDeadline,
}: EditGroupFormProps) => {
  const [amount, setAmount] = useState(goalAmount)
  const [pending, startTransition] = useTransition()

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateGroup(groupId, formData)
      // updateGroup melakukan redirect saat sukses, jadi kode di bawah hanya
      // tercapai kalau gagal.
      if (result?.error) {
        toast.error("Gagal menyimpan perubahan", { description: result.error })
      }
    })
  }

  return (
    <form action={onSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5.5 px-4 pt-5.5 pb-28">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="name" className="text-[13px] font-bold">
            Nama tabungan
          </Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={50}
            autoComplete="off"
            defaultValue={name}
            className="bg-card h-[52px] rounded-2xl border-0 text-[15px] font-semibold shadow-[0_0_0_1px_var(--border)]"
          />
        </div>

        {/* Jenis tabungan tidak bisa diubah (trigger groups_guard_update
            menolaknya), jadi tidak ada pilihan jenis di form ini — hanya
            field yang memang boleh diedit. */}
        {type === "one_time" ? (
          <>
            <AmountInput
              id="goal_amount"
              name="goal_amount"
              label="Target nominal"
              optional
              placeholder="15.000.000"
              presets={GOAL_PRESETS}
              value={amount}
              onValueChange={setAmount}
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
                  defaultValue={goalDeadline}
                  className="bg-card h-[52px] rounded-2xl border-0 pl-[46px] text-[15px] font-semibold shadow-[0_0_0_1px_var(--border)]"
                />
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Kosongkan salah satu atau keduanya untuk menghapus target.
              </p>
            </div>
          </>
        ) : (
          <p className="bg-accent text-accent-foreground rounded-[20px] px-4 py-3.5 text-xs leading-relaxed">
            Kas berkelanjutan tidak punya target nominal maupun tanggal — hanya
            nama yang bisa diubah.
          </p>
        )}
      </div>

      <div className="ink-dock">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="ink-cta bg-ink hover:bg-ink/90 h-[52px] w-full rounded-full text-[15px] font-bold text-white"
        >
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  )
}
