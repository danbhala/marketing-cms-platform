import type { Media, RichText } from "./primitives";

/**
 * A tiny field DSL. Each block, item and document is described once with these
 * builders. From that one description we derive:
 *
 * - the TypeScript type of the canonical content (via `InferFields`)
 * - a runtime validator (`schemaFor` in ./validation)
 * - the content type schema for every CMS (in each `@platform/cms-*` package)
 * - the generic transform that maps raw CMS entries to canonical content
 */

interface FieldBase<K extends string, R extends boolean> {
  kind: K;
  required: R;
  label?: string;
  description?: string;
}

export interface TextField<R extends boolean = boolean> extends FieldBase<"text", R> {
  maxLength?: number;
}
export interface TextareaField<R extends boolean = boolean> extends FieldBase<"textarea", R> {}
export interface TextListField<R extends boolean = boolean> extends FieldBase<"textList", R> {}
export interface RichTextField<R extends boolean = boolean> extends FieldBase<"richText", R> {}
export interface NumberField<R extends boolean = boolean> extends FieldBase<"number", R> {}
export interface BooleanField<R extends boolean = boolean> extends FieldBase<"boolean", R> {}
export interface LinkField<R extends boolean = boolean> extends FieldBase<"link", R> {}
export interface IconField<R extends boolean = boolean> extends FieldBase<"icon", R> {}
export interface MediaField<R extends boolean = boolean> extends FieldBase<"media", R> {
  accept?: "image" | "video" | "any";
}
export interface SelectField<
  O extends readonly string[] = readonly string[],
  R extends boolean = boolean,
> extends FieldBase<"select", R> {
  options: O;
  defaultValue?: O[number];
}

/** An ordered list of nested items of one or more item types. */
export interface ItemsField<D extends AnyItemDefinition = AnyItemDefinition>
  extends FieldBase<"items", true> {
  of: readonly D[];
  min?: number;
  max?: number;
}

/** An ordered list of page blocks. Used by documents such as `page`. */
export interface BlocksField<D extends AnyBlockDefinition = AnyBlockDefinition>
  extends FieldBase<"blocks", true> {
  of: readonly D[];
}

export type Field =
  | TextField
  | TextareaField
  | TextListField
  | RichTextField
  | NumberField
  | BooleanField
  | LinkField
  | IconField
  | MediaField
  | SelectField
  | ItemsField
  | BlocksField;

export type FieldKind = Field["kind"];
export type Fields = Record<string, Field>;

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export type DefinitionKind = "block" | "item" | "document";

export interface Definition<
  K extends DefinitionKind = DefinitionKind,
  T extends string = string,
  F extends Fields = Fields,
> {
  kind: K;
  type: T;
  label: string;
  description?: string;
  fields: F;
  /** Documents only: has its own URL and is fetched by slug. */
  routable?: boolean;
  /** Documents only: there is exactly one per site/locale. */
  singleton?: boolean;
}

export type AnyItemDefinition = Definition<"item", string, any>;
export type AnyBlockDefinition = Definition<"block", string, any>;
export type AnyDocumentDefinition = Definition<"document", string, any>;
export type AnyDefinition = AnyItemDefinition | AnyBlockDefinition | AnyDocumentDefinition;

// ---------------------------------------------------------------------------
// Type inference
// ---------------------------------------------------------------------------

type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type FieldValue<F> = F extends TextField | TextareaField | LinkField | IconField
  ? string
  : F extends TextListField
    ? string[]
    : F extends RichTextField
      ? RichText
      : F extends NumberField
        ? number
        : F extends BooleanField
          ? boolean
          : F extends MediaField
            ? Media
            : F extends SelectField<infer O>
              ? O[number]
              : F extends ItemsField<infer D>
                ? Array<InferContent<D>>
                : F extends BlocksField<infer D>
                  ? Array<InferContent<D>>
                  : never;

