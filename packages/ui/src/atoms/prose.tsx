import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/**
 * Styles arbitrary nested HTML (what the RichText renderer produces) using
 * the same tokens as the atoms. No @tailwindcss/typography: the rules below
 * are the whole contract, so they are easy to theme and audit.
 */
const proseVariants = cva(
  [
    "max-w-(--container-prose) text-pretty",
    "[&_p]:my-4 [&_p]:leading-7",
    "[&_h2]:font-heading [&_h2]:heading-style [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-3xl",
    "[&_h3]:font-heading [&_h3]:heading-style [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-2xl",
    "[&_h4]:font-heading [&_h4]:heading-style [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-xl",
    "[&_h5]:mt-6 [&_h5]:mb-2 [&_h5]:text-lg [&_h5]:font-semibold",
    "[&_h6]:mt-6 [&_h6]:mb-2 [&_h6]:text-base [&_h6]:font-semibold",
    "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary/80",
    "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5",
    "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
    "[&_hr]:my-8 [&_hr]:border-border",
    "[&_img]:my-6 [&_img]:rounded-lg",
    "[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
    "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
    "[&_strong]:font-semibold",
    "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
  ],
  {
    variants: {
      size: {
        sm: "text-sm [&_p]:leading-6",
        base: "text-base",
        lg: "text-lg [&_p]:leading-8",
      },
      width: {
        prose: "",
        full: "max-w-none",
      },
    },
    defaultVariants: { size: "base", width: "prose" },
  },
)

export interface ProseProps extends React.ComponentProps<"div">, VariantProps<typeof proseVariants> {
  /** Body text size; line height scales with it. */
  size?: VariantProps<typeof proseVariants>["size"]
  /** `prose` caps the measure at `--container-prose`; `full` lets it fill the parent. */
  width?: VariantProps<typeof proseVariants>["width"]
}

/** Typographic wrapper for rendered rich text. See `proseVariants` for the rules. */
function Prose({ size, width, className, ...props }: ProseProps) {
  return <div data-slot="prose" className={cn(proseVariants({ size, width }), className)} {...props} />
}

export { Prose, proseVariants }
