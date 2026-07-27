import { CalendarRange, Target, TriangleAlert } from "lucide-react"
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

export const metadata = { title: "Undangan · Nabung Bareng" }

const CTA = "h-12 w-full rounded-xl text-[15px] font-bold"

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

  // Kartu undangan dipakai di dua jalur: user yang sudah login melihatnya
  // bersama tombol Gabung/Tolak; user baru melihatnya di atas tombol daftar.
  const card = (
    <div className="bg-card w-full rounded-2xl border p-5 text-center">
      <p className="text-muted-foreground text-[13px]">
        <span className="text-foreground font-semibold">
          {preview.invited_by_name ?? "Seseorang"}
        </span>{" "}
        mengundang kamu ke
      </p>
      <h1 className="mt-1.5 text-xl leading-snug font-extrabold tracking-tight">
        {preview.group_name}
      </h1>

      <div className="text-muted-foreground mt-4 flex flex-col gap-1.5 text-xs">
        {goal ? (
          <p className="flex items-center justify-center gap-1.5">
            <Target className="size-3.5" />
            <span className="tnum">Target {goal}</span>
          </p>
        ) : (
          <p className="flex items-center justify-center gap-1.5">
            <Target className="size-3.5" />
            Kas berkelanjutan, tanpa target
          </p>
        )}
        {deadline ? (
          <p className="flex items-center justify-center gap-1.5">
            <CalendarRange className="size-3.5" />
            Sampai {deadline}
          </p>
        ) : null}
      </div>
    </div>
  )

  return (
    <main className="flex flex-1 flex-col justify-between px-6 pt-16 pb-10">
      <div className="flex flex-col items-center gap-6">
        <div className="bg-accent text-primary grid size-16 place-items-center rounded-3xl">
          <BrandMark className="size-9" />
        </div>
        {card}
      </div>

      {user ? (
        <JoinConfirm token={token} groupName={preview.group_name ?? ""} />
      ) : (
        <div className="flex flex-col gap-4">
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
        </div>
      )}
    </main>
  )
}

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
  <main className="flex flex-1 flex-col justify-between px-6 pt-20 pb-10">
    <div className="flex flex-col items-center text-center">
      <div className="bg-warn-surface text-warn mb-5 grid size-14 place-items-center rounded-2xl">
        <TriangleAlert className="size-6" />
      </div>
      <h1 className="text-lg font-extrabold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 max-w-[30ch] text-sm leading-relaxed">
        {body}
      </p>
    </div>

    {primaryHref ? (
      <Link
        href={primaryHref}
        className={cn(CTA, buttonVariants({ size: "lg" }))}
      >
        {primaryLabel ?? "Lanjut"}
      </Link>
    ) : showHome ? (
      <Link
        href="/"
        className={cn(CTA, buttonVariants({ size: "lg", variant: "outline" }))}
      >
        Ke tabungan saya
      </Link>
    ) : (
      <Link
        href="/login"
        className={cn(CTA, buttonVariants({ size: "lg", variant: "outline" }))}
      >
        Masuk
      </Link>
    )}
  </main>
)

export default JoinPage
