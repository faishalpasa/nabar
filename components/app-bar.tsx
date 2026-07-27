import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Kalau diisi, tombol kembali ditampilkan dan menuju ke href ini. */
  backHref?: string;
  right?: React.ReactNode;
  className?: string;
};

export function AppBar({ title, backHref, right, className }: Props) {
  return (
    <header
      className={cn(
        "bg-card/90 sticky top-0 z-20 flex items-center gap-2 border-b px-4 py-3 backdrop-blur",
        className,
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Kembali"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-1.5 rounded-md p-1.5 focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="size-5" />
        </Link>
      ) : null}

      <h1 className="min-w-0 flex-1 truncate text-base font-bold">{title}</h1>

      {right}
    </header>
  );
}
