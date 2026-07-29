import type { MetadataRoute } from "next"

const manifest = (): MetadataRoute.Manifest => ({
  name: "Nabar",
  short_name: "Nabar",
  description:
    "Catat tabungan dan kas bareng teman, lengkap dengan bukti transfer.",
  start_url: "/",
  display: "standalone",
  background_color: "#083A3D",
  theme_color: "#083A3D",
  icons: [
    {
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-512-maskable.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
})

export default manifest
