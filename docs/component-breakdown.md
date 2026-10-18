# Marketing component inventory and modular breakdown

This is the design basis for `@platform/ui`. It answers two questions: which
~20 components a marketing site needs, and how to build them out of a small
set of reusable, slot-based parts so the library scales without each section
becoming a one-off.

## 1. The 20 marketing components

| #   | Component                   | What it does                                                         | Main variants                                        |
| --- | --------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Announcement bar            | Thin dismissible strip above the header with a message and link      | default, inverse                                     |
| 2   | Site header                 | Logo, primary nav (with dropdown groups), actions, mobile sheet menu | default, transparent, sticky                         |
| 3   | Hero                        | Page opener: eyebrow, headline, lead, CTAs, optional media           | centered, split (media left/right), background media |
| 4   | Logo cloud                  | Row or grid of customer/partner logos                                | row, grid; grayscale on/off                          |
| 5   | Feature grid                | 2–4 column grid of icon + title + text items                         | 2/3/4 columns, card or plain items                   |
| 6   | Feature split               | Text block beside media, often alternating down a page               | media left/right, with bullet list                   |
| 7   | Stats                       | Big numbers with labels                                              | row, grid, with/without description                  |
| 8   | Testimonials                | Customer quotes with avatar, name, role                              | single featured, grid                                |
| 9   | Pricing table               | Plan cards with price, feature list and CTA, one highlighted         | 2–4 plans                                            |
| 10  | Comparison table            | Feature-by-plan matrix with check/cross/text cells                   | default, sticky header                               |
| 11  | FAQ                         | Question/answer accordion                                            | single column, two column                            |
| 12  | CTA banner                  | Closing call to action band                                          | centered, split, inverse/brand surface               |
| 13  | Card grid                   | Blog posts, resources, case studies as cards                         | 2/3/4 columns                                        |
| 14  | Team grid                   | People with photo, name, role                                        | 3/4 columns                                          |
| 15  | Steps                       | Numbered process / how it works                                      | horizontal, vertical                                 |
| 16  | Tabbed content              | Tabs switching between feature panels                                | default                                              |
| 17  | Rich text                   | Long-form CMS content (articles, legal pages)                        | prose width, full width                              |
| 18  | Media                       | Standalone image or video with caption                               | contained, full bleed                                |
| 19  | Form (newsletter / contact) | Heading + fields + submit, with consent text                         | inline (newsletter), stacked (contact)               |
| 20  | Site footer                 | Link columns, legal line, social links                               | columns, simple                                      |

## 2. Layers

Everything is built in layers. A layer may only use layers below it.

```
tokens  →  primitives (shadcn)  →  atoms  →  molecules  →  blocks  →  templates
```

| Layer      | Where              | Rule                                                                               |
| ---------- | ------------------ | ---------------------------------------------------------------------------------- |
| Tokens     | `src/styles/*.css` | CSS variables only: primitive → semantic → component. Themes are classes.          |
| Primitives | `src/primitives/`  | Unmodified shadcn/ui (new-york) components. Updated with the shadcn CLI.           |
| Atoms      | `src/atoms/`       | Smallest branded-but-neutral pieces, CVA variants, no data shape assumptions.      |
| Molecules  | `src/molecules/`   | Slot-based groupings of atoms that repeat across many blocks.                      |
| Blocks     | `src/blocks/`      | The 20 sections. Compound parts for hand composition plus one data-driven default. |
| Templates  | `src/templates/`   | Whole pages composed from blocks, used for Storybook and as starting layouts.      |

## 3. Atoms

