import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AppBar } from "@/components/app-bar"
import { GroupSummary } from "@/components/group-summary"
import { HistoryList } from "@/components/history-list"
import { InviteButton } from "@/components/invite-button"
import { MemberList } from "@/components/member-list"
import { buttonVariants } from "@/components/ui/button"
import { createClient, getUser } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type Params = { id: string }
type Search = { tab?: string }

const GroupPage = async ({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) => {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab === "member" ? "member" : "history"

  const user = await getUser()
  const supabase = await createClient()

  const { data: group } = await supabase
    .from("group_overview")
    .select("*")
    .eq("group_id", id)
    .maybeSingle()

  // RLS menyembunyikan grup yang bukan milik user, jadi "tidak ada" dan "tidak
  // punya akses" sama-sama berujung 404 — dan itu memang yang diinginkan:
  // keberadaan sebuah tabungan tidak bocor ke orang luar.
  if (!group) notFound()

  const isOwner = user?.id === group.owner_id

  const [{ data: feed }, { data: members }] = await Promise.all([
    supabase
      .from("transaction_feed")
      .select("*")
      .eq("group_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("member_contributions")
      .select("*")
      .eq("group_id", id)
      .order("total_contributed", { ascending: false }),
  ])

  return (
    <main className="flex flex-1 flex-col">
      <AppBar title={group.name} backHref="/" />

      <GroupSummary group={group} />

      <nav className="bg-card sticky top-[57px] z-10 flex border-b px-4">
        <TabLink href={`/g/${id}`} active={activeTab === "history"}>
          Riwayat
        </TabLink>
        <TabLink href={`/g/${id}?tab=member`} active={activeTab === "member"}>
          Member {members ? `(${members.length})` : ""}
        </TabLink>
      </nav>

      <div className="flex-1 px-4 py-2">
        {activeTab === "history" ? (
          <HistoryList
            rows={feed ?? []}
            groupId={id}
            isOwner={isOwner}
            currentUserId={user?.id ?? ""}
          />
        ) : (
          <MemberList members={members ?? []} currentUserId={user?.id ?? ""} />
        )}
      </div>

      <div className="bottom-bar flex gap-2 px-4 pt-3">
        {activeTab === "member" && isOwner ? (
          <InviteButton groupId={id} />
        ) : (
          <>
            <Link
              href={`/g/${id}/catat?type=deposit`}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 flex-1 gap-2 rounded-xl text-[15px] font-bold",
              )}
            >
              <ArrowDownToLine className="size-4" />
              Setor
            </Link>

            {isOwner ? (
              <Link
                href={`/g/${id}/catat?type=withdrawal`}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-12 flex-1 gap-2 rounded-xl text-[15px] font-bold",
                )}
              >
                <ArrowUpFromLine className="size-4" />
                Tarik dana
              </Link>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

const TabLink = ({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) => (
  <Link
    href={href}
    aria-current={active ? "page" : undefined}
    className={cn(
      "focus-visible:ring-ring -mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
      "mr-6",
      active
        ? "border-primary text-foreground"
        : "text-muted-foreground border-transparent",
    )}
  >
    {children}
  </Link>
)

export default GroupPage
