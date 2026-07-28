import { CreateGroupForm } from "@/components/create-group-form"
import { InkHeader } from "@/components/ink-header"

export const metadata = { title: "Buat tabungan · Nabung Bareng" }

const NewGroupPage = () => (
  <main className="flex flex-1 flex-col">
    <InkHeader
      title="Buat tabungan baru"
      backHref="/"
      lede="Kamu jadi owner-nya: kamu yang menyetujui setoran dan mencatat penarikan."
    />
    <CreateGroupForm />
  </main>
)

export default NewGroupPage
