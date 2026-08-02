export type TourStep = {
  id: string
  pathMatch: (pathname: string) => boolean
  title: string
  description: string
}

// Urutan array ini yang menentukan urutan tur — bukan urutan halaman,
// supaya TourSpotlight bisa memajukan step lewat pencarian linear sederhana.
export const TOUR_STEPS: TourStep[] = [
  {
    id: "home-cta",
    pathMatch: (p) => p === "/",
    title: "Mulai dari sini",
    description:
      "Yuk buat tabungan baru — bisa nabung sendiri atau bareng teman.",
  },
  {
    id: "new-name",
    pathMatch: (p) => p === "/new",
    title: "Kasih nama tabungannya",
    description:
      'Nama ini yang muncul di daftar tabungan kamu, misalnya "Liburan ke Bali" atau "Kas kosan".',
  },
  {
    id: "new-type",
    pathMatch: (p) => p === "/new",
    title: "Pilih jenisnya",
    description:
      '"Sekali jalan" kalau ada target nominal & tanggal. "Berkelanjutan" kalau kasnya jalan terus tanpa target, misalnya kas RT.',
  },
  {
    id: "new-target",
    pathMatch: (p) => p === "/new",
    title: "Atur target (opsional)",
    description:
      "Isi kalau mau ada target nominal dan tanggalnya — boleh salah satu aja, atau dikosongin dulu.",
  },
  {
    id: "new-submit",
    pathMatch: (p) => p === "/new",
    title: "Tinggal buat!",
    description: "Ketuk tombol ini untuk membuat tabungannya.",
  },
  {
    id: "detail-saldo",
    pathMatch: (p) => p.startsWith("/g/"),
    title: "Ini saldo tabungan kamu",
    description:
      "Total yang sudah terkumpul dari semua setoran, lengkap dengan progress ke target kalau ada.",
  },
  {
    id: "detail-stats",
    pathMatch: (p) => p.startsWith("/g/"),
    title: "Ringkasan aktivitas",
    description:
      "Total setoran, total yang sudah ditarik, dan berapa member yang ikut di tabungan ini.",
  },
  {
    id: "detail-tabs",
    pathMatch: (p) => p.startsWith("/g/"),
    title: "Riwayat & Member",
    description:
      "Riwayat menampilkan semua transaksi. Member menampilkan siapa saja yang gabung di tabungan ini.",
  },
  {
    id: "detail-actions",
    pathMatch: (p) => p.startsWith("/g/"),
    title: "Setor atau tarik dana",
    description:
      'Ketuk "Setor" untuk catat setoran baru, atau "Tarik" untuk catat penarikan kalau kamu ownernya.',
  },
  {
    id: "home-total",
    pathMatch: (p) => p === "/",
    title: "Total tabungan kamu",
    description:
      "Jumlah semua kontribusi kamu di semua tabungan yang kamu ikuti.",
  },
  {
    id: "home-card",
    pathMatch: (p) => p === "/",
    title: "Kartu tabungan",
    description:
      "Ketuk kartu ini kapan saja untuk lihat detail, saldo, dan riwayatnya.",
  },
]
