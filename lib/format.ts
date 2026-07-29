/**
 * Nominal dari Postgres datang sebagai string (numeric), bukan number — supaya
 * presisi tidak hilang di JSON. Semua helper di sini menerima string | number.
 */

/** Batas atas nominal (setoran, tarikan, target) di seluruh aplikasi. */
export const MAX_AMOUNT = 99_000_000_000

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

const plain = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

export function formatRupiah(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return rupiah.format(Number(value))
}

/** Nominal bertanda: withdrawal tampil dengan minus di depan. */
export function formatSigned(value: string | number) {
  const n = Number(value)
  return `${n < 0 ? "−" : ""}${rupiah.format(Math.abs(n))}`
}

/** Untuk field input: "15.000.000" tanpa "Rp". */
export function formatPlain(value: string | number) {
  return plain.format(Number(value))
}

/** Membaca kembali angka dari input yang sudah diberi pemisah ribuan. */
export function parseAmount(input: string) {
  const digits = input.replace(/\D/g, "")
  return digits ? Number(digits) : 0
}

export function formatPercent(progress: string | number | null) {
  if (progress === null) return null
  return `${Math.round(Number(progress) * 100)}%`
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

export function formatDate(value: string | null) {
  if (!value) return null
  return dateFmt.format(new Date(value))
}

export function formatDateTime(value: string) {
  return dateTimeFmt.format(new Date(value))
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * Sisa waktu menuju tanggal target, dalam bahasa yang dipakai orang: "sisa 4
 * bln", "sisa 12 hari", "lewat target". null kalau tanggalnya tidak diisi.
 */
export function timeLeft(deadline: string | null, now = new Date()) {
  if (!deadline) return null

  const target = new Date(`${deadline}T00:00:00`)
  const days = Math.ceil((target.getTime() - now.getTime()) / 86_400_000)

  if (days < 0) return "lewat target"
  if (days === 0) return "hari ini"
  if (days < 31) return `sisa ${days} hari`

  return `sisa ${Math.round(days / 30)} bln`
}

/** "Rp15jt" / "Rp300rb" — dipakai di teks pendukung yang sempit. */
export function formatShort(value: string | number) {
  const n = Number(value)
  if (n >= 1_000_000_000) return `Rp${+(n / 1_000_000_000).toFixed(1)}m`
  if (n >= 1_000_000)
    return `Rp${+(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}jt`
  if (n >= 1_000) return `Rp${Math.round(n / 1_000)}rb`
  return formatRupiah(n)
}

/** Kunci bulan untuk mengelompokkan riwayat, mis. "Juli 2026". */
const monthFmt = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
})

export function monthLabel(value: string) {
  return monthFmt.format(new Date(value))
}
