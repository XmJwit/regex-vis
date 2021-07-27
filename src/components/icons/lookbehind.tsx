import React from "react"
import { useTheme } from "@geist-ui/react"

const Lookbehind = () => {
  const { palette } = useTheme()
  return (
    <>
      <svg
        width="51"
        height="20"
        viewBox="0 0 51 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="38" cy="10" r="4" />
        <circle
          cx="18"
          cy="10"
          r="4"
          fill={palette.success}
          fill-opacity="0.6"
        />
        <line x1="42" y1="10" x2="51" y2="10" stroke-width="2" />
        <line y1="10" x2="14" y2="10" stroke-width="2" />
        <line x1="22" y1="10" x2="34" y2="10" stroke-width="2" />
        <rect x="9" y="1" width="18" height="18" rx="5" stroke-width="2" />
      </svg>

      <style jsx>{`
        circle,
        line,
        rect {
          stroke: ${palette.accents_4};
        }
      `}</style>
    </>
  )
}

export default Lookbehind