"use client"

import { Check, Copy, UserPlus } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createInvite } from "@/app/actions/invitations"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export const InviteButton = ({ groupId }: { groupId: string }) => {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function generate() {
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

  async function copy() {
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
        className="h-12 w-full gap-2 rounded-xl font-bold"
      >
        <UserPlus className="size-4" />
        {pending ? "Membuat link…" : "Undang member"}
      </Button>

      <Dialog
        open={url !== null}
        onOpenChange={(open) => !open && setUrl(null)}
      >
        <DialogContent className="max-w-[21rem] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Link undangan siap</DialogTitle>
            <DialogDescription>
              Kirim link ini ke satu orang. Link hanya bisa dipakai sekali dan
              kedaluwarsa dalam 14 hari — buat link baru untuk orang berikutnya.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted rounded-xl px-3 py-2.5">
            <p className="text-foreground/80 font-mono text-[11px] leading-relaxed break-all">
              {url}
            </p>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setUrl(null)}
            >
              Tutup
            </Button>
            <Button
              className="flex-1 gap-2 rounded-xl font-bold"
              onClick={copy}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Tersalin" : "Salin link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
