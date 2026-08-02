import { notFound } from "next/navigation"

import { ProfileMenu } from "@/app/profile/_components/profile-menu"
import { InkHeader } from "@/components/ink-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { getUser } from "@/lib/supabase/server"

export const metadata = { title: "Profil · Nabar" }

const ProfilePage = async () => {
  const user = await getUser()

  if (!user) notFound()

  return (
    <main className="flex flex-1 flex-col">
      <InkHeader title="Profil" backHref="/" />

      <div className="flex-1 px-4 pt-5 pb-10">
        <div className="ink-card flex items-center gap-3.5 rounded-[22px] p-4">
          <Avatar className="size-16">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-base font-bold">
              {initials(user.displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{user.displayName}</p>
            {user.email ? (
              <p className="text-muted-foreground truncate text-sm">
                {user.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <ProfileMenu />
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
