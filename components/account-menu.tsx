"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { createClient } from "@/lib/supabase/client"

export const AccountMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function signOut() {
    setBusy(true)
    await createClient().auth.signOut()
    // refresh() agar middleware mengevaluasi ulang sesi dan mengarahkan ke /login
    router.refresh()
  }

  return (
    <Drawer open={open} showSwipeHandle onOpenChange={setOpen}>
      <DrawerTrigger
        aria-label="Akun saya"
        className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
      >
        {children}
      </DrawerTrigger>

      <DrawerContent>
        <div className="flex flex-col gap-[18px] overflow-y-auto p-[22px]">
          <DrawerHeader className="p-0 text-left">
            <DrawerTitle className="text-base font-extrabold tracking-[-0.02em]">
              Keluar dari akun?
            </DrawerTitle>
            <DrawerDescription className="mt-0.5 text-xs">
              Kamu perlu masuk lagi dengan Google untuk melihat tabunganmu.
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="flex-row gap-2.5 p-0">
            <Button
              variant="outline"
              className="bg-background h-[46px] flex-1 rounded-full font-bold"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="h-[46px] flex-1 gap-2 rounded-full font-bold"
              onClick={signOut}
              disabled={busy}
            >
              <LogOut className="size-4" />
              {busy ? "Keluar…" : "Keluar"}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
