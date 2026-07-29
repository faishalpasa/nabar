import { TriangleAlert } from "lucide-react"
import Link from "next/link"

import { getInvitationPreview } from "@/app/actions/invitations"
import { BrandMark } from "@/components/brand"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { JoinConfirm } from "@/components/join-confirm"
import { buttonVariants } from "@/components/ui/button"
import { formatDate, formatRupiah } from "@/lib/format"
import { getUser } from "@/lib/supabase/server"
import type { InvitationState } from "@/lib/types"
import { cn } from "@/lib/utils"

export const metadata = { title: "Undangan · Nabar" }

const CTA = "h-[52px] w-full rounded-full text-[15px] font-bold"

const PROBLEM: Record<string, { title: string; body: string }> = {
  not_found: {
    title: "Link undangan tidak dikenali",
    body: "Mungkin ada bagian link yang terpotong saat dikirim. Minta pengundangmu membuat link baru.",
  },
  expired: {
    title: "Undangan sudah kedaluwarsa",
    body: "Link undangan hanya berlaku 14 hari. Minta pengundangmu membuat link baru.",
  },
  used: {
    title: "Undangan sudah dipakai",
    body: "Setiap link hanya bisa dipakai satu orang. Minta pengundangmu membuat link baru untukmu.",
  },
  revoked: {
    title: "Undangan sudah dibatalkan",
    body: "Pemilik tabungan mencabut link ini.",
  },
}

const JoinPage = async ({ params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const user = await getUser()
  const result = await getInvitationPreview(token)

  if ("error" in result) {
    return (
      <Problem
        title="Undangan tidak bisa dibuka"
        body={result.error}
        showHome={Boolean(user)}
      />
    )
  }

  const preview = result.preview
  const state: InvitationState = preview.state

  if (state === "already_member") {
    return (
      <Problem
        title="Kamu sudah jadi member"
        body={`Kamu sudah tergabung di ${preview.group_name}.`}
        showHome
        primaryHref={preview.group_id ? `/g/${preview.group_id}` : "/"}
        primaryLabel="Buka tabungan"
      />
    )
  }

  const problem = PROBLEM[state]
  if (problem) {
    return (
      <Problem
        title={problem.title}
        body={problem.body}
        showHome={Boolean(user)}
      />
    )
  }

  const goal = preview.goal_amount ? formatRupiah(preview.goal_amount) : null
  const deadline = formatDate(preview.goal_deadline)

  return (
    <main className="flex min-h-dvh flex-1 flex-col justify-between pb-10">
      <div>
        <div className="ink-panel px-6 pt-14 pb-15 text-center">
          <div className="text-ink-accent mx-auto mb-5 grid size-15 place-items-center rounded-[22px] bg-white/12">
            <BrandMark className="size-[34px]" />
          </div>
          <p className="text-ink-muted text-[13px]">
            <span className="text-ink-foreground font-bold">
              {preview.invited_by_name ?? "Seseorang"}
            </span>{" "}
            mengundang kamu ke
          </p>
          <h1 className="mt-2 text-[26px] leading-[1.15] font-extrabold tracking-[-0.035em]">
            {preview.group_name}
          </h1>
        </div>

        {/* Kartu ringkasan sengaja naik menimpa panel — menandai bahwa isinya
            milik undangan di atasnya, bukan bagian halaman yang terpisah. */}
        <div className="ink-card mx-5 -mt-9 rounded-3xl p-5 shadow-[0_6px_20px_rgba(20,40,50,0.08),0_0_0_1px_var(--border)]">
          <div className="flex gap-2.5">
            <Fact
              label="Target"
              value={goal ?? "Tanpa target"}
              hint={goal ? undefined : "Kas berkelanjutan"}
            />
            <Fact label="Sampai" value={deadline ?? "Tidak dibatasi"} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 px-5">
        {user ? (
          <JoinConfirm token={token} groupName={preview.group_name ?? ""} />
        ) : (
          <>
            {/* Setelah daftar, callback mengembalikan user ke halaman ini juga —
                jadi dialog konfirmasi langsung muncul dan wizard bikin tabungan
                di-skip, sesuai alur di spec. */}
            <GoogleSignInButton
              next={`/join/${token}`}
              label="Daftar dengan Google"
            />
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              Kamu perlu akun untuk bergabung. Setelah daftar, kamu langsung
              kembali ke halaman ini.
            </p>
          </>
        )}
      </div>
    </main>
  )
}

const Fact = ({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) => (
  <div className="bg-background flex-1 rounded-2xl px-3.5 py-3">
    <p className="text-muted-foreground text-[10px] font-bold tracking-[0.05em] uppercase">
      {label}
    </p>
    <p className="tnum mt-1 text-[15px] font-extrabold tracking-[-0.02em]">
      {value}
    </p>
    {hint ? (
      <p className="text-muted-foreground mt-0.5 text-[10px]">{hint}</p>
    ) : null}
  </div>
)

const Problem = ({
  title,
  body,
  showHome,
  primaryHref,
  primaryLabel,
}: {
  title: string
  body: string
  showHome?: boolean
  primaryHref?: string
  primaryLabel?: string
}) => (
  <main className="flex min-h-dvh flex-1 flex-col justify-between px-6 pt-28 pb-10">
    <div className="flex flex-col items-center text-center">
      <div className="bg-warn-surface text-warn mb-5.5 grid size-16 place-items-center rounded-[22px]">
        <TriangleAlert className="size-7" />
      </div>
      <h1 className="text-xl font-extrabold tracking-[-0.03em]">{title}</h1>
      <p className="text-muted-foreground mt-2.5 max-w-[30ch] text-sm leading-relaxed">
        {body}
      </p>
    </div>

    {primaryHref ? (
      <Link
        href={primaryHref}
        className={cn(
          CTA,
          buttonVariants({ size: "lg" }),
          "ink-cta bg-ink hover:bg-ink/90 text-white",
        )}
      >
        {primaryLabel ?? "Lanjut"}
      </Link>
    ) : (
      <Link
        href={showHome ? "/" : "/login"}
        className={cn(
          CTA,
          buttonVariants({ size: "lg", variant: "outline" }),
          "bg-card",
        )}
      >
        {showHome ? "Ke tabungan saya" : "Masuk"}
      </Link>
    )}
  </main>
)

export default JoinPage
