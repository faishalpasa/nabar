import Link from "next/link"

export const AccountMenu = ({ children }: { children: React.ReactNode }) => (
  <Link
    href="/profile"
    aria-label="Profil saya"
    data-test-id="home_link_profile"
    className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
  >
    {children}
  </Link>
)
