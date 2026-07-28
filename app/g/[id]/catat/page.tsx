import { notFound } from "next/navigation"

import { InkHeader } from "@/components/ink-header"
import { RecordTransactionForm } from "@/components/record-transaction-form"
import { formatRupiah } from "@/lib/format"
import { createClient, getUser } from "@/lib/supabase/server"
import type { TxType } from "@/lib/types"

const RecordPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}) => {
  const { id } = await params
  const { type: rawType } = await searchParams
  const type: TxType = rawType === "withdrawal" ? "withdrawal" : "deposit"

  const user = await getUser()
  const supabase = await createClient()

  const { data: group } = await supabase
    .from("group_overview")
    .select("group_id, name, owner_id, balance")
    .eq("group_id", id)
    .maybeSingle()

  if (!group || !user) notFound()

  const isOwner = user.id === group.owner_id

  // Penarikan dana hanya untuk owner. Database juga menolaknya lewat trigger,
  // tapi jangan tampilkan form yang pasti gagal.
  if (type === "withdrawal" && !isOwner) notFound()

  const isWithdrawal = type === "withdrawal"

  return (
    <main className="flex flex-1 flex-col">
      <InkHeader
        title={isWithdrawal ? "Tarik dana" : `Setor ke ${group.name}`}
        backHref={`/g/${id}`}
        lede={
          isWithdrawal
            ? undefined
            : "Transfer dulu secara manual, lalu catat di sini beserta bukti transfernya."
        }
      >
        {isWithdrawal ? (
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-ink-muted text-xs">Saldo {group.name}</p>
            <p className="tnum text-[15px] font-bold">
              {formatRupiah(group.balance)}
            </p>
          </div>
        ) : null}
      </InkHeader>

      <RecordTransactionForm
        groupId={id}
        userId={user.id}
        type={type}
        isOwner={isOwner}
        balance={group.balance}
      />
    </main>
  )
}

export default RecordPage
