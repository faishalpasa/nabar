"use client"

import { Check, Copy, UserPlus } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createInvite } from "@/app/actions/invitations"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

export const InviteButton = ({ groupId }: { groupId: string }) => {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const generate = () => {
    startTransition(async () => {
      const result = await createInvite(groupId)
      if ("error" in result) {
        toast.error("Gagal membuat undangan", { description: result.error })
        return
      }
      setCopied(false)
      setUrl(result.url)
    })
  }

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Link undangan disalin")
    } catch {
      toast.error("Tidak bisa menyalin otomatis", {
        description: "Salin manual dari kotak di atas.",
      })
    }
  }

  return (
    <>
      <Button
        size="lg"
        onClick={generate}
        disabled={pending}
        className="ink-cta bg-ink hover:bg-ink/90 h-[52px] w-full gap-2 rounded-full text-[15px] font-bold text-white"
      >
        <UserPlus className="size-[17px]" strokeWidth={2.4} />
        {pending ? "Membuat link…" : "Undang member"}
      </Button>

      <Drawer
        open={url !== null}
        showSwipeHandle
        onOpenChange={(open) => !open && setUrl(null)}
      >
        <DrawerContent>
          <div className="flex flex-col gap-[18px] overflow-y-auto p-[22px]">
            <DrawerHeader className="p-0 text-left">
              <DrawerTitle className="text-base font-extrabold tracking-[-0.02em]">
                Link undangan siap
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-xs">
                Sekali pakai · berlaku 14 hari
              </DrawerDescription>
            </DrawerHeader>

            <div className="bg-background rounded-[18px] px-[15px] py-[13px]">
              <p className="text-foreground/80 font-mono text-[11px] leading-[1.7] break-all">
                {url}
              </p>
            </div>

            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Kirim ke satu orang saja. Untuk orang berikutnya, buat link baru.
            </p>

            <DrawerFooter className="flex-row gap-2.5 p-0">
              <Button
                variant="outline"
                className="bg-background h-[46px] flex-1 rounded-full font-bold"
                onClick={() => setUrl(null)}
              >
                Tutup
              </Button>
              <Button
                onClick={copy}
                className="bg-ink hover:bg-ink/90 h-[46px] flex-1 gap-2 rounded-full font-bold text-white"
              >
                {copied ? (
                  <Check className="size-4" strokeWidth={2.2} />
                ) : (
                  <Copy className="size-4" strokeWidth={2.2} />
                )}
                {copied ? "Tersalin" : "Salin link"}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
