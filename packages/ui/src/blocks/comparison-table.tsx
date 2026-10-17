import { CheckIcon, MinusIcon } from "lucide-react"

import type { ComparisonTableBlock } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { SectionHeader } from "../molecules/section-header"
import { Badge } from "../primitives/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../primitives/table"
import { cn } from "../lib/utils"
import { BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the ComparisonTable block: the `ComparisonTableBlock` content plus section attributes. */
export type ComparisonTableProps = BlockComponentProps<ComparisonTableBlock>

/** "yes" / "no" (any case) become icons; anything else is shown as text. */
function CellValue({ value }: { value: string | undefined }) {
  const v = value?.trim().toLowerCase()
  if (v === "yes" || v === "true") {
    return (
      <span className="inline-flex items-center justify-center text-primary">
        <CheckIcon className="size-5" aria-hidden />
        <span className="sr-only">Included</span>
      </span>
    )
  }
  if (v === "no" || v === "false" || v === "" || v === undefined) {
    return (
      <span className="inline-flex items-center justify-center text-muted-foreground/60">
        <MinusIcon className="size-5" aria-hidden />
        <span className="sr-only">Not included</span>
      </span>
    )
  }
  return <>{value}</>
}

/** Feature-by-plan matrix. Scrolls horizontally on small screens. */
function ComparisonTable({ block, index, className, ...props }: ComparisonTableProps) {
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container className="flex flex-col gap-(--block-header-gap)">
        <SectionHeader
          eyebrow={block.eyebrow}
          title={block.title}
          description={block.description}
          as={index === 0 ? "h1" : "h2"}
          source={block}
        />
        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-160">
            <TableHeader {...fieldAttrs(block, "columns")}>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-1/3 min-w-48 px-4 py-4">
                  <span className="sr-only">Feature</span>
                </TableHead>
                {block.columns.map((column) => (
                  <TableHead
                    key={column.id}
                    scope="col"
                    className={cn("px-4 py-4 text-center text-base font-semibold text-foreground", column.highlighted && "bg-primary/5")}
                    {...editAttrs(column)}
                  >
                    <span className="inline-flex items-center gap-2">
                      {column.label}
                      {column.highlighted ? <Badge>Popular</Badge> : null}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody {...fieldAttrs(block, "rows")}>
              {block.rows.map((row) => (
                <TableRow key={row.id} {...editAttrs(row)}>
                  <TableHead scope="row" className="px-4 py-3 font-medium text-foreground">
                    {row.label}
                  </TableHead>
                  {block.columns.map((column, i) => (
                    <TableCell key={column.id} className={cn("px-4 py-3 text-center", column.highlighted && "bg-primary/5")}>
                      <CellValue value={row.values?.[i]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Container>
    </BlockSection>
  )
}

export { ComparisonTable }
