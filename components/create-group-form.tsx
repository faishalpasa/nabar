"use client";

import { useState, useTransition } from "react";
import { CalendarRange, Repeat, Target } from "lucide-react";
import { toast } from "sonner";

import { createGroup } from "@/app/actions/groups";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { GroupType } from "@/lib/types";

const TYPES: {
  value: GroupType;
  label: string;
  hint: string;
  icon: typeof Target;
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
];

export function CreateGroupForm() {
  const [type, setType] = useState<GroupType>("one_time");
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createGroup(formData);
      // createGroup melakukan redirect saat sukses, jadi kode di bawah hanya
      // tercapai kalau gagal.
      if (result?.error) {
        toast.error("Gagal membuat tabungan", { description: result.error });
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 px-4 py-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-[13px] font-semibold">
            Nama tabungan
          </Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={80}
            autoComplete="off"
            placeholder="Liburan ke Bali"
            className="h-12 rounded-xl text-[15px]"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">Jenis</legend>
          <input type="hidden" name="type" value={type} />

          <div className="flex flex-col gap-2">
            {TYPES.map((option) => {
              const Icon = option.icon;
              const selected = type === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    "focus-visible:ring-ring flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    selected
                      ? "border-primary bg-accent"
                      : "border-border bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-bold",
                        selected && "text-accent-foreground",
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                      {option.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Kas berkelanjutan tidak boleh punya target — database menolaknya lewat
            constraint, jadi field ini disembunyikan sepenuhnya. */}
        {type === "one_time" ? (
          <div className="flex flex-col gap-5">
            <AmountInput
              id="goal_amount"
              name="goal_amount"
              label="Target nominal"
              optional
              placeholder="15.000.000"
            />

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="goal_deadline"
                className="flex items-center gap-2 text-[13px] font-semibold"
              >
                Tanggal target
                <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                  opsional
                </span>
              </Label>
              <div className="relative">
                <CalendarRange className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <Input
                  id="goal_deadline"
                  name="goal_deadline"
                  type="date"
                  className="h-12 rounded-xl pl-10 text-[15px]"
                />
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Boleh diisi tanggalnya saja walau target nominal belum tahu.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="bottom-bar px-4 pt-3">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 w-full rounded-xl text-[15px] font-bold"
        >
          {pending ? "Membuat…" : "Buat tabungan"}
        </Button>
      </div>
    </form>
  );
}
