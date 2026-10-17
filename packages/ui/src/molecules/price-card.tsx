import type * as React from "react"
import { CheckIcon } from "lucide-react"

import type { PricingPlan } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Heading } from "../atoms/heading"
import { Text } from "../atoms/text"
import { ActionGroup } from "./action-group"
import { Badge } from "../primitives/badge"
import { cn } from "../lib/utils"

export interface PriceCardProps extends React.ComponentProps<"div"> {
  plan: PricingPlan
}

/** One pricing plan. `highlighted` gives it the primary border and a badge. */
function PriceCard({ plan, className, ...props }: PriceCardProps) {
  return (
    <div
      data-slot="price-card"
      data-highlighted={plan.highlighted ? "" : undefined}
      className={cn(
        "relative flex h-full flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground",
        plan.highlighted && "border-primary shadow-lg ring-1 ring-primary",
        className,
      )}
      {...editAttrs(plan)}
      {...props}
    >
      {plan.badge ? (
        <Badge className="absolute -top-3 left-6" {...fieldAttrs(plan, "badge")}>
          {plan.badge}
        </Badge>
      ) : null}
      <div className="flex flex-col gap-2">
        <Heading as="h3" size="h5" {...fieldAttrs(plan, "name")}>
          {plan.name}
        </Heading>
        {plan.description ? (
          <Text size="sm" tone="muted" {...fieldAttrs(plan, "description")}>
            {plan.description}
          </Text>
        ) : null}
      </div>
      <p className="flex items-baseline gap-1">
        <span className="font-heading text-4xl font-semibold tracking-tight" {...fieldAttrs(plan, "price")}>
          {plan.price}
        </span>
        {plan.period ? (
          <span className="text-sm text-muted-foreground" {...fieldAttrs(plan, "period")}>
            {plan.period}
          </span>
        ) : null}
      </p>
      <ActionGroup actions={plan.action} size="default" className="*:w-full" />
      {plan.features?.length ? (
        <ul className="flex flex-col gap-3 text-sm" {...fieldAttrs(plan, "features")}>
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export { PriceCard }
