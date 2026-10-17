"use client"

import * as React from "react"
import { CheckCircle2Icon } from "lucide-react"

import type { FormBlock as FormBlockContent } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Button } from "../atoms/button"
import { Container } from "../atoms/container"
import { Text } from "../atoms/text"
import { FormField } from "../molecules/form-field"
import { SectionHeader } from "../molecules/section-header"
import { cn } from "../lib/utils"
import { BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the FormBlock block: the `FormBlockContent` content plus section attributes. */
export interface FormBlockProps extends BlockComponentProps<FormBlockContent> {
  /**
   * Submits the form. Defaults to posting JSON to `block.endpoint`. The host
   * app can swap in a Server Action or a mocked handler (as the stories do).
   */
  submit?: (values: Record<string, string>) => Promise<void> | void
}

/** Submission state machine for the form. */
type Status = { state: "idle" } | { state: "submitting" } | { state: "success" } | { state: "error"; message: string }

/** Default `submit`: POST the values as JSON and throw on a non-2xx response. */
async function postJson(endpoint: string, values: Record<string, string>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  })
  if (!response.ok) throw new Error(`Request failed with ${response.status}`)
}

/**
 * Newsletter or contact form built from CMS-defined fields. Progressive
 * enhancement: without JavaScript it posts to `endpoint` as a normal form.
 */
function FormBlock({ block, index, submit, className, ...props }: FormBlockProps) {
  const [status, setStatus] = React.useState<Status>({ state: "idle" })
  const inline = block.layout === "inline"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values: Record<string, string> = {}
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string") values[key] = value
    }
    setStatus({ state: "submitting" })
    try {
      if (submit) await submit(values)
      else if (block.endpoint) await postJson(block.endpoint, values)
      setStatus({ state: "success" })
      form.reset()
    } catch (error) {
      setStatus({ state: "error", message: error instanceof Error ? error.message : "Something went wrong" })
    }
  }

  return (
    <BlockSection block={block} className={className} {...props}>
      <Container size={inline ? "md" : "sm"} className="flex flex-col gap-(--block-header-gap)">
        <SectionHeader
          eyebrow={block.eyebrow}
          title={block.title}
          description={block.description}
          as={index === 0 ? "h1" : "h2"}
          source={block}
        />
        {status.state === "success" ? (
          <div role="status" className="flex items-center justify-center gap-3 rounded-xl border bg-card p-6 text-card-foreground">
            <CheckCircle2Icon className="size-5 text-primary" aria-hidden />
            <Text weight="medium" {...fieldAttrs(block, "successMessage")}>
              {block.successMessage ?? "Thank you."}
            </Text>
          </div>
        ) : (
          <form
            action={block.endpoint}
            method="post"
            onSubmit={handleSubmit}
            noValidate={false}
            className="flex flex-col gap-6"
            aria-busy={status.state === "submitting"}
          >
            <div className={cn("flex gap-4", inline ? "flex-col sm:flex-row sm:items-start" : "flex-col")} {...fieldAttrs(block, "fields")}>
              {block.fields.map((field) => (
                <FormField key={field.id} field={field} />
              ))}
              {inline ? (
                <Button type="submit" size="lg" disabled={status.state === "submitting"} className="sm:mt-6" {...fieldAttrs(block, "submitLabel")}>
                  {block.submitLabel}
                </Button>
              ) : null}
            </div>
            {!inline ? (
              <Button type="submit" size="lg" disabled={status.state === "submitting"} className="self-start" {...fieldAttrs(block, "submitLabel")}>
                {status.state === "submitting" ? "Sending…" : block.submitLabel}
              </Button>
            ) : null}
            {status.state === "error" ? (
              <Text role="alert" size="sm" className="text-destructive">
                {status.message}
              </Text>
            ) : null}
            {block.consent ? (
              <Text size="xs" tone="muted" {...fieldAttrs(block, "consent")}>
                {block.consent}
              </Text>
            ) : null}
          </form>
        )}
      </Container>
    </BlockSection>
  )
}

export { FormBlock }
