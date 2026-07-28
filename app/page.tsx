import { Plus, Wallet } from "lucide-react"
import Link from "next/link"

import { AccountMenu } from "@/components/account-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { formatDate, formatPercent, formatRupiah, initials } from "@/lib/format"
import { createClient, getUser } from "@/lib/supabase/server"
import type { GroupOverview } from "@/lib/types"

export const metadata = { title: "Tabungan saya · Nabung Bareng" }

const HomePage = async () => {
  const user = await getUser()
  const supabase = await createClient()

  // RLS membatasi view ini ke grup yang user ikuti — tidak perlu filter manual.
  const { data: groups, error } = await supabase
    .from("group_overview")
    .select("*")
    .order("created_at", { ascending: false })

  const displayName = user?.displayName ?? "Kamu"
  const avatarUrl = user?.avatarUrl ?? undefined

  return (
    <main className="flex flex-1 flex-col">
      <header className="bg-card/90 sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold">Tabungan saya</h1>
          <p className="text-muted-foreground truncate text-xs">
            Halo, {displayName}
          </p>
        </div>

        <AccountMenu>
          <Avatar className="size-9">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs font-semibold">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
        </AccountMenu>
      </header>

      <div className="flex-1 px-4 py-4">
        {error ? (
          <p className="bg-bad-surface text-bad rounded-xl px-4 py-3 text-sm">
            Gagal memuat tabungan: {error.message}
          </p>
        ) : !groups || groups.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((g) => (
              <li key={g.group_id}>
                <GroupCard group={g} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/new"
        aria-label="Buat tabungan baru"
        className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-card active:scale-95 sticky bottom-6 z-20 mr-4 ml-auto grid size-14 place-items-center rounded-full shadow-lg transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </Link>
    </main>
  )
}

const GroupCard = ({ group }: { group: GroupOverview }) => {
  const hasGoal = group.goal_amount !== null
  const percent = formatPercent(group.progress)
  const deadline = formatDate(group.goal_deadline)

  return (
    <Link
      href={`/g/${group.group_id}`}
      className="bg-card focus-visible:ring-ring active:bg-muted/60 block rounded-2xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 leading-snug font-bold">{group.name}</h2>

        {group.pending_count > 0 ? (
          <span className="bg-warn-surface text-warn shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
            {group.pending_count} menunggu
          </span>
        ) : !hasGoal ? (
          <span className="bg-neutral-surface text-muted-foreground shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
            Kas
          </span>
        ) : null}
      </div>

      <p className="tnum mt-2 text-xl font-extrabold tracking-tight">
        {formatRupiah(group.balance)}
      </p>

      {hasGoal ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <Progress value={Number(group.progress) * 100} className="h-1.5" />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span className="tnum">
              {percent} dari {formatRupiah(group.goal_amount)}
            </span>
            {deadline ? <span>Target {deadline}</span> : null}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground mt-1.5 text-xs">
          {group.member_count} member · tanpa target
        </p>
      )}
    </Link>
  )
}

const EmptyState = () => (
  <div className="flex flex-col items-center px-6 py-16 text-center">
    <div className="bg-accent text-primary mb-4 grid size-14 place-items-center rounded-2xl">
      <Wallet className="size-6" />
    </div>
    <h2 className="font-bold">Belum ada tabungan</h2>
    <p className="text-muted-foreground mt-1.5 max-w-[28ch] text-sm leading-relaxed">
      Buat tabungan pertamamu, atau tunggu diundang lewat link dari temanmu.
    </p>
  </div>
)

export default HomePage
