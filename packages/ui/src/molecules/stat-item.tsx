import type * as React from "react"

import type { AnimationDelay, AnimationDuration, Stat } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"
import { CountUp } from "@platform/animation"

import { Text } from "../atoms/text"
import { cn } from "../lib/utils"

export interface StatItemProps extends React.ComponentProps<"div"> {
  /** The stat content item (value, label, description). */
  item: Stat
  /** Text alignment inside the cell. */
  align?: "start" | "center"
  /** Count the value up from zero when it scrolls into view (the Stats block's `countUp` field). */
  countUp?: { duration: AnimationDuration; delay: AnimationDelay } | null
}

/** A headline number with its label, used by the Stats block. */
function StatItem({ item, align = "center", countUp, className, ...props }: StatItemProps) {
  return (
    <div
      data-slot="stat-item"
      className={cn("flex flex-col gap-1", align === "center" && "items-center text-center", className)}
      {...editAttrs(item)}
      {...props}
    >
      <p className="font-heading text-4xl heading-style section-sm:text-5xl" {...fieldAttrs(item, "value")}>
        {countUp ? <CountUp value={item.value} duration={countUp.duration} delay={countUp.delay} /> : item.value}
      </p>
      <Text size="sm" weight="medium" {...fieldAttrs(item, "label")}>
        {item.label}
      </Text>
      {item.description ? (
        <Text size="sm" tone="muted" {...fieldAttrs(item, "description")}>
          {item.description}
        </Text>
      ) : null}
    </div>
  )
}

export { StatItem }
