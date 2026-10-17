import type { Editable, Media, RichText } from "./primitives";

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
    ? Simplify<{ id: string; type: T } & InferFields<F> & Editable>
    : never;

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

interface Opts {
  required?: boolean
  label?: string
  description?: string
}

/**
 * `required` is derived from the *argument* type, not inferred from the
 * return type. Inside `defineBlock({ fields: { … } })` the contextual type
 * would otherwise widen it to `boolean` and make every field optional.
 */
type Req<O> = O extends { required: true } ? true : false

const base = <K extends string>(kind: K, opts?: Opts) => ({
  kind,
  required: opts?.required ?? false,
  ...(opts?.label ? { label: opts.label } : {}),
  ...(opts?.description ? { description: opts.description } : {}),
})

export const field = {
  text: <const O extends Opts & { maxLength?: number } = {}>(opts?: O): TextField<Req<O>> =>
    ({ ...base("text", opts), ...(opts?.maxLength ? { maxLength: opts.maxLength } : {}) }) as TextField<Req<O>>,
  textarea: <const O extends Opts = {}>(opts?: O): TextareaField<Req<O>> => base("textarea", opts) as TextareaField<Req<O>>,
  textList: <const O extends Opts = {}>(opts?: O): TextListField<Req<O>> => base("textList", opts) as TextListField<Req<O>>,
  richText: <const O extends Opts = {}>(opts?: O): RichTextField<Req<O>> => base("richText", opts) as RichTextField<Req<O>>,
  number: <const O extends Opts = {}>(opts?: O): NumberField<Req<O>> => base("number", opts) as NumberField<Req<O>>,
  boolean: <const O extends Opts = {}>(opts?: O): BooleanField<Req<O>> => base("boolean", opts) as BooleanField<Req<O>>,
  link: <const O extends Opts = {}>(opts?: O): LinkField<Req<O>> => base("link", opts) as LinkField<Req<O>>,
  icon: <const O extends Opts = {}>(opts?: O): IconField<Req<O>> => base("icon", opts) as IconField<Req<O>>,
  media: <const O extends Opts & { accept?: MediaField["accept"] } = {}>(opts?: O): MediaField<Req<O>> =>
    ({ ...base("media", opts), accept: opts?.accept ?? "image" }) as MediaField<Req<O>>,
  select: <const Options extends readonly string[], const O extends Opts & { defaultValue?: Options[number] } = {}>(
    options: Options,
    opts?: O,
  ): SelectField<Options, Req<O>> =>
    ({
      ...base("select", opts),
      options,
      ...(opts?.defaultValue ? { defaultValue: opts.defaultValue } : {}),
    }) as SelectField<Options, Req<O>>,
  items: <const D extends AnyItemDefinition>(
    of: readonly D[],
    opts?: Omit<Opts, "required"> & { min?: number; max?: number },
  ): ItemsField<D> => ({
    ...base("items", { ...opts, required: true }),
    required: true,
    of,
    ...(opts?.min !== undefined ? { min: opts.min } : {}),
    ...(opts?.max !== undefined ? { max: opts.max } : {}),
  }),
  blocks: <const D extends AnyBlockDefinition>(of: readonly D[], opts?: Omit<Opts, "required">): BlocksField<D> => ({
    ...base("blocks", { ...opts, required: true }),
    required: true,
    of,
  }),
}

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
