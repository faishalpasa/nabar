import { ArrowDownToLine, ArrowUpFromLine, Pencil } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { HistoryList } from "@/components/history-list"
import { InkHeader, InkLabel } from "@/components/ink-header"
import { InviteButton } from "@/components/invite-button"
import { MemberList } from "@/components/member-list"
import { buttonVariants } from "@/components/ui/button"
import { formatDate, formatPercent, formatRupiah } from "@/lib/format"
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

  const hasGoal = group.goal_amount !== null
  const progress = Number(group.progress ?? 0)

  return (
    <main className="flex flex-1 flex-col">
      <InkHeader
        title={group.name}
        backHref="/"
        action={
          isOwner ? (
            <Link
              href={`/g/${id}/edit`}
              aria-label="Edit tabungan"
              className="focus-visible:ring-ring grid size-8 place-items-center rounded-full bg-white/14 focus-visible:ring-2 focus-visible:outline-none"
            >
              <Pencil className="size-4" strokeWidth={2.2} />
            </Link>
          ) : undefined
        }
      >
        <div className="mt-5">
          <InkLabel>Saldo terkumpul</InkLabel>
          <p className="tnum mt-1.5 text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em]">
            {formatRupiah(group.balance)}
          </p>
        </div>

        {hasGoal ? (
          <>
            <div className="mt-4 flex items-center gap-2.5">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/16">
                <div
                  className="bg-ink-progress absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="tnum text-xs font-extrabold">
                {formatPercent(group.progress)}
              </span>
            </div>
            <div className="text-ink-muted tnum mt-2 flex justify-between text-[11px]">
              <span>dari {formatRupiah(group.goal_amount)}</span>
              {group.goal_deadline ? (
                <span>Target {formatDate(group.goal_deadline)}</span>
              ) : null}
            </div>
          </>
        ) : null}

        <dl className="mt-4.5 flex gap-2">
          <Stat label="Setoran" value={formatRupiah(group.total_deposits)} />
          <Stat label="Ditarik" value={formatRupiah(group.total_withdrawals)} />
          <Stat label="Member" value={String(group.member_count)} />
        </dl>
      </InkHeader>

      <nav className="flex gap-1.5 px-4 pt-4">
        <TabPill href={`/g/${id}`} active={activeTab === "history"}>
          Riwayat
        </TabPill>
        <TabPill href={`/g/${id}?tab=member`} active={activeTab === "member"}>
          Member
        </TabPill>
      </nav>

      <div className="flex-1 px-4 pt-3.5 pb-28">
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

      <div className="ink-dock flex gap-2">
        {activeTab === "member" ? (
          isOwner ? (
            <InviteButton groupId={id} />
          ) : null
        ) : (
          <>
            <Link
              href={`/g/${id}/catat?type=deposit`}
              className={cn(
                buttonVariants({ size: "lg" }),
                "ink-cta bg-ink hover:bg-ink/90 h-[52px] flex-1 gap-2 rounded-full text-[15px] font-bold text-white",
              )}
            >
              <ArrowDownToLine className="size-[17px]" strokeWidth={2.4} />
              Setor
            </Link>

            {isOwner ? (
              <Link
                href={`/g/${id}/catat?type=withdrawal`}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-[52px] flex-1 gap-2 rounded-full bg-white text-[15px] font-bold",
                )}
              >
                <ArrowUpFromLine className="size-[17px]" strokeWidth={2.4} />
                Tarik
              </Link>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex-1 rounded-lg bg-white/10 px-3 py-2.5">
    <dt className="text-ink-muted text-[10px] font-semibold tracking-[0.05em] uppercase">
      {label}
    </dt>
    <dd className="tnum mt-[3px] text-sm font-bold">{value}</dd>
  </div>
)

const TabPill = ({
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
      "focus-visible:ring-ring rounded-full px-4 py-2 text-[13px] transition-colors focus-visible:ring-2 focus-visible:outline-none",
      active
        ? "bg-foreground text-background font-bold"
        : "bg-card text-muted-foreground font-semibold shadow-[0_0_0_1px_var(--border)]",
    )}
  >
    {children}
  </Link>
)

export default GroupPage
