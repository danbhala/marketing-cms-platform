import type * as React from "react"

import type { Action } from "@platform/content-model"
import { editAttrs } from "@platform/cms-core/edit"

import { Button, type ButtonSize } from "../atoms/button"
import { Icon } from "../atoms/icon"
import { cn } from "../lib/utils"

export interface ActionGroupProps extends React.ComponentProps<"div"> {
  /** CMS actions in order. Renders nothing when empty. */
  actions?: Action[] | null
  /** Button size for every action. */
  size?: ButtonSize
  /** Horizontal alignment of the row. */
  align?: "start" | "center" | "end"
  /** Stack full-width on small screens (hero CTAs). */
  stackOnMobile?: boolean
}

/** A row of CMS-authored CTAs. The first action is the primary one by convention. */
function ActionGroup({ actions, size = "lg", align = "start", stackOnMobile, className, ...props }: ActionGroupProps) {
  if (!actions?.length) return null
  return (
    <div
      data-slot="action-group"
      className={cn(
        "flex flex-wrap gap-3",
        align === "center" && "justify-center",
        align === "end" && "justify-end",
        stackOnMobile && "section-max-sm:flex-col section-max-sm:*:w-full",
        className
      )}
      {...props}
    >
      {actions.map((action, index) => (
        <Button
          key={action.id}
          href={action.href}
          size={size}
          variant={action.variant ?? (index === 0 ? "default" : "outline")}
          {...editAttrs(action)}
        >
          {action.icon ? <Icon name={action.icon} data-icon="inline-start" /> : null}
          {action.label}
        </Button>
      ))}
    </div>
  )
}

export { ActionGroup }
