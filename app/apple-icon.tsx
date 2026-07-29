import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/**
 * Apple touch icon — art penuh bidang, tanpa alpha (iOS mem-rounded-corner
 * sendiri). Sama seperti app/icon.tsx, dirender lewat ImageResponse karena
 * tidak ada rasterizer sistem di environment ini.
 */
const AppleIcon = () =>
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
      <svg width="101" height="101" viewBox="0 0 40 40" fill="none">
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

export default AppleIcon
