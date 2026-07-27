"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { acceptInvite } from "@/app/actions/invitations"
import { Button } from "@/components/ui/button"

export const JoinConfirm = ({
  token,
  groupName,
}: {
  token: string
  groupName: string
}) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function join() {
    startTransition(async () => {
      const result = await acceptInvite(token)

      if ("error" in result) {
        toast.error("Gagal bergabung", { description: result.error })
        return
      }

      toast.success(`Kamu bergabung ke ${groupName}`)
      router.replace(`/g/${result.groupId}`)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() => router.replace("/")}
          className="h-12 flex-1 rounded-xl text-[15px] font-bold"
        >
          Tolak
        </Button>
        <Button
          size="lg"
          disabled={pending}
          onClick={join}
          className="h-12 flex-1 rounded-xl text-[15px] font-bold"
        >
          {pending ? "Bergabung…" : "Gabung"}
        </Button>
      </div>

      <p className="text-muted-foreground text-center text-xs leading-relaxed">
        Setelah bergabung, kamu bisa melihat seluruh riwayat dan kontribusi
        semua member.
      </p>
    </div>
  )
}
