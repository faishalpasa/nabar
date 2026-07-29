import { cn } from "@/lib/utils"

/**
 * Monogram N final (rebrand "Nabar") — tiga stroke pada currentColor supaya
 * jalan di atas panel gelap (Mint) maupun kertas putih (Deep Teal), plus koin
 * yang fill-nya selalu Coral, bukan currentColor: koin adalah satu-satunya
 * aksen tetap sama di kedua konteks. Lihat
 * design_handoff_ink/README.md § Assets (section 6a).
 */
export const BrandMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    role="img"
    aria-label="Nabar"
    className={cn("size-12", className)}
  >
    <path
      d="M11 31V12"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="m11 12 16 17"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M27 29v-9"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <circle cx="27" cy="11" r="4.4" fill="var(--nb-coral)" />
  </svg>
)

export const GoogleGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 18 18"
    aria-hidden="true"
    className={cn("size-[18px]", className)}
  >
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A8.997 8.997 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.96H.96a9 9 0 0 0 0 8.1l3.01-2.34Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A8.997 8.997 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58Z"
    />
  </svg>
)
