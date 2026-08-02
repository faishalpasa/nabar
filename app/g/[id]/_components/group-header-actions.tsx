"use client"

import { Download, MoreVertical, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteGroup } from "@/app/actions/groups"
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

export type GroupHeaderActionsProps = {
  groupId: string
  groupName: string
}

export const GroupHeaderActions = ({
  groupId,
  groupName,
}: GroupHeaderActionsProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteGroup(groupId)
      // deleteGroup melakukan redirect saat sukses, jadi kode di bawah hanya
      // tercapai kalau gagal.
      if (result?.error) {
        toast.error("Gagal menghapus tabungan", { description: result.error })
      }
    })
  }

  return (
    <>
      <Drawer open={menuOpen} showSwipeHandle onOpenChange={setMenuOpen}>
        <DrawerTrigger
          aria-label="Menu tabungan"
          data-test-id="group_button_more"
          className="focus-visible:ring-ring grid size-8 place-items-center rounded-full bg-white/14 focus-visible:ring-2 focus-visible:outline-none"
        >
          <MoreVertical className="size-4" strokeWidth={2.2} />
        </DrawerTrigger>

        <DrawerContent data-test-id="group_dialog_menu">
          <div className="px-4 pt-1 pb-[22px]">
            <a
              href={`/g/${groupId}/export`}
              download
              data-test-id="group_link_export"
              className="flex w-full items-center"
              onClick={() => setMenuOpen(false)}
            >
              <MenuRowContent icon={Download} label="Export Tabungan" />
            </a>

            <Link
              href={`/g/${groupId}/edit`}
              data-test-id="group_link_edit"
              className="flex w-full items-center border-t"
              onClick={() => setMenuOpen(false)}
            >
              <MenuRowContent icon={Pencil} label="Edit Tabungan" />
            </Link>

            <button
              type="button"
              data-test-id="group_button_delete"
              className="flex w-full items-center border-t"
              onClick={() => {
                setMenuOpen(false)
                setDeleteOpen(true)
              }}
            >
              <MenuRowContent
                icon={Trash2}
                label="Delete Tabungan"
                tone="destructive"
              />
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={deleteOpen} showSwipeHandle onOpenChange={setDeleteOpen}>
        <DrawerContent data-test-id="group_dialog_delete_confirm">
          <div className="flex flex-col gap-[18px] overflow-y-auto p-[22px]">
            <DrawerHeader className="p-0 text-left">
              <DrawerTitle className="text-base font-extrabold tracking-[-0.02em]">
                Hapus {groupName}?
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-xs">
                Tabungan dan semua transaksinya nggak akan kelihatan lagi.
                Tindakan ini nggak bisa dibatalkan.
              </DrawerDescription>
            </DrawerHeader>

            <DrawerFooter className="flex-row gap-2.5 p-0">
              <Button
                variant="outline"
                className="bg-background h-[46px] flex-1 rounded-full font-bold"
                onClick={() => setDeleteOpen(false)}
                data-test-id="group_button_delete_cancel"
              >
                Batal
              </Button>
              <Button
                disabled={pending}
                onClick={confirmDelete}
                className="bg-bad h-[46px] flex-1 rounded-full font-bold text-white hover:bg-[oklch(0.50_0.155_25)]"
                data-test-id="group_button_delete_confirm"
              >
                {pending ? "Menghapus…" : "Hapus tabungan"}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
