import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

/**
 * App icon dirender dari monogram N final (README § Assets, section 6b) —
 * tidak ada rasterizer sistem di environment ini, jadi dipakai ImageResponse
 * (satori + resvg, sudah dibundel dengan next) alih-alih PNG statis.
 */
const Icon = () =>
  new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#083A3D",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
        <path
          d="M11 31V12"
          stroke="#E4F5ED"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="m11 12 16 17"
          stroke="#E4F5ED"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M27 29v-9"
          stroke="#E4F5ED"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="27" cy="11" r="4.4" fill="#E77560" />
      </svg>
    </div>,
    { ...size },
  )

export default Icon
