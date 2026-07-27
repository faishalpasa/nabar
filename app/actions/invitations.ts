"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { InvitationPreview } from "@/lib/types";

/**
 * Membuat link undangan baru.
 *
 * Token bersifat SEKALI PAKAI (lihat catatan di supabase/README.md), jadi owner
 * perlu membuat link terpisah untuk setiap orang yang diundang.
 */
export async function createInvite(
  groupId: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invitations")
    .insert({ group_id: groupId })
    .select("token")
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Hanya owner yang bisa mengundang member." };

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  revalidatePath(`/g/${groupId}`);
  return { url: `${base}/join/${data.token}` };
}

export async function getInvitationPreview(
  token: string,
): Promise<{ preview: InvitationPreview } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_invitation_preview", {
    p_token: token,
  });

  if (error) return { error: error.message };
  return { preview: data as InvitationPreview };
}

export async function acceptInvite(
  token: string,
): Promise<{ groupId: string } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { groupId: data as string };
}
