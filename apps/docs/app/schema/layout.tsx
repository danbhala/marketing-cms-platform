import type { Metadata } from "next"
import type { ReactNode } from "react"

import "@/schema-studio/studio.css"

export const metadata: Metadata = {
  title: "Schema studio",
  description:
    "Design a block with the platform's field builders and see the schema every CMS adapter generates for it.",
}

export default function SchemaLayout({ children }: { children: ReactNode }) {
  return children
}
