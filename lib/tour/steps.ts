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
]
