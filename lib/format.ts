/**
 * Nominal dari Postgres datang sebagai string (numeric), bukan number — supaya
 * presisi tidak hilang di JSON. Semua helper di sini menerima string | number.
 */

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatRupiah(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return rupiah.format(Number(value));
}

/** Nominal bertanda: withdrawal tampil dengan minus di depan. */
export function formatSigned(value: string | number) {
  const n = Number(value);
  return `${n < 0 ? "−" : ""}${rupiah.format(Math.abs(n))}`;
}

/** Untuk field input: "15.000.000" tanpa "Rp". */
export function formatPlain(value: string | number) {
  return plain.format(Number(value));
}

/** Membaca kembali angka dari input yang sudah diberi pemisah ribuan. */
export function parseAmount(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function formatPercent(progress: string | number | null) {
  if (progress === null) return null;
  return `${Math.round(Number(progress) * 100)}%`;
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | null) {
  if (!value) return null;
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string) {
  return dateTimeFmt.format(new Date(value));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
