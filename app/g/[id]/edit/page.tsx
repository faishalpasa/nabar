import { notFound } from "next/navigation"

import { EditGroupForm } from "@/components/edit-group-form"
import { InkHeader } from "@/components/ink-header"
import { createClient, getUser } from "@/lib/supabase/server"

const EditGroupPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params

  const user = await getUser()
  const supabase = await createClient()

  const { data: group } = await supabase
    .from("group_overview")
    .select("group_id, name, type, goal_amount, goal_deadline, owner_id")
    .eq("group_id", id)
    .maybeSingle()

  // Bukan cuma "grup tidak ada" — member biasa juga tidak boleh sampai ke
  // form ini sama sekali, bukan sekadar tombolnya disembunyikan.
  if (!group || user?.id !== group.owner_id) notFound()

  return (
    <main className="flex flex-1 flex-col">
      <InkHeader
        title="Edit tabungan"
        backHref={`/g/${id}`}
        lede={`Mengubah info dasar ${group.name}. Jenis tabungan tidak bisa diganti setelah dibuat.`}
      />

      <EditGroupForm
        groupId={id}
        type={group.type}
        name={group.name}
        goalAmount={Number(group.goal_amount ?? 0)}
        goalDeadline={group.goal_deadline ?? ""}
      />
    </main>
  )
}

export default EditGroupPage
