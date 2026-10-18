"use client"

import * as React from "react"

import { Button } from "../atoms/button"
import { Text } from "../atoms/text"
import { Input } from "../primitives/input"
import { Label } from "../primitives/label"
import type { ChromeLabels } from "./chrome"

export interface FooterSignupProps {
  /** Where the form posts `{ email }` as JSON (or as a normal form post without JavaScript). */
  endpoint: string
  /** Button label. */
  submitLabel: string
  labels: Pick<ChromeLabels, "email" | "subscribed" | "subscribeError">
  /** Submits the address. Defaults to posting JSON to `endpoint`; stories pass a mock. */
  submit?: (email: string) => Promise<void> | void
}

type Status = "idle" | "submitting" | "success" | "error"

/** Email field and button for the footer band. */
function FooterSignup({ endpoint, submitLabel, labels, submit }: FooterSignupProps) {
  const [status, setStatus] = React.useState<Status>("idle")
  const id = React.useId()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const email = String(new FormData(form).get("email") ?? "")
    setStatus("submitting")
    try {
      if (submit) await submit(email)
      else {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        })
        if (!response.ok) throw new Error(String(response.status))
      }
      setStatus("success")
      form.reset()
    } catch {
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <Text role="status" weight="medium">
        {labels.subscribed}
      </Text>
    )
  }

  return (
    <form
      action={endpoint}
      method="post"
      onSubmit={handleSubmit}
      aria-busy={status === "submitting"}
      className="flex w-full flex-col gap-2 section-sm:max-w-[28rem]"
    >
      <Label htmlFor={id} className="sr-only">
        {labels.email}
      </Label>
      <div className="flex flex-col gap-2 section-sm:flex-row">
        <Input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={labels.email}
          aria-invalid={status === "error" || undefined}
          className="h-10 bg-background text-foreground"
        />
        <Button type="submit" size="lg" className="h-10" disabled={status === "submitting"}>
          {submitLabel}
        </Button>
      </div>
      {status === "error" ? (
        <Text role="alert" size="sm">
          {labels.subscribeError}
        </Text>
      ) : null}
    </form>
  )
}

export { FooterSignup }
