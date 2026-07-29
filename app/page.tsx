import { Clock, Plus } from "lucide-react"
import Link from "next/link"

import { AccountMenu } from "@/components/account-menu"
import { type StackedMember } from "@/components/avatar-stack"
import { BrandMark } from "@/components/brand"
import { EmptyState, GroupCard } from "@/components/group-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { formatRupiah, initials } from "@/lib/format"
import { createClient, getUser } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata = { title: "Tabungan saya · Nabar" }

const HomePage = async () => {
  const user = await getUser()
  const supabase = await createClient()

  // Dua query berjalan bersamaan. member_contributions sengaja tanpa filter
  // group_id: RLS sudah membatasinya ke grup yang user ikuti, jadi satu
  // perjalanan cukup untuk mengisi tumpukan avatar di semua kartu.
  const [{ data: groups, error }, { data: members }] = await Promise.all([
    supabase
      .from("group_overview")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("member_contributions")
      .select("group_id, user_id, display_name, avatar_url, total_contributed")
      .order("total_contributed", { ascending: false }),
  ])

  const byGroup = new Map<string, StackedMember[]>()
  for (const m of members ?? []) {
    const list = byGroup.get(m.group_id) ?? []
    list.push(m)
    byGroup.set(m.group_id, list)
  }

  const displayName = user?.displayName ?? "Kamu"
  const avatarUrl = user?.avatarUrl ?? undefined

  // Kontribusi pribadi, bukan saldo total tiap tabungan (yang juga berisi
  // setoran member lain) — gross per member_contributions, tidak dikurangi
  // withdrawal, sesuai business rule di supabase/migrations/20260728120300_views.sql.
  const total = (members ?? [])
    .filter((m) => m.user_id === user?.id)
    .reduce((sum, m) => sum + Number(m.total_contributed), 0)
  const pending = (groups ?? []).reduce((sum, g) => sum + g.pending_count, 0)
  const isEmpty = !groups || groups.length === 0

  return (
    <main className="flex flex-1 flex-col">
      <header className="ink-panel px-4 pt-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="text-ink-accent flex flex-1 items-center gap-[7px]">
            <BrandMark className="size-5" />
            <span className="text-ink-foreground text-[13px] font-bold tracking-[-0.02em]">
              Nabar
            </span>
          </div>

          <AccountMenu>
            <Avatar className="size-[34px] bg-white/14">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-transparent text-xs font-bold text-current">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
          </AccountMenu>
        </div>

        <p className="text-ink-accent mt-6 text-xs font-semibold tracking-[0.06em] uppercase">
          Total kamu simpan
        </p>
        <p
          className={cn(
            "tnum mt-1.5 text-4xl leading-[1.05] font-extrabold tracking-[-0.035em]",
            isEmpty && "text-ink-foreground/45",
          )}
        >
          {formatRupiah(total)}
        </p>

        {isEmpty ? (
          <p className="text-ink-muted mt-3.5 text-xs">
            Belum ada tabungan yang kamu ikuti.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {pending > 0 ? (
              <span className="bg-warn-surface text-warn inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-xs font-bold">
                <Clock className="size-[13px]" strokeWidth={2.4} />
                {pending} perlu disetujui
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full bg-white/14 px-3 py-[7px] text-xs font-semibold">
              {groups.length} tabungan aktif
            </span>
          </div>
        )}
      </header>

      <div className="flex-1 px-4 pt-5 pb-28">
        {error ? (
          <p className="bg-bad-surface text-bad rounded-2xl px-4 py-3 text-sm">
            Gagal memuat tabungan: {error.message}
          </p>
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <h2 className="text-muted-foreground mb-3 text-[13px] font-bold tracking-[0.06em] uppercase">
              Tabungan saya
            </h2>
            <ul className="flex flex-col gap-3">
              {groups.map((g) => (
                <li key={g.group_id}>
                  <GroupCard
                    group={g}
                    members={byGroup.get(g.group_id) ?? []}
                    currentUserId={user?.id ?? ""}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="ink-dock">
        <Link
          href="/new"
          className={cn(
            buttonVariants({ size: "lg" }),
            "ink-cta bg-ink hover:bg-ink/90 h-[52px] w-full gap-2 rounded-full text-[15px] font-bold text-white",
          )}
        >
          <Plus className="size-[18px]" strokeWidth={2.5} />
          Buat tabungan baru
        </Link>
      </div>
    </main>
  )
}

export default HomePage
