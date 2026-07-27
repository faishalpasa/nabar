"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { SITE_URL } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import type { InvitationPreview } from "@/lib/types"

/**
 * Domain untuk link undangan: pakai NEXT_PUBLIC_SITE_URL kalau di-set, kalau
 * tidak turunkan dari header request. Di belakang proxy Vercel, host aslinya ada
 * di x-forwarded-host — `host` saja bisa berisi host internal.
 */
const baseUrl = async () => {
  if (SITE_URL) return SITE_URL.replace(/\/$/, "")

  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https")

  return `${proto}://${host}`
}

/**
 * Membuat link undangan baru.
 *
 * Token bersifat SEKALI PAKAI (lihat catatan di supabase/README.md), jadi owner
 * perlu membuat link terpisah untuk setiap orang yang diundang.
 */
export async function createInvite(
  groupId: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("invitations")
    .insert({ group_id: groupId })
    .select("token")
    .single()

  if (error) return { error: error.message }
  if (!data) return { error: "Hanya owner yang bisa mengundang member." }

  revalidatePath(`/g/${groupId}`)
  return { url: `${await baseUrl()}/join/${data.token}` }
}

export async function getInvitationPreview(
  token: string,
): Promise<{ preview: InvitationPreview } | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_invitation_preview", {
    p_token: token,
  })

  if (error) return { error: error.message }
  return { preview: data as InvitationPreview }
}

export async function acceptInvite(
  token: string,
): Promise<{ groupId: string } | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  })

  if (error) return { error: error.message }

  revalidatePath("/")
  return { groupId: data as string }
}
