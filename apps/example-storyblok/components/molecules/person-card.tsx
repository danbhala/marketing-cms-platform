import type * as React from "react"

import type { Person } from "@/lib/content-model"
import { editAttrs, fieldAttrs } from "@/lib/cms-core/edit"

import { Heading } from "../atoms/heading"
import { Image } from "../atoms/image"
import { Text } from "../atoms/text"
import { cn } from "../lib/utils"

export interface PersonCardProps extends React.ComponentProps<"div"> {
  /** The person content item (name, role, bio, image). */
  item: Person
}

/** Team member card: square photo, name, role and bio. */
function PersonCard({ item, className, ...props }: PersonCardProps) {
  return (
    <div data-slot="person-card" className={cn("flex flex-col gap-4", className)} {...editAttrs(item)} {...props}>
      {item.image ? (
        <Image media={item.image} ratio="square" radius="xl" {...fieldAttrs(item, "image")} />
      ) : (
        <div aria-hidden className="aspect-square rounded-xl bg-muted" />
      )}
      <div className="flex flex-col gap-1">
        <Heading as="h3" size="h6" {...fieldAttrs(item, "name")}>
          {item.name}
        </Heading>
        {item.role ? (
          <Text size="sm" tone="primary" {...fieldAttrs(item, "role")}>
            {item.role}
          </Text>
        ) : null}
        {item.bio ? (
          <Text size="sm" tone="muted" {...fieldAttrs(item, "bio")}>
            {item.bio}
          </Text>
        ) : null}
      </div>
    </div>
  )
}

export { PersonCard }
