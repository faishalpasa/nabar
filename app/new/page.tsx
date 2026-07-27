import { AppBar } from "@/components/app-bar";
import { CreateGroupForm } from "@/components/create-group-form";

export const metadata = { title: "Buat tabungan · Nabung Bareng" };

export default function NewGroupPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppBar title="Buat tabungan baru" backHref="/" />
      <CreateGroupForm />
    </main>
  );
}
