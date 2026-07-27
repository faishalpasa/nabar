import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRupiah, initials } from "@/lib/format";
import type { MemberContribution } from "@/lib/types";

export function MemberList({
  members,
  currentUserId,
}: {
  members: MemberContribution[];
  currentUserId: string;
}) {
  return (
    <>
      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 py-3.5">
            <Avatar className="size-10 shrink-0">
              {m.avatar_url ? <AvatarImage src={m.avatar_url} alt="" /> : null}
              <AvatarFallback className="text-xs font-semibold">
                {initials(m.display_name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {m.display_name}
                {m.user_id === currentUserId ? (
                  <span className="text-muted-foreground font-medium"> · Kamu</span>
                ) : null}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {m.role === "owner" ? "Owner" : "Member"}
                {m.pending_count > 0 ? ` · ${m.pending_count} menunggu` : ""}
              </p>
            </div>

            <span className="tnum shrink-0 text-sm font-bold">
              {formatRupiah(m.total_contributed)}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-3 mb-1 text-xs leading-relaxed">
        Angka di atas adalah total setoran yang sudah terverifikasi. Nilainya
        tidak berkurang walau ada penarikan dana dari kas.
      </p>
    </>
  );
}
