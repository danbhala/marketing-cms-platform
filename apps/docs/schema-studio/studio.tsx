"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

import type { AnyDefinition } from "@platform/content-model"

import { Field, Segmented, Select, Toggle } from "@/theme-studio/controls"

import { cmsIds, cmsLabels, fieldNames, generate, type CmsId, type CodeView } from "./generate"
import { findRange, type Range } from "./highlight"
import {
  builtInItems,
  fieldKinds,
  humanize,
  kindLabels,
  presets,
  problems,
  toCamel,
  type Problem,
  type StudioField,
  type StudioModel,
  type StudioType,
} from "./model"
import { modelToPrompt } from "./prompt"
import { deleteDesign, saveDesign, useSavedDesigns } from "./saved"
import { shareUrl, useModel } from "./store"

/**
 * The schema studio: design a block with the platform's field builders on the
 * left, read the one canonical definition in the middle, and see what each
 * CMS's schema generator makes of it on the right. The CMS output is produced
 * by the adapters' own generators (see generate.ts), nothing is mocked.
 */

type Tab = "map" | CmsId
type MobileView = "build" | "map" | "code"
/** -1 is the block; otherwise an index into model.items. */
type Editing = number

export function SchemaStudio() {
  const [model, setModel] = useModel()
  const [preset, setPreset] = useState("sample")
  const [editing, setEditing] = useState<Editing>(-1)
  const [selected, setSelected] = useState<string | null>("title")
  const [tab, setTab] = useState<Tab>("map")
  const [showFile, setShowFile] = useState(true)
  const [mobile, setMobile] = useState<MobileView>("build")
  const [mobileCode, setMobileCode] = useState<"canonical" | CmsId>("canonical")
  const [saveName, setSaveName] = useState<string | null>(null)
  const saved = useSavedDesigns()
  const wide = useIsWide()

  const gen = useMemo(() => generate(model), [model])
  const issues = useMemo(() => problems(model), [model])

  const type: StudioType = editing === -1 ? model.block : (model.items[editing] ?? model.block)
  const definition: AnyDefinition =
    editing === -1
      ? gen.definitions.block
      : (gen.definitions.items.find((d) => d.type === type.type) ?? gen.definitions.block)

  function applyPreset(slug: string) {
    const design = slug.startsWith("saved:") ? saved.find((d) => d.id === slug.slice(6)) : undefined
    const p = presets.find((p) => p.slug === slug)
    if (!design && !p) return
    setPreset(slug)
    setModel(design ? structuredClone(design.model) : p!.model())
    setEditing(-1)
    setSelected(null)
  }

  function save() {
    const name = saveName?.trim()
    if (!name) return
    setPreset(`saved:${saveDesign(name, model)}`)
    setSaveName(null)
  }

  function patchModel(fn: (m: StudioModel) => StudioModel) {
    setPreset("custom")
    setModel((prev) => fn(structuredClone(prev)))
  }

  function patchType(fn: (t: StudioType) => void) {
    patchModel((m) => {
      fn(editing === -1 ? m.block : m.items[editing]!)
      return m
    })
  }

  const canonical: CodeView = {
    name: "definitions",
    lang: "ts",
    text: gen.canonical,
    anchor: (t, name) => ({
      type: `define${t.kind === "item" ? "Item" : "Block"}("${t.type}"`,
      field: `    ${name}: field.`,
      mode: "line",
    }),
  }
  const typesView: CodeView = {
    name: "types",
    lang: "ts",
    text: gen.types,
    anchor: (t, name) => ({
      type: `export interface ${t.type.charAt(0).toUpperCase()}${t.type.slice(1)} {`,
      field: `  ${name}`,
      mode: "line",
    }),
  }

  const builder = (
    <Builder
      model={model}
      type={type}
      editing={editing}
      setEditing={(e) => {
        setEditing(e)
        setSelected(null)
      }}
      selected={selected}
      setSelected={setSelected}
      patchModel={patchModel}
      patchType={patchType}
      issues={issues}
    />
  )

  const map = <MapTable gen={gen} definition={definition} selected={selected} onSelect={setSelected} />

  const cmsPanel = (id: CmsId) => {
    const out = gen.cms[id]
    const view = showFile ? out.file : out.model
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Segmented
            value={showFile ? "file" : "model"}
            onChange={(v) => setShowFile(v === "file")}
            options={[
              { value: "file", label: `File: ${out.file.name}` },
              { value: "model", label: `Model: ${out.model.name}` },
            ]}
          />
          <span className="flex-1" />
          <CopyButton label={`Copy ${showFile ? "file" : "model"}`} getText={() => view.text} small />
        </div>
        <Code view={view} range={selected ? findRange(view.text, view.anchor(definition, selected)) : null} />
      </div>
    )
  }

  const outputTabs = (
    <nav className="flex overflow-x-auto border-b text-xs" aria-label="Output">
      {(["map", ...cmsIds] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          aria-pressed={tab === t}
          className={`shrink-0 px-3 py-2 ${tab === t ? "border-fd-primary border-b-2 font-medium" : "text-fd-muted-foreground hover:text-fd-foreground"}`}
        >
          {t === "map" ? "Map" : cmsLabels[t]}
        </button>
      ))}
    </nav>
  )

  return (
    <div className="schema-studio bg-fd-background text-fd-foreground flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
        <Link href="/docs/content-model" className="font-semibold">
          Schema studio
        </Link>
        <span className="text-fd-muted-foreground hidden sm:inline">·</span>
        <Select
          value={preset}
          onChange={applyPreset}
          label="Start from"
          className="bg-fd-background h-8 max-w-56 rounded-md border px-2 text-sm"
        >
          <option value="custom" disabled>
            Custom
          </option>
          {presets.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
          {saved.length ? (
            <optgroup label="Saved in this browser">
              {saved.map((d) => (
                <option key={d.id} value={`saved:${d.id}`}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </Select>
        {saveName === null ? (
          <button
            type="button"
            onClick={() => setSaveName(model.block.label || model.block.type)}
            className="hover:bg-fd-muted h-8 rounded-md border px-2.5"
          >
            Save
          </button>
        ) : (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <input
              autoFocus
              aria-label="Name for the saved design"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSaveName(null)}
              className="bg-fd-background h-8 w-44 rounded-md border px-2 text-sm"
            />
            <button type="submit" className="bg-fd-primary text-fd-primary-foreground h-8 rounded-md px-2.5">
              Save
            </button>
            <button
              type="button"
              onClick={() => setSaveName(null)}
              className="hover:bg-fd-muted h-8 rounded-md border px-2.5"
            >
              Cancel
            </button>
          </form>
        )}
        {preset.startsWith("saved:") ? (
          <button
            type="button"
            onClick={() => {
              deleteDesign(preset.slice(6))
              setPreset("custom")
            }}
            className="text-fd-muted-foreground hover:text-fd-foreground h-8 rounded-md border px-2.5"
          >
            Delete saved
          </button>
        ) : null}
        <span className="flex-1" />
        <CopyButton label="Copy link" getText={() => shareUrl(model)} />
        <CopyButton label="Copy definition" getText={() => gen.canonical} primary />
        <CopyButton
          label="Copy prompt"
          getText={() => modelToPrompt(model, gen.canonical, { shareUrl: shareUrl(model) })}
        />
      </header>

      {wide ? (
        <div className="grid min-h-0 flex-1 grid-cols-[19rem_minmax(0,1fr)_minmax(0,1.6fr)]">
          <aside className="flex min-h-0 flex-col overflow-y-auto border-r p-3">{builder}</aside>
          <section
            className="flex min-h-0 flex-col gap-3 overflow-y-auto border-r p-3"
            aria-label="Canonical definition"
          >
            <Heading>One definition</Heading>
            <Code
              view={canonical}
              range={selected ? findRange(canonical.text, canonical.anchor(definition, selected)) : null}
            />
            <Heading>Derived type</Heading>
            <Code
              view={typesView}
              range={selected ? findRange(typesView.text, typesView.anchor(definition, selected)) : null}
            />
            <p className="text-fd-muted-foreground text-xs">
              The type is inferred from the definition; <code>schemaFor({model.block.type})</code> gives the zod
              validator the adapters run every entry through.
            </p>
          </section>
          <section className="flex min-h-0 flex-col" aria-label="Generated schemas">
            {outputTabs}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
              {tab === "map" ? (
                <>
                  <Heading>Six schemas from one definition</Heading>
                  {map}
                </>
              ) : (
                cmsPanel(tab)
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-3 py-2">
            <Segmented
              value={mobile}
              onChange={setMobile}
              options={[
                { value: "build", label: "Build" },
                { value: "map", label: "Map" },
                { value: "code", label: "Code" },
              ]}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            {mobile === "build" ? builder : null}
            {mobile === "map" ? (
              <>
                <Heading>Six schemas from one definition</Heading>
                {map}
              </>
            ) : null}
            {mobile === "code" ? (
              <>
                <nav className="-mx-3 -mt-3 flex overflow-x-auto border-b text-xs" aria-label="Code">
                  {(["canonical", ...cmsIds] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMobileCode(t)}
                      aria-pressed={mobileCode === t}
                      className={`shrink-0 px-3 py-2 ${mobileCode === t ? "border-fd-primary border-b-2 font-medium" : "text-fd-muted-foreground"}`}
                    >
                      {t === "canonical" ? "Definition" : cmsLabels[t]}
                    </button>
                  ))}
                </nav>
                {mobileCode === "canonical" ? (
                  <>
                    <Code
                      view={canonical}
                      range={selected ? findRange(canonical.text, canonical.anchor(definition, selected)) : null}
                    />
                    <Heading>Derived type</Heading>
                    <Code
                      view={typesView}
                      range={selected ? findRange(typesView.text, typesView.anchor(definition, selected)) : null}
                    />
                  </>
                ) : (
                  cmsPanel(mobileCode)
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function Builder({
  model,
  type,
  editing,
  setEditing,
  selected,
  setSelected,
  patchModel,
  patchType,
  issues,
}: {
  model: StudioModel
  type: StudioType
  editing: Editing
  setEditing: (e: Editing) => void
  selected: string | null
  setSelected: (name: string | null) => void
  patchModel: (fn: (m: StudioModel) => StudioModel) => void
  patchType: (fn: (t: StudioType) => void) => void
  issues: Problem[]
}) {
  const field = type.fields.find((f) => f.name === selected)
  const where = editing === -1 ? "block" : type.type
  const ownIssues = issues.filter((p) => p.type === where)

  function addField() {
    const base = "newField"
    let name = base
    for (let i = 2; type.fields.some((f) => f.name === name); i++) name = `${base}${i}`
    patchType((t) => t.fields.push({ name, kind: "text" }))
    setSelected(name)
  }

  function addItemType() {
    const base = "myItem"
    let name = base
    for (let i = 2; model.items.some((t) => t.type === name); i++) name = `${base}${i}`
    patchModel((m) => {
      m.items.push({ type: name, label: humanize(name), fields: [{ name: "title", kind: "text", required: true }] })
      return m
    })
    setEditing(model.items.length)
  }

  function removeItemType(index: number) {
    const removed = model.items[index]!.type
    patchModel((m) => {
      m.items.splice(index, 1)
      for (const t of [m.block, ...m.items])
        for (const f of t.fields) if (f.of) f.of = f.of.filter((n) => n !== removed)
      return m
    })
    setEditing(-1)
  }

  function patchField(fn: (f: StudioField) => void) {
    if (!field) return
    patchType((t) => {
      const target = t.fields.find((f) => f.name === field.name)
      if (target) fn(target)
    })
  }

  function renameField(next: string) {
    if (!field) return
    const name = toCamel(next) || next.replace(/[^A-Za-z0-9]/g, "")
    patchType((t) => {
      const target = t.fields.find((f) => f.name === field.name)
      if (target) target.name = name
    })
    setSelected(name)
  }

  function move(index: number, by: number) {
    patchType((t) => {
      const [f] = t.fields.splice(index, 1)
      t.fields.splice(index + by, 0, f!)
    })
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <nav className="flex flex-wrap gap-1 text-xs" aria-label="Types">
        <TypeTab active={editing === -1} onClick={() => setEditing(-1)}>
          Block: {model.block.type}
        </TypeTab>
        {model.items.map((t, i) => (
          <TypeTab key={i} active={editing === i} onClick={() => setEditing(i)}>
            Item: {t.type}
          </TypeTab>
        ))}
        <button
          type="button"
          onClick={addItemType}
          className="text-fd-muted-foreground hover:text-fd-foreground rounded-md border border-dashed px-2 py-1"
        >
          + Item type
        </button>
      </nav>

      <Group title={editing === -1 ? "Block" : "Item type"}>
        <Field label="Type name" hint="camelCase">
          <Input
            value={type.type}
            onChange={(v) => patchType((t) => (t.type = toCamel(v) || v.replace(/[^A-Za-z0-9]/g, "")))}
            mono
          />
        </Field>
        <Field label="Label">
          <Input value={type.label} onChange={(v) => patchType((t) => (t.label = v))} />
        </Field>
        <Field label="Description">
          <Input value={type.description ?? ""} onChange={(v) => patchType((t) => (t.description = v || undefined))} />
        </Field>
        {editing === -1 ? (
          <Toggle
            checked={model.presentation}
            onChange={(v) => patchModel((m) => ({ ...m, presentation: v }))}
            label="Include the shared presentation fields (theme, spacing, anchor, animation)"
          />
        ) : (
          <button
            type="button"
            onClick={() => removeItemType(editing)}
            className="text-fd-muted-foreground self-start text-xs underline-offset-2 hover:underline"
          >
            Remove this item type
          </button>
        )}
      </Group>

      <Group title="Fields">
        <ul className="flex flex-col gap-1">
          {type.fields.map((f, i) => (
            <li
              key={i}
              className={`flex items-center gap-1 rounded-md border pr-1 ${f.name === selected ? "border-fd-primary bg-fd-primary/5" : ""}`}
            >
              <button
                type="button"
                onClick={() => setSelected(f.name)}
                aria-pressed={f.name === selected}
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
              >
                <span className="truncate font-mono text-xs">
                  {f.name}
                  {f.required ? <span className="text-fd-primary"> *</span> : null}
                </span>
                <span className="text-fd-muted-foreground ml-auto shrink-0 text-xs">{kindLabels[f.kind]}</span>
              </button>
              <IconButton label={`Move ${f.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </IconButton>
              <IconButton
                label={`Move ${f.name} down`}
                disabled={i === type.fields.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </IconButton>
              <IconButton
                label={`Remove ${f.name}`}
                onClick={() => {
                  patchType((t) => t.fields.splice(i, 1))
                  if (selected === f.name) setSelected(null)
                }}
              >
                ×
              </IconButton>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addField}
          className="hover:bg-fd-muted h-8 self-start rounded-md border px-2.5 text-xs"
        >
          + Add field
        </button>
      </Group>

      {field ? (
        <Group title={`Field: ${field.name}`}>
          <Field label="Name" hint="camelCase">
            <Input value={field.name} onChange={renameField} mono />
          </Field>
          <Field label="Kind">
            <Select value={field.kind} onChange={(v) => patchField((f) => (f.kind = v as StudioField["kind"]))}>
              {fieldKinds.map((k) => (
                <option key={k} value={k}>
                  {kindLabels[k]} · {k}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Label" hint="defaults from the name">
            <Input
              value={field.label ?? ""}
              onChange={(v) => patchField((f) => (f.label = v || undefined))}
              placeholder={humanize(field.name)}
            />
          </Field>
          <Field label="Help text">
            <Input
              value={field.description ?? ""}
              onChange={(v) => patchField((f) => (f.description = v || undefined))}
            />
          </Field>
          {field.kind !== "items" ? (
            <Toggle
              checked={Boolean(field.required)}
              onChange={(v) => patchField((f) => (f.required = v || undefined))}
              label="Required"
            />
          ) : null}
          {field.kind === "text" ? (
            <Field label="Max length">
              <Input
                type="number"
                value={field.maxLength?.toString() ?? ""}
                onChange={(v) => patchField((f) => (f.maxLength = v ? Number(v) : undefined))}
              />
            </Field>
          ) : null}
          {field.kind === "media" ? (
            <Field label="Accepts">
              <Segmented
                value={field.accept ?? "image"}
                onChange={(v) => patchField((f) => (f.accept = v))}
                options={[
                  { value: "image", label: "Image" },
                  { value: "video", label: "Video" },
                  { value: "any", label: "Any" },
                ]}
              />
            </Field>
          ) : null}
          {field.kind === "select" ? (
            <>
              <Field label="Options" hint="one per line">
                <textarea
                  value={(field.options ?? []).join("\n")}
                  onChange={(e) =>
                    patchField(
                      (f) =>
                        (f.options = e.target.value
                          .split("\n")
                          .map((o) => o.trim())
                          .filter(Boolean))
                    )
                  }
                  rows={3}
                  className="bg-fd-background rounded-md border px-2 py-1 font-mono text-xs"
                />
              </Field>
              <Field label="Default">
                <Select
                  value={field.defaultValue ?? ""}
                  onChange={(v) => patchField((f) => (f.defaultValue = v || undefined))}
                >
                  <option value="">None</option>
                  {(field.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : null}
          {field.kind === "items" ? (
            <>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 font-medium">Allowed item types</legend>
                {model.items.map((t) => (
                  <Toggle
                    key={t.type}
                    checked={Boolean(field.of?.includes(t.type))}
                    onChange={(v) => patchField((f) => (f.of = toggle(f.of ?? [], t.type, v)))}
                    label={`${t.type} (this studio)`}
                  />
                ))}
                <details className="text-xs">
                  <summary className="text-fd-muted-foreground cursor-pointer">Built-in item types</summary>
                  <div className="mt-1 flex flex-col gap-1">
                    {builtInItems.map((d) => (
                      <Toggle
                        key={d.type}
                        checked={Boolean(field.of?.includes(d.type))}
                        onChange={(v) => patchField((f) => (f.of = toggle(f.of ?? [], d.type, v)))}
                        label={`${d.type} · ${d.label}`}
                      />
                    ))}
                  </div>
                </details>
              </fieldset>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Min">
                  <Input
                    type="number"
                    value={field.min?.toString() ?? ""}
                    onChange={(v) => patchField((f) => (f.min = v ? Number(v) : undefined))}
                  />
                </Field>
                <Field label="Max">
                  <Input
                    type="number"
                    value={field.max?.toString() ?? ""}
                    onChange={(v) => patchField((f) => (f.max = v ? Number(v) : undefined))}
                  />
                </Field>
              </div>
            </>
          ) : null}
        </Group>
      ) : (
        <p className="text-fd-muted-foreground text-xs">
          Select a field to edit it. Its definition is highlighted in every output.
        </p>
      )}

      {ownIssues.length ? (
        <ul
          className="flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs"
          aria-live="polite"
        >
          {ownIssues.map((p, i) => (
            <li key={i}>{p.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

const toggle = (list: string[], value: string, on: boolean) =>
  on ? [...new Set([...list, value])] : list.filter((v) => v !== value)

// ---------------------------------------------------------------------------
// Map table
// ---------------------------------------------------------------------------

function MapTable({
  gen,
  definition,
  selected,
  onSelect,
}: {
  gen: ReturnType<typeof generate>
  definition: AnyDefinition
  selected: string | null
  onSelect: (name: string) => void
}) {
  const names = fieldNames(definition)
  const kindOf = (name: string) => (definition.fields as Record<string, { kind: string }>)[name]?.kind ?? ""
  const row = (name: string, muted: boolean) => (
    <tr
      key={name}
      aria-selected={name === selected}
      onClick={() => onSelect(name)}
      className={`cursor-pointer border-b last:border-0 ${name === selected ? "bg-fd-primary/10" : "hover:bg-fd-muted/60"} ${muted ? "text-fd-muted-foreground" : ""}`}
    >
      <th scope="row" className="py-1.5 pr-3 text-left font-normal">
        <button type="button" onClick={() => onSelect(name)} className="font-mono text-xs">
          {name}
        </button>
      </th>
      <td className="pr-3 font-mono text-[11px]">{kindOf(name)}</td>
      {cmsIds.map((id) => (
        <td key={id} className="pr-3 font-mono text-[11px] whitespace-nowrap">
          {gen.cms[id].summary(definition, name)}
        </td>
      ))}
    </tr>
  )
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="bg-fd-muted/40 text-fd-muted-foreground border-b text-left text-[11px] tracking-wide uppercase">
            <th scope="col" className="py-2 pr-3 pl-2 font-medium">
              Field
            </th>
            <th scope="col" className="pr-3 font-medium">
              Kind
            </th>
            {cmsIds.map((id) => (
              <th key={id} scope="col" className="pr-3 font-medium">
                {cmsLabels[id]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_th]:pl-2">
          {names.own.map((name) => row(name, false))}
          {names.presentation.length ? (
            <>
              <tr className="bg-fd-muted/40 text-fd-muted-foreground border-b text-[11px] tracking-wide uppercase">
                <td colSpan={2 + cmsIds.length} className="py-1 pl-2">
                  Shared presentation fields
                </td>
              </tr>
              {names.presentation.map((name) => row(name, true))}
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Code
// ---------------------------------------------------------------------------

function Code({ view, range }: { view: CodeView; range: Range | null }) {
  const ref = useRef<HTMLElement>(null)
  const lines = view.text.replace(/\n$/, "").split("\n")
  const start = range?.start ?? -1
  useEffect(() => {
    if (start < 0) return
    ;(ref.current?.children[start] as HTMLElement | undefined)?.scrollIntoView({ block: "center" })
  }, [start, view.text])
  return (
    <pre
      tabIndex={0}
      className="bg-fd-card min-h-0 flex-1 overflow-auto rounded-md border p-3 text-[12px] leading-5"
      aria-label={view.name}
    >
      <code ref={ref} className="block" data-lang={view.lang}>
        {lines.map((line, i) => {
          const on = range !== null && i >= range.start && i <= range.end
          return (
            <span key={i} className={`-mx-3 block px-3 ${on ? "bg-fd-primary/15" : ""}`}>
              {line || " "}
            </span>
          )
        })}
      </code>
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-fd-muted-foreground text-xs font-medium tracking-wide uppercase">{children}</h2>
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Heading>{title}</Heading>
      {children}
    </section>
  )
}

function TypeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-2 py-1 font-mono ${active ? "border-fd-primary bg-fd-primary/10" : "text-fd-muted-foreground hover:text-fd-foreground"}`}
    >
      {children}
    </button>
  )
}

function Input({
  value,
  onChange,
  mono,
  type = "text",
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  mono?: boolean
  type?: "text" | "number"
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-fd-background h-9 w-full rounded-md border px-2 text-sm ${mono ? "font-mono text-xs" : ""}`}
    />
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground size-7 rounded disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function CopyButton({
  label,
  getText,
  primary,
  small,
}: {
  label: string
  getText: () => string
  primary?: boolean
  small?: boolean
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle")
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(getText())
          setState("done")
        } catch {
          setState("failed")
        }
        setTimeout(() => setState("idle"), 1500)
      }}
      className={`rounded-md ${small ? "h-7 px-2 text-xs" : "h-8 px-2.5 text-sm"} ${primary ? "bg-fd-primary text-fd-primary-foreground" : "hover:bg-fd-muted border"}`}
    >
      {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  )
}

const wideQuery = "(min-width: 1024px)"
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(wideQuery)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
/** Desktop shows three columns; narrower screens switch between Build, Map and Code. */
function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(wideQuery).matches,
    () => true
  )
}
