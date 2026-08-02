"use client"

import { LogOut, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { useTour } from "@/app/providers"
import { MenuRowContent } from "@/components/menu-row"
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
import { cn } from "@/lib/utils"

export const ProfileMenu = () => {
  const router = useRouter()
  const { start } = useTour()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const showGuide = () => {
    start()
    router.push("/")
  }

  const signOut = async () => {
    setBusy(true)
    await createClient().auth.signOut()
    // refresh() agar middleware mengevaluasi ulang sesi dan mengarahkan ke /login
    router.refresh()
  }

  return (
    <div className="ink-card rounded-[22px] px-4">
      <button
        type="button"
        onClick={showGuide}
        className="flex w-full items-center"
        data-test-id="profile_button_show_guide"
      >
        <MenuRowContent icon={Sparkles} label="Munculkan Panduan" />
      </button>

      <Drawer open={logoutOpen} showSwipeHandle onOpenChange={setLogoutOpen}>
        <DrawerTrigger
          className={cn("flex w-full items-center border-t")}
          data-test-id="profile_button_logout"
        >
          <MenuRowContent icon={LogOut} label="Logout" />
        </DrawerTrigger>

        <DrawerContent data-test-id="profile_dialog_logout_confirm">
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
                onClick={() => setLogoutOpen(false)}
                data-test-id="profile_button_logout_cancel"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                className="h-[46px] flex-1 gap-2 rounded-full font-bold"
                onClick={signOut}
                disabled={busy}
                data-test-id="profile_button_logout_confirm"
              >
                <LogOut className="size-4" />
                {busy ? "Keluar…" : "Keluar"}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
