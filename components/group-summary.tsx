import { Progress } from "@/components/ui/progress"
import { formatDate, formatPercent, formatRupiah } from "@/lib/format"
import type { GroupOverview } from "@/lib/types"

export const GroupSummary = ({ group }: { group: GroupOverview }) => {
  const hasGoal = group.goal_amount !== null
  const deadline = formatDate(group.goal_deadline)
  const isNegative = Number(group.balance) < 0

  return (
    <section className="border-b px-4 pt-5 pb-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Saldo terkumpul
      </p>

      <p
        className="tnum mt-1 text-[28px] leading-tight font-extrabold tracking-tight"
        // Saldo minus mungkin terjadi: penarikan melebihi saldo tidak dicegah
        // database, jadi tampilkan apa adanya alih-alih menyembunyikannya.
        style={isNegative ? { color: "var(--bad)" } : undefined}
      >
        {formatRupiah(group.balance)}
      </p>

      {hasGoal ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <Progress value={Number(group.progress) * 100} className="h-2" />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span className="tnum font-medium">
              {formatPercent(group.progress)} dari{" "}
              {formatRupiah(group.goal_amount)}
            </span>
            {deadline ? <span>Target {deadline}</span> : null}
          </div>
        </div>
      ) : null}

      <dl className="text-muted-foreground mt-4 flex gap-5 text-xs">
        <div>
          <dt className="font-medium">Total setoran</dt>
          <dd className="tnum text-foreground mt-0.5 font-bold">
            {formatRupiah(group.total_deposits)}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Total ditarik</dt>
          <dd className="tnum text-foreground mt-0.5 font-bold">
            {formatRupiah(group.total_withdrawals)}
          </dd>
        </div>
      </dl>
    </section>
  )
}
