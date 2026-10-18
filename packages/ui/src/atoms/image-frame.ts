import { cva } from "class-variance-authority"

/**
 * The frame around an image: aspect ratio and rounding. A plain module (no
 * "use client") so server components such as the hero and media blocks can
 * compute the classes for a `ScrollEffect` wrapper.
 */
export const imageFrameVariants = cva("relative overflow-hidden bg-muted", {
  variants: {
    ratio: {
      auto: "",
      square: "aspect-square",
      video: "aspect-video",
      "4/3": "aspect-4/3",
      "3/2": "aspect-3/2",
      portrait: "aspect-3/4",
      wide: "aspect-21/9",
    },
    radius: { none: "rounded-none", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", full: "rounded-full" },
  },
  defaultVariants: { ratio: "auto", radius: "lg" },
})
