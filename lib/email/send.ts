/**
 * Pengirim email lewat Resend REST API, tanpa SDK — satu endpoint saja, jadi
 * menambah dependency tidak sepadan.
 *
 * Catatan penting: SMTP bawaan Supabase TIDAK bisa dipakai di sini. Itu hanya
 * untuk email autentikasi (magic link, reset password) dengan template tetap,
 * dan pengirim bawaannya dibatasi beberapa email per jam.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails"

export type EmailPayload = {
  to: string
  subject: string
  html: string
  text: string
}

export type SendResult = { ok: true } | { ok: false; error: string }

/** null kalau email belum dikonfigurasi — aplikasi tetap harus jalan tanpanya. */
export const emailConfig = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null

  return {
    apiKey,
    // Alamat pengirim. Untuk uji coba, Resend menyediakan onboarding@resend.dev
    // tanpa perlu verifikasi domain — tapi hanya bisa mengirim ke email pemilik
    // akun Resend. Untuk mengirim ke member lain, domainmu harus diverifikasi.
    from: process.env.RESEND_FROM ?? "Nabar <onboarding@resend.dev>",
  }
}

export const sendEmail = async (payload: EmailPayload): Promise<SendResult> => {
  const config = emailConfig()
  if (!config) return { ok: false, error: "RESEND_API_KEY belum di-set" }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
      // Jangan sampai satu kejadian menahan antrean terlalu lama.
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const body = await response.text()
      return {
        ok: false,
        error: `Resend ${response.status}: ${body.slice(0, 200)}`,
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Gagal menghubungi Resend",
    }
  }
}
