import { BrandMark } from "@/components/brand"
import { GoogleSignInButton } from "@/components/google-sign-in-button"

export const metadata = { title: "Masuk · Nabar" }

const USES = ["Kas RT", "Patungan liburan", "Kado"]

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) => {
  const { next, error } = await searchParams

  return (
    <main className="bg-ink text-ink-foreground flex min-h-dvh flex-1 flex-col justify-between px-6 pt-24 pb-10">
      <div className="flex flex-col items-center text-center">
        <div className="text-ink-accent mb-7 grid size-20 place-items-center rounded-[28px] bg-white/12">
          <BrandMark className="size-11" />
        </div>

        <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.04em]">
          Nabar
        </h1>
        <p className="text-ink-muted mt-3 max-w-[26ch] text-[15px] leading-relaxed">
          Catat tabungan dan kas bareng teman, lengkap dengan bukti transfernya.
        </p>

        <ul className="mt-7 flex flex-wrap justify-center gap-2">
          {USES.map((use) => (
            <li
              key={use}
              className="rounded-full bg-white/10 px-3.5 py-[7px] text-xs font-semibold"
            >
              {use}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        {error ? (
          <p
            role="alert"
            className="rounded-2xl bg-white/12 px-4 py-3 text-[13px] leading-relaxed"
          >
            {error}
          </p>
        ) : null}

        <GoogleSignInButton next={next} />

        <p className="text-ink-muted text-center text-xs leading-relaxed">
          Transfer tetap kamu lakukan manual. Aplikasi ini yang mencatat dan
          menyimpan buktinya.
        </p>
      </div>
    </main>
  )
}

export default LoginPage
