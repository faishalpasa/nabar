import { formatRupiah } from "@/lib/format"
import type { NotificationTargetRow } from "@/lib/types"

export type NotificationTarget = NotificationTargetRow

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/**
 * Kerangka email. Ditulis inline dan seminimal mungkin: klien email mengabaikan
 * <style> eksternal, dan Gmail memotong pesan di atas 102 KB.
 */
const layout = (
  heading: string,
  body: string,
  ctaUrl: string,
  ctaLabel: string,
) => `
<div style="margin:0;padding:24px 12px;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px 24px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0f8f88;">Nabung Bareng</p>
    <h1 style="margin:0 0 16px;font-size:19px;line-height:1.35;color:#1f2933;">${heading}</h1>
    ${body}
    <a href="${ctaUrl}" style="display:inline-block;margin-top:22px;padding:12px 20px;background:#0f8f88;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">${ctaLabel}</a>
    <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#8a94a0;">
      Kamu menerima email ini karena tergabung di tabungan tersebut.
    </p>
  </div>
</div>`

const row = (label: string, value: string) => `
  <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#3e4c59;">
    <span style="color:#8a94a0;">${label}</span> ${value}
  </p>`

export const renderNotification = (
  target: NotificationTarget,
  groupUrl: string,
): { subject: string; html: string; text: string } => {
  const group = escape(target.group_name)
  const actor = escape(target.actor_name)
  const amount = formatRupiah(target.amount)
  const note = target.note ? escape(target.note) : null
  const reason = target.reason ? escape(target.reason) : null

  switch (target.kind) {
    case "needs_approval":
      return {
        subject: `${target.actor_name} setor ${amount} di ${target.group_name}`,
        html: layout(
          `${actor} menyetor ${amount} dan menunggu persetujuanmu`,
          row("Tabungan", `<strong>${group}</strong>`) +
            row("Nominal", `<strong>${amount}</strong>`) +
            (note ? row("Catatan", note) : "") +
            `<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#3e4c59;">Cek bukti transfernya, lalu setujui atau tolak. Kalau ditolak, ${actor} bisa mengunggah ulang.</p>`,
          groupUrl,
          "Cek setoran",
        ),
        text: `${target.actor_name} menyetor ${amount} di ${target.group_name} dan menunggu persetujuanmu.${target.note ? ` Catatan: ${target.note}.` : ""}\n\nBuka: ${groupUrl}`,
      }

    case "approved":
      return {
        subject: `Setoranmu ${amount} disetujui`,
        html: layout(
          `Setoranmu sudah disetujui`,
          row("Tabungan", `<strong>${group}</strong>`) +
            row("Nominal", `<strong>${amount}</strong>`) +
            `<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#3e4c59;">Nominal ini sudah masuk ke saldo dan tercatat sebagai kontribusimu.</p>`,
          groupUrl,
          "Lihat tabungan",
        ),
        text: `Setoranmu ${amount} di ${target.group_name} sudah disetujui.\n\nBuka: ${groupUrl}`,
      }

    case "rejected":
      return {
        subject: `Setoranmu ${amount} ditolak`,
        html: layout(
          `Setoranmu ditolak`,
          row("Tabungan", `<strong>${group}</strong>`) +
            row("Nominal", `<strong>${amount}</strong>`) +
            (reason ? row("Alasan", `<strong>${reason}</strong>`) : "") +
            `<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#3e4c59;">Perbaiki sesuai alasan di atas, lalu unggah lagi sebagai setoran baru.</p>`,
          groupUrl,
          "Unggah ulang",
        ),
        text: `Setoranmu ${amount} di ${target.group_name} ditolak.${target.reason ? ` Alasan: ${target.reason}.` : ""}\n\nBuka: ${groupUrl}`,
      }

    case "withdrawal":
      return {
        subject: `${amount} ditarik dari ${target.group_name}`,
        html: layout(
          `${actor} menarik ${amount} dari kas`,
          row("Tabungan", `<strong>${group}</strong>`) +
            row("Nominal ditarik", `<strong>${amount}</strong>`) +
            (note ? row("Keterangan", `<strong>${note}</strong>`) : "") +
            `<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#3e4c59;">Bukti pengeluarannya bisa kamu lihat di riwayat. Kontribusimu tidak berubah karena penarikan ini.</p>`,
          groupUrl,
          "Lihat riwayat",
        ),
        text: `${target.actor_name} menarik ${amount} dari ${target.group_name}.${target.note ? ` Keterangan: ${target.note}.` : ""}\n\nBuka: ${groupUrl}`,
      }
  }
}
