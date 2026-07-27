"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { GroupType } from "@/lib/types";

export type ActionResult = { error: string } | undefined;

export async function createGroup(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as GroupType;
  const goalRaw = String(formData.get("goal_amount") ?? "").replace(/\D/g, "");
  const deadlineRaw = String(formData.get("goal_deadline") ?? "").trim();

  if (!name) return { error: "Nama tabungan belum diisi." };
  if (name.length > 80) return { error: "Nama tabungan maksimal 80 karakter." };
  if (type !== "one_time" && type !== "ongoing") {
    return { error: "Jenis tabungan belum dipilih." };
  }

  // Kas berkelanjutan tidak punya target — database juga menolaknya lewat
  // constraint groups_ongoing_has_no_goal, ini hanya supaya pesannya ramah.
  const isOneTime = type === "one_time";
  const goal_amount = isOneTime && goalRaw ? Number(goalRaw) : null;
  const goal_deadline = isOneTime && deadlineRaw ? deadlineRaw : null;

  if (goal_amount !== null && goal_amount <= 0) {
    return { error: "Target nominal harus lebih dari nol." };
  }

  const supabase = await createClient();

  // owner_id sengaja tidak dikirim: trigger groups_set_owner mengisinya dari
  // auth.uid(), jadi tidak bisa dipalsukan lewat payload.
  const { data, error } = await supabase
    .from("groups")
    .insert({ name, type, goal_amount, goal_deadline })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/");
  redirect(`/g/${data.id}`);
}