| Atom             | Built on               | CVA variants                                                                                        |
| ---------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `Heading`        | Typography             | `size`: display, h1–h6 · `weight` · `align` · `as` decoupled from size (an `h2` can look like `h4`) |
| `Text`           | Typography             | `size`: lead, lg, base, sm, xs · `tone`: default, muted · `align` · `as`                            |
| `Eyebrow`        | Typography             | `tone`: default, primary                                                                            |
| `Prose`          | Typography             | `size`: sm, base, lg (styles nested HTML from rich text)                                            |
| `Button`         | shadcn Button          | shadcn variants + `asChild` so links render as buttons                                              |
| `Link`           | `<a>` / framework link | `variant`: inline, nav, muted · swappable component via `LinkProvider` (Next `Link` injected)       |
| `Badge`          | shadcn Badge           | shadcn variants                                                                                     |
| `Icon`           | lucide-react           | `size` · lookup by name so CMS content can name an icon                                             |
| `Image`          | `<img>`                | `ratio`, `fit`, `radius` · swappable via `ImageProvider` (Next `Image` injected)                    |
| `Container`      | div                    | `size`: sm, md, lg, xl, full                                                                        |
| `Section`        | section                | `spacing`: none, sm, md, lg · `surface`: default, muted, inverse, primary · `theme` class           |
| `Stack` / `Grid` | div                    | `gap`, `align`, `columns` (responsive presets)                                                      |

The typography system is one CVA definition (`typographyVariants`) that
`Heading`, `Text`, `Eyebrow` and `Prose` all read from, so a type scale change
is a single edit and every block follows.

## 4. Molecules (the reusable slots)

| Molecule        | Slots / parts                                                             | Reused by blocks                                 |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| `SectionHeader` | eyebrow · title · description · actions · `align`                         | 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19 |
| `ActionGroup`   | list of `Action` (label, href, variant)                                   | 1, 2, 3, 6, 9, 12, 19                            |
| `Media`         | image or video, ratio, caption                                            | 3, 6, 13, 16, 18                                 |
| `FeatureItem`   | icon · title · description · link · `layout` (stacked/inline, card/plain) | 5, 6, 15, 16                                     |
| `StatItem`      | value · label · description                                               | 7                                                |
| `Quote`         | quote · author (Avatar, name, role) · logo                                | 8                                                |
| `PriceCard`     | name · price · period · description · features · action · `highlighted`   | 9                                                |
| `ContentCard`   | media · eyebrow/tag · title · excerpt · meta · link                       | 13                                               |
| `PersonCard`    | avatar/image · name · role · bio                                          | 14                                               |
| `LogoItem`      | image · name · href                                                       | 4                                                |
| `NavGroup`      | label · links · featured link                                             | 2, 20                                            |
| `FormField`     | label · control · hint · error                                            | 19                                               |
| `RichText`      | renders the canonical rich-text AST to atoms                              | 6, 11, 17, 19                                    |

## 5. How a block is built (slots, reuse, scale)

Every block follows the same three-part pattern:

1. **Compound parts** for free composition, e.g.
   `Hero.Root`, `Hero.Content`, `Hero.Media`. Developers can rearrange or
   replace any part.
2. **A data-driven default** (`<Hero {...props} />`) whose props are the
   canonical block shape from `@platform/content-model`. This is what the CMS
   renderer uses. It is just the compound parts wired together.
3. **Variants with CVA** for layout only (columns, alignment, media position),
   never colour. Colour comes from the surrounding theme class or `surface`.

Every block root is a `Section`, so every block automatically accepts
`theme`, `surface`, `spacing`, `id` and `className`. That gives page-level and
component-level theming for free and keeps blocks consistent.

Adding block 21 means: define its fields once in `@platform/content-model`,
build it from existing molecules, add stories. The CMS schema packages and the
transforms pick it up from the field definition with no per-CMS code for
ordinary fields.

## 6. Page templates

| Template   | Blocks                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Landing    | Announcement, Header, Hero (split), Logo cloud, Feature grid, Feature split ×2, Stats, Testimonials, CTA, Footer |
| Product    | Header, Hero (centered + media), Tabbed content, Feature grid, Steps, FAQ, CTA, Footer                           |
| Pricing    | Header, Hero (centered), Pricing table, Comparison table, FAQ, CTA, Footer                                       |
| Blog index | Header, Hero (centered, small), Card grid, Newsletter form, Footer                                               |
| Article    | Header, Hero (centered, small), Media, Rich text, Card grid (related), Footer                                    |
| About      | Header, Hero, Stats, Feature split, Team grid, Testimonials, CTA, Footer                                         |
| Contact    | Header, Hero (small), Contact form, FAQ, Footer                                                                  |
