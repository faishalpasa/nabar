import { BrandMark } from "@/components/brand";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export const metadata = { title: "Masuk · Nabung Bareng" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col justify-between px-6 pt-20 pb-10">
      <div className="flex flex-col items-center text-center">
        <div className="bg-accent text-primary mb-6 grid size-20 place-items-center rounded-3xl">
          <BrandMark className="size-11" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight">Nabung Bareng</h1>
        <p className="text-muted-foreground mt-2 max-w-[24ch] text-[15px] leading-relaxed">
          Catat tabungan dan kas bareng teman, lengkap dengan bukti transfer.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {error ? (
          <p
            role="alert"
            className="bg-bad-surface text-bad rounded-xl px-4 py-3 text-[13px] leading-relaxed"
          >
            {error}
          </p>
        ) : null}

        <GoogleSignInButton next={next} />

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          Transfer tetap kamu lakukan manual. Aplikasi ini mencatat dan menyimpan
          buktinya.
        </p>
      </div>
    </main>
  );
}
