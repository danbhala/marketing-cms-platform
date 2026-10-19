import { Fragment } from "react"

/**
 * A small column-based flow diagram in plain CSS, so the docs need no
 * diagram runtime. Each column is a list of nodes; arrows join the columns.
 */
export function FlowDiagram({ columns }: { columns: { title?: string; nodes: string[] }[] }) {
  return (
    // tabIndex lets keyboard users scroll a diagram wider than the screen.
    <div
      tabIndex={0}
      className="not-prose bg-fd-card my-6 flex items-center gap-2 overflow-x-auto rounded-xl border p-4 text-sm"
    >
      {columns.map((column, i) => (
        <Fragment key={i}>
          {i > 0 ? <span className="text-fd-muted-foreground shrink-0">→</span> : null}
          <div className="flex min-w-32 shrink-0 flex-col gap-2">
            {column.title ? (
              <div className="text-fd-muted-foreground text-xs tracking-wide uppercase">{column.title}</div>
            ) : null}
            {column.nodes.map((node) => (
              <div key={node} className="bg-fd-background rounded-md border px-3 py-1.5 font-mono text-xs">
                {node}
              </div>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  )
}
