import { Fragment } from "react"

/**
 * A small column-based flow diagram in plain CSS, so the docs need no
 * diagram runtime. Each column is a list of nodes; arrows join the columns.
 */
export function FlowDiagram({ columns }: { columns: { title?: string; nodes: string[] }[] }) {
  return (
    <div className="not-prose my-6 flex items-center gap-2 overflow-x-auto rounded-xl border bg-fd-card p-4 text-sm">
      {columns.map((column, i) => (
        <Fragment key={i}>
          {i > 0 ? <span className="shrink-0 text-fd-muted-foreground">→</span> : null}
          <div className="flex min-w-32 shrink-0 flex-col gap-2">
            {column.title ? <div className="text-xs uppercase tracking-wide text-fd-muted-foreground">{column.title}</div> : null}
            {column.nodes.map((node) => (
              <div key={node} className="rounded-md border bg-fd-background px-3 py-1.5 font-mono text-xs">
                {node}
              </div>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  )
}
