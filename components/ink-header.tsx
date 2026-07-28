import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

type Props = {
  title: string
  /** Kalau diisi, tombol kembali ditampilkan dan menuju ke href ini. */
  backHref?: string
  /** Aksi di kanan judul, mis. avatar atau tombol undang. */
  action?: React.ReactNode
  /** Kalimat pengantar di bawah judul. */
  lede?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

/**
 * Panel teal gelap yang jadi kepala setiap layar di arah "Ink".
 *
 * Sudut bawahnya membulat besar dan konten di bawahnya berlatar terang, jadi
 * panel ini yang memberi bentuk pada layar — bukan app bar tipis seperti versi
 * sebelumnya.
 */
export const InkHeader = ({
  title,
  backHref,
  action,
  lede,
  children,
  className,
}: Props) => (
  <header className={cn("ink-panel px-4 pt-4 pb-6", className)}>
    <div className="flex items-center gap-2.5">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Kembali"
          className="text-ink-soft focus-visible:ring-ink-accent -ml-1.5 rounded-lg p-1.5 focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="size-5" strokeWidth={2.2} />
        </Link>
      ) : null}

      <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
        {title}
      </h1>

      {action}
    </div>

    {lede ? (
      <p className="text-ink-muted mt-3.5 text-[13px] leading-relaxed">
        {lede}
      </p>
    ) : null}

    {children}
  </header>
)

/** Label kecil bercetak kapital di atas panel ink. */
export const InkLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-ink-accent text-[11px] font-bold tracking-[0.1em] uppercase">
    {children}
  </p>
)

/** Angka besar — saldo atau total. */
export const InkAmount = ({
  children,
  muted,
}: {
  children: React.ReactNode
  muted?: boolean
}) => (
  <p
    className={cn(
      "tnum mt-1.5 text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em]",
      muted && "text-ink-foreground/45",
    )}
  >
    {children}
  </p>
)
