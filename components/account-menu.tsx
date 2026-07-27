"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

export function AccountMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    // refresh() agar middleware mengevaluasi ulang sesi dan mengarahkan ke /login
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Akun saya"
        className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
      >
        {children}
      </DialogTrigger>

      <DialogContent className="max-w-[20rem] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Keluar dari akun?</DialogTitle>
          <DialogDescription>
            Kamu perlu masuk lagi dengan Google untuk melihat tabunganmu.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2 rounded-xl"
            onClick={signOut}
            disabled={busy}
          >
            <LogOut className="size-4" />
            {busy ? "Keluar…" : "Keluar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
