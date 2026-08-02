import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { buildHistoryWorkbook, filenameFor } from "@/lib/xlsx"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: group } = await supabase
    .from("group_overview")
    .select("*")
    .eq("group_id", id)
    .maybeSingle()

  // RLS sudah membatasi group_overview ke grup yang user ikuti, sama seperti
  // app/g/[id]/page.tsx — 404, bukan bocorkan keberadaan grup ke orang luar.
  if (!group) return new NextResponse(null, { status: 404 })

  const { data: feed } = await supabase
    .from("transaction_feed")
    .select("*")
    .eq("group_id", id)
    .order("created_at", { ascending: false })

  const buffer = await buildHistoryWorkbook(group, feed ?? [])

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameFor(group.name)}"`,
    },
  })
}
