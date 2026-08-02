import "server-only"

import { emailConfig, sendEmail } from "@/lib/email/send"
import { renderGroupDeleted, renderNotification } from "@/lib/email/templates"
import { createAdminClient } from "@/lib/supabase/admin"
import type { NotificationTargetRow } from "@/lib/types"

/** Sekali kuras maksimal sebanyak ini, supaya tidak menahan response. */
const BATCH_SIZE = 20

/**
 * Mengirim email untuk kejadian di transaction_events yang belum terkirim.
 *
 * Kenapa berbentuk antrean, bukan "kirim email untuk aksi yang baru saja
 * terjadi": kalau Resend sedang gangguan, barisnya tetap bertanda belum
 * terkirim dan akan dicoba lagi saat ada aksi berikutnya — bukan hilang begitu
 * saja. Efek sampingnya juga idempoten, jadi dua request bersamaan tidak
 * mengirim email dobel karena penanda `notified_at` dipasang per baris.
 *
 * Dipanggil dari `after()` di Server Action, jadi user tidak menunggu email
 * terkirim dan uploadnya tidak ikut gagal kalau Resend lambat.
 *
 * Catatan kenapa tidak pakai Vercel Cron: paket Hobby membatasi cron ke sekali
 * sehari, dan permintaan persetujuan tidak berguna kalau baru dikabari besok.
 */
export const flushNotifications = async (baseUrl: string) => {
  if (!emailConfig()) return

  const admin = createAdminClient()
  if (!admin) return

  const { data: events } = await admin
    .from("transaction_events")
    .select("id")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)

  if (!events || events.length === 0) return

  for (const event of events) {
    const { data: targets } = await admin.rpc("notification_targets", {
      p_event_id: event.id,
    })

    const rows = (targets ?? []) as NotificationTargetRow[]

    // Kejadian yang memang tidak perlu dikabari (edit nominal, setoran owner
    // yang auto-verified) mengembalikan nol penerima. Tandai selesai supaya
    // tidak dipindai terus-menerus.
    const results = await Promise.all(
      rows.map(async (target) => {
        const groupUrl = `${baseUrl}/g/${target.group_id}`
        const mail = renderNotification(target, groupUrl)

        const result = await sendEmail({
          to: target.recipient_email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        })

        if (!result.ok) {
          // eslint-disable-next-line no-console -- pengiriman latar belakang: tanpa log, kegagalan tidak terlihat sama sekali
          console.error(
            `[notifikasi] gagal kirim ke ${target.recipient_email}: ${result.error}`,
          )
        }

        return result.ok
      }),
    )

    // Kalau ada satu saja yang gagal, biarkan barisnya belum tertandai supaya
    // dicoba ulang nanti. Konsekuensinya penerima yang sudah berhasil bisa dapat
    // email dobel — itu jauh lebih baik daripada ada yang tidak dapat sama sekali.
    if (results.every(Boolean)) {
      await admin
        .from("transaction_events")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", event.id)
    }
  }
}

/**
 * Kabari member lain (bukan owner yang menghapus) kalau tabungannya sudah
 * dihapus. Tidak lewat antrean transaction_events seperti flushNotifications
 * — ini kejadian sekali jalan, dipicu langsung dari deleteGroup lewat
 * `after()`, sama seperti notifyAfterResponse di app/actions/transactions.ts.
 */
export const notifyGroupDeleted = async (
  groupId: string,
  groupName: string,
  actorId: string,
  homeUrl: string,
) => {
  if (!emailConfig()) return

  const admin = createAdminClient()
  if (!admin) return

  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("status", "active")
    .neq("user_id", actorId)

  const memberIds = (memberships ?? []).map((m) => m.user_id)
  if (memberIds.length === 0) return

  const { data: profiles } = await admin
    .from("profiles")
    .select("email")
    .in("id", memberIds)

  const emails = (profiles ?? [])
    .map((p) => p.email)
    .filter((email): email is string => Boolean(email))

  const mail = renderGroupDeleted(groupName, homeUrl)

  await Promise.all(
    emails.map(async (email) => {
      const result = await sendEmail({
        to: email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      })

      if (!result.ok) {
        // eslint-disable-next-line no-console -- pengiriman latar belakang: tanpa log, kegagalan tidak terlihat sama sekali
        console.error(`[notifikasi] gagal kirim ke ${email}: ${result.error}`)
      }
    }),
  )
}
