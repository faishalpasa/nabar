import { notFound } from "next/navigation";

import { AppBar } from "@/components/app-bar";
import { RecordTransactionForm } from "@/components/record-transaction-form";
import { createClient, getUser } from "@/lib/supabase/server";
import type { TxType } from "@/lib/types";

export default async function RecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type: rawType } = await searchParams;
  const type: TxType = rawType === "withdrawal" ? "withdrawal" : "deposit";

  const user = await getUser();
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("group_overview")
    .select("group_id, name, owner_id, balance")
    .eq("group_id", id)
    .maybeSingle();

  if (!group || !user) notFound();

  const isOwner = user.id === group.owner_id;

  // Penarikan dana hanya untuk owner. Database juga menolaknya lewat trigger,
  // tapi jangan tampilkan form yang pasti gagal.
  if (type === "withdrawal" && !isOwner) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <AppBar
        title={type === "withdrawal" ? "Tarik dana" : "Setor & unggah bukti"}
        backHref={`/g/${id}`}
      />

      <RecordTransactionForm
        groupId={id}
        groupName={group.name}
        userId={user.id}
        type={type}
        isOwner={isOwner}
        balance={group.balance}
      />
    </main>
  );
}
