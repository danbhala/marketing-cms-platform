"use client"

import type * as React from "react"

import type { FormField as FormFieldContent } from "@/lib/content-model"
import { editAttrs } from "@/lib/cms-core/edit"

import { Checkbox } from "../primitives/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "../primitives/field"
import { Input } from "../primitives/input"
import { NativeSelect, NativeSelectOption } from "../primitives/native-select"
import { Textarea } from "../primitives/textarea"

export interface FormFieldProps {
  /** The CMS field definition (name, label, input type, required, options). */
  field: FormFieldContent
  /** Validation message to show under the control. */
  error?: string | null
  /** Initial value, e.g. to repopulate after a failed submit. */
  defaultValue?: string
}

/**
 * Renders one CMS-defined form field with the shadcn Field composition.
 * Uncontrolled on purpose: the Form block submits with FormData, so these
 * work without client state and inside progressive-enhancement forms.
 */
function FormField({ field, error, defaultValue }: FormFieldProps) {
  const id = `field-${field.id}`
  const invalid = Boolean(error)

  if (field.inputType === "checkbox") {
    return (
      <Field orientation="horizontal" data-invalid={invalid || undefined} {...editAttrs(field)}>
        <Checkbox id={id} name={field.name} required={field.required} aria-invalid={invalid || undefined} />
        <FieldLabel htmlFor={id} className="font-normal">
          {field.label}
        </FieldLabel>
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
    )
  }

  let control: React.ReactNode
  if (field.inputType === "textarea") {
    control = (
      <Textarea
        id={id}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        defaultValue={defaultValue}
        aria-invalid={invalid || undefined}
        rows={4}
      />
    )
  } else if (field.inputType === "select") {
    control = (
      <NativeSelect
        id={id}
        name={field.name}
        required={field.required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={invalid || undefined}
      >
        <NativeSelectOption value="" disabled>
          {field.placeholder ?? "Select…"}
        </NativeSelectOption>
        {(field.options ?? []).map((option) => (
          <NativeSelectOption key={option} value={option}>
            {option}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    )
  } else {
    control = (
      <Input
        id={id}
        name={field.name}
        type={field.inputType}
        placeholder={field.placeholder}
        required={field.required}
        defaultValue={defaultValue}
        aria-invalid={invalid || undefined}
        autoComplete={field.inputType === "email" ? "email" : field.inputType === "tel" ? "tel" : undefined}
      />
    )
  }

  return (
    <Field data-invalid={invalid || undefined} {...editAttrs(field)}>
      <FieldLabel htmlFor={id}>
        {field.label}
        {field.required ? (
          <span aria-hidden className="text-destructive">
            {" "}
            *
          </span>
        ) : null}
      </FieldLabel>
      {control}
      {error ? <FieldError>{error}</FieldError> : null}
      <FieldDescription className="sr-only">{field.required ? "Required" : "Optional"}</FieldDescription>
    </Field>
  )
}

export { FormField }