type RequiredKeys<F extends Fields> = {
  [K in keyof F]: F[K]["required"] extends true ? K : never;
}[keyof F];
type OptionalKeys<F extends Fields> = Exclude<keyof F, RequiredKeys<F>>;

export type InferFields<F extends Fields> = Simplify<
  { [K in RequiredKeys<F>]: FieldValue<F[K]> } & {
    [K in OptionalKeys<F>]?: FieldValue<F[K]>;
  }
>;

/** The canonical content shape of a definition: system keys plus its fields. */
export type InferContent<D> =
  D extends Definition<infer _K, infer T, infer F>
    ? Simplify<{ id: string; type: T } & InferFields<F>>
    : never;

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

interface Opts<R extends boolean> {
  required?: R;
  label?: string;
  description?: string;
}

const base = <K extends string, R extends boolean>(kind: K, opts?: Opts<R>) => ({
  kind,
  required: (opts?.required ?? false) as R,
  ...(opts?.label ? { label: opts.label } : {}),
  ...(opts?.description ? { description: opts.description } : {}),
});

export const field = {
  text: <R extends boolean = false>(opts?: Opts<R> & { maxLength?: number }): TextField<R> => ({
    ...base("text", opts),
    ...(opts?.maxLength ? { maxLength: opts.maxLength } : {}),
  }),
  textarea: <R extends boolean = false>(opts?: Opts<R>): TextareaField<R> => base("textarea", opts),
  textList: <R extends boolean = false>(opts?: Opts<R>): TextListField<R> => base("textList", opts),
  richText: <R extends boolean = false>(opts?: Opts<R>): RichTextField<R> => base("richText", opts),
  number: <R extends boolean = false>(opts?: Opts<R>): NumberField<R> => base("number", opts),
  boolean: <R extends boolean = false>(opts?: Opts<R>): BooleanField<R> => base("boolean", opts),
  link: <R extends boolean = false>(opts?: Opts<R>): LinkField<R> => base("link", opts),
  icon: <R extends boolean = false>(opts?: Opts<R>): IconField<R> => base("icon", opts),
  media: <R extends boolean = false>(
    opts?: Opts<R> & { accept?: MediaField["accept"] },
  ): MediaField<R> => ({ ...base("media", opts), accept: opts?.accept ?? "image" }),
  select: <const O extends readonly string[], R extends boolean = false>(
    options: O,
    opts?: Opts<R> & { defaultValue?: O[number] },
  ): SelectField<O, R> => ({
    ...base("select", opts),
    options,
    ...(opts?.defaultValue ? { defaultValue: opts.defaultValue } : {}),
  }),
  items: <const D extends AnyItemDefinition>(
    of: readonly D[],
    opts?: Omit<Opts<true>, "required"> & { min?: number; max?: number },
  ): ItemsField<D> => ({
    ...base("items", { ...opts, required: true }),
    of,
    ...(opts?.min !== undefined ? { min: opts.min } : {}),
    ...(opts?.max !== undefined ? { max: opts.max } : {}),
  }),
  blocks: <const D extends AnyBlockDefinition>(
    of: readonly D[],
    opts?: Omit<Opts<true>, "required">,
  ): BlocksField<D> => ({ ...base("blocks", { ...opts, required: true }), of }),
};

export function defineItem<const T extends string, const F extends Fields>(
  type: T,
  def: { label: string; description?: string; fields: F },
): Definition<"item", T, F> {
  return { kind: "item", type, ...def };
}

export function defineBlock<const T extends string, const F extends Fields>(
  type: T,
  def: { label: string; description?: string; fields: F },
): Definition<"block", T, F> {
  return { kind: "block", type, ...def };
}

export function defineDocument<const T extends string, const F extends Fields>(
  type: T,
  def: { label: string; description?: string; fields: F; routable?: boolean; singleton?: boolean },
): Definition<"document", T, F> {
  return { kind: "document", type, ...def };
}
