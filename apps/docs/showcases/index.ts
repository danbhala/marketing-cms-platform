import { richTextFromParagraphs, type Action, type Block, type Media, type Page, type SiteSettings } from "@platform/content-model"
import { placeholderAvatar, placeholderLogo } from "@platform/content-model/fixtures"

/**
 * Six fictional brands, each a complete page on the same blocks and the same
 * components, restyled only by the CSS in `./<slug>.css`. They exist to show
 * how far variables alone can take a site; nothing here is a product.
 */

export interface Showcase {
  slug: string
  name: string
  tagline: string
  /** What the theme is going for, in one sentence. */
  idea: string
  fonts: { heading: string; body: string; mono?: string }
  radius: string
  page: Page
  settings: SiteSettings
}

/** Photos live in /public/showcases (see CREDITS.md there). */
const photo = (name: string, alt: string, width = 800, height = 600): Media => ({
  kind: "image",
  url: `/showcases/${name}.jpg`,
  alt,
  width,
  height,
})

const act = (id: string, label: string, href: string, variant: Action["variant"] = "default", icon?: string): Action => ({
  id,
  type: "action",
  label,
  href,
  variant,
  icon,
})

function settings(siteName: string, nav: string[], actions: Action[], footerNote: string): SiteSettings {
  const slug = (s: string) => `/${s.toLowerCase().replace(/\s+/g, "-")}`
  return {
    id: `site-${siteName.toLowerCase()}`,
    type: "siteSettings",
    siteName,
    navigation: nav.map((label, i) => ({ id: `${siteName}-nav-${i}`, type: "navGroup", label, href: slug(label), links: [] })),
    headerActions: actions,
    footerColumns: [
      { id: `${siteName}-fc-1`, type: "footerColumn", title: "Explore", links: nav.slice(0, 3).map((label, i) => ({ id: `${siteName}-fl-${i}`, type: "navLink", label, href: slug(label) })) },
      { id: `${siteName}-fc-2`, type: "footerColumn", title: "Company", links: ["About", "Careers", "Contact"].map((label, i) => ({ id: `${siteName}-fl-c${i}`, type: "navLink", label, href: slug(label) })) },
      { id: `${siteName}-fc-3`, type: "footerColumn", title: "Legal", links: ["Privacy", "Terms"].map((label, i) => ({ id: `${siteName}-fl-l${i}`, type: "navLink", label, href: slug(label) })) },
    ],
    footerNote,
    socialLinks: [
      { id: `${siteName}-soc-1`, type: "socialLink", platform: "instagram", href: "https://instagram.com/example" },
      { id: `${siteName}-soc-2`, type: "socialLink", platform: "x", href: "https://x.com/example" },
    ],
  }
}

const page = (id: string, title: string, blocks: Block[]): Page => ({ id, type: "page", path: "/", title, hideBreadcrumbs: true, blocks })

const logos = (names: string[]) => names.map((name, i) => ({ id: `logo-${name}-${i}`, type: "logo" as const, name, image: placeholderLogo(name) }))

const quote = (id: string, text: string, name: string, role: string) => ({
  id,
  type: "testimonial" as const,
  quote: text,
  authorName: name,
  authorRole: role,
  avatar: placeholderAvatar(name),
})

// ---------------------------------------------------------------------------

const verso: Showcase = {
  slug: "verso",
  name: "Verso",
  tagline: "An independent magazine, read slowly.",
  idea: "Editorial: a serif display face on warm paper, hairline rules, square corners and a lot of air.",
  fonts: { heading: "Fraunces", body: "Inter" },
  radius: "0.125rem",
  settings: settings("Verso", ["Issues", "Essays", "Photography", "Subscribe"], [act("verso-h1", "Sign in", "/login", "ghost"), act("verso-h2", "Subscribe", "/subscribe")], "© 2026 Verso Publishing. Printed quarterly in Porto."),
  page: page("verso-home", "Verso", [
    {
      id: "verso-hero",
      type: "hero",
      eyebrow: "Issue 14 · Autumn",
      title: "Stories that are worth your whole afternoon",
      description: "Six long reads a quarter, no feed, no notifications. Delivered in print and online to readers in 40 countries.",
      actions: [act("verso-a1", "Read the issue", "/issues/14"), act("verso-a2", "Subscribe from $8", "/subscribe", "outline")],
      media: photo("white-stairs", "A white concrete staircase in bright daylight", 1600, 800),
      layout: "split",
    },
    {
      id: "verso-cards",
      type: "cardGrid",
      eyebrow: "In this issue",
      title: "Three pieces to start with",
      cards: [
        { id: "verso-c1", type: "card", eyebrow: "Essay", title: "The quiet economics of the small town bakery", excerpt: "What one family business can teach a city about patience.", meta: "24 min read", image: photo("walker-snow", "A lone figure walking across snow", 1600, 800), href: "/essays/bakery" },
        { id: "verso-c2", type: "card", eyebrow: "Photography", title: "Concrete and light", excerpt: "A portfolio of brutalist buildings photographed at dawn.", meta: "48 images", image: photo("white-lattice", "A white latticed facade", 1600, 800), href: "/photography/concrete" },
        { id: "verso-c3", type: "card", eyebrow: "Reportage", title: "The last cartographers", excerpt: "In the Alps, a handful of people still draw maps by hand.", meta: "31 min read", image: photo("mountains", "Snow-capped mountain peaks at dusk", 1600, 1086), href: "/essays/cartographers" },
      ],
      columns: "3",
      actions: [],
    },
    {
      id: "verso-split",
      type: "featureSplit",
      eyebrow: "Why print",
      title: "A magazine that is finished when you close it",
      body: richTextFromParagraphs("Every issue is edited to be read in order, from the first page to the last. There is nothing to refresh and nothing to catch up on."),
      bullets: ["Six long reads, four photo essays", "Printed on recycled stock in Porto", "Every issue online, forever, for subscribers"],
      actions: [act("verso-a3", "See the archive", "/issues", "link", "arrow-right")],
      media: photo("walker-snow", "A lone figure walking across snow", 1600, 800),
      mediaPosition: "left",
      theme: "muted",
    },
    {
      id: "verso-stats",
      type: "stats",
      stats: [
        { id: "verso-s1", type: "stat", value: "14", label: "Issues", description: "Since spring 2023" },
        { id: "verso-s2", type: "stat", value: "40", label: "Countries", description: "With subscribers" },
        { id: "verso-s3", type: "stat", value: "0", label: "Advertisements", description: "Reader funded" },
      ],
      columns: "3",
    },
    {
      id: "verso-quote",
      type: "testimonials",
      testimonials: [quote("verso-q1", "The only thing I read cover to cover. I keep every issue on the shelf.", "Helena Marsh", "Subscriber since issue 2")],
      layout: "featured",
      theme: "muted",
    },
    { id: "verso-cta", type: "cta", title: "Subscribe to the next four issues", description: "From $8 a quarter. Cancel whenever you like, keep what you have.", actions: [act("verso-a4", "Subscribe", "/subscribe"), act("verso-a5", "Gift a subscription", "/gift", "outline")], layout: "centered", theme: "brand" },
  ]),
}

const kessler: Showcase = {
  slug: "kessler",
  name: "Kessler",
  tagline: "An architecture studio with opinions.",
  idea: "Brutalist: square corners, black hairline borders, uppercase grotesk headings, a mono eyebrow and one acid accent.",
  fonts: { heading: "Space Grotesk", body: "Space Grotesk", mono: "JetBrains Mono" },
  radius: "0",
  settings: settings("Kessler", ["Work", "Studio", "Journal", "Contact"], [act("kessler-h1", "Start a project", "/contact")], "© 2026 Kessler Studio GmbH, Berlin."),
  page: page("kessler-home", "Kessler", [
    {
      id: "kessler-hero",
      type: "hero",
      eyebrow: "Architecture · Interiors · Urbanism",
      title: "Buildings that earn their place",
      description: "A studio of twenty-two architects in Berlin and Zürich. We work on housing, public buildings and the awkward sites nobody else wants.",
      actions: [act("kessler-a1", "See the work", "/work"), act("kessler-a2", "Studio", "/studio", "outline")],
      media: photo("brick-facade", "A red brick building facade at night", 800, 600),
      layout: "splitReverse",
    },
    { id: "kessler-logos", type: "logoCloud", title: "Clients and collaborators", logos: logos(["Senat Berlin", "ETH", "Bauhaus", "DB", "Vitra"]), layout: "row", grayscale: true, spacing: "sm" },
    {
      id: "kessler-cards",
      type: "cardGrid",
      eyebrow: "Selected work",
      title: "Recent projects",
      cards: [
        { id: "kessler-c1", type: "card", eyebrow: "Housing", title: "Block 7, Lichtenberg", excerpt: "140 apartments around a shared courtyard, built in cross-laminated timber.", meta: "2025", image: photo("city-crossing", "A city crossing at night with light trails"), href: "/work/block-7" },
        { id: "kessler-c2", type: "card", eyebrow: "Public", title: "Library bridge, Zürich", excerpt: "A reading room suspended over the tracks.", meta: "2024", image: photo("rainy-street", "A wet city street under a glass bridge"), href: "/work/library-bridge" },
        { id: "kessler-c3", type: "card", eyebrow: "Interiors", title: "Kreuzberg workshop", excerpt: "A print shop turned studio, with everything that could be kept, kept.", meta: "2024", image: photo("brick-facade", "A red brick facade"), href: "/work/kreuzberg" },
      ],
      columns: "3",
      actions: [act("kessler-a3", "All projects", "/work", "ghost", "arrow-right")],
    },
    { id: "kessler-media", type: "media", media: photo("city-crossing", "A city crossing at night with light trails"), caption: "Block 7 under construction, winter 2024.", width: "full", spacing: "none" },
    {
      id: "kessler-features",
      type: "featureGrid",
      eyebrow: "How we work",
      title: "Three rules",
      features: [
        { id: "kessler-f1", type: "featureItem", icon: "ruler", title: "Measure the site twice", description: "Every project starts with a month on location before a line is drawn." },
        { id: "kessler-f2", type: "featureItem", icon: "recycle", title: "Keep what works", description: "Demolition is the last option. Most of our buildings started as another building." },
        { id: "kessler-f3", type: "featureItem", icon: "users", title: "Design in public", description: "Neighbours see the model before the planning office does." },
      ],
      columns: "3",
      itemStyle: "plain",
      theme: "muted",
    },
    {
      id: "kessler-stats",
      type: "stats",
      stats: [
        { id: "kessler-s1", type: "stat", value: "22", label: "Architects" },
        { id: "kessler-s2", type: "stat", value: "61", label: "Built projects" },
        { id: "kessler-s3", type: "stat", value: "4", label: "Awards in 2025" },
        { id: "kessler-s4", type: "stat", value: "2", label: "Studios" },
      ],
      columns: "4",
    },
    { id: "kessler-cta", type: "cta", title: "Have a difficult site?", description: "We like those. Send us the plot and we will tell you what we think, for free.", actions: [act("kessler-a4", "Start a project", "/contact")], layout: "split", theme: "brand" },
  ]),
}

const lumen: Showcase = {
  slug: "lumen",
  name: "Lumen",
  tagline: "Dark-sky travel for people who miss the stars.",
  idea: "Dark and luminous: deep indigo surfaces, an aqua primary, a violet brand band and large radii.",
  fonts: { heading: "Outfit", body: "Manrope" },
  radius: "1rem",
  settings: settings("Lumen", ["Destinations", "Trips", "Journal", "About"], [act("lumen-h1", "Sign in", "/login", "ghost"), act("lumen-h2", "Plan a trip", "/trips")], "© 2026 Lumen Travel Ltd. Registered in Reykjavík."),
  page: page("lumen-home", "Lumen", [
    {
      id: "lumen-hero",
      type: "hero",
      eyebrow: "Dark-sky travel",
      title: "Go where the night is still dark",
      description: "Small-group trips to the darkest places left on earth, timed to the new moon and led by astronomers.",
      actions: [act("lumen-a1", "Browse trips", "/trips"), act("lumen-a2", "How it works", "/about", "outline")],
      media: photo("moonrise", "A full moon rising between two mountain ridges"),
      layout: "background",
    },
    {
      id: "lumen-cards",
      type: "cardGrid",
      eyebrow: "Departures",
      title: "This winter",
      cards: [
        { id: "lumen-c1", type: "card", eyebrow: "Iceland", title: "Aurora week, Westfjords", excerpt: "Seven nights in a lodge with no neighbours for sixty kilometres.", meta: "From $3,400", image: photo("arctic-ship", "An icebreaker ship in a frozen sea"), href: "/trips/westfjords" },
        { id: "lumen-c2", type: "card", eyebrow: "Chile", title: "Atacama new moon", excerpt: "The driest sky on earth, with the observatories to prove it.", meta: "From $4,100", image: photo("turquoise-lake", "A turquoise alpine lake below a mountain"), href: "/trips/atacama" },
        { id: "lumen-c3", type: "card", eyebrow: "Norway", title: "Lofoten cabins", excerpt: "Fishing cabins under the arc of the Milky Way.", meta: "From $2,900", image: photo("cabin-lights", "Warm cabin lights in a dark interior"), href: "/trips/lofoten" },
      ],
      columns: "3",
      actions: [],
    },
    {
      id: "lumen-split",
      type: "featureSplit",
      eyebrow: "Timed to the sky",
      title: "Every trip leaves on the new moon",
      body: richTextFromParagraphs("We plan around the lunar calendar, local weather records and light-pollution maps, so the nights you travel for are the darkest of the month."),
      bullets: ["Astronomer-led, groups of eight", "Telescopes and cameras provided", "Weather-protected dates: we move the trip, not you"],
      actions: [act("lumen-a3", "See the calendar", "/trips", "link", "arrow-right")],
      media: photo("arctic-ship", "An icebreaker ship in a frozen sea"),
      mediaPosition: "right",
    },
    {
      id: "lumen-stats",
      type: "stats",
      title: "Darkness, measured",
      stats: [
        { id: "lumen-s1", type: "stat", value: "21.9", label: "Sky quality", description: "Mag/arcsec², Westfjords" },
        { id: "lumen-s2", type: "stat", value: "8", label: "Travellers", description: "Per trip, never more" },
        { id: "lumen-s3", type: "stat", value: "96%", label: "Clear nights", description: "Across 2025 departures" },
        { id: "lumen-s4", type: "stat", value: "12", label: "Dark-sky reserves", description: "Visited each year" },
      ],
      columns: "4",
      theme: "muted",
    },
    {
      id: "lumen-quotes",
      type: "testimonials",
      eyebrow: "Travellers",
      title: "What people say when they come back",
      testimonials: [
        quote("lumen-q1", "I had not seen the Milky Way since I was a child. I cried, a little.", "Ingrid Solberg", "Atacama, 2025"),
        quote("lumen-q2", "Eight of us, one astronomer, no phones. The best week of my year.", "Daniel Osei", "Westfjords, 2025"),
        quote("lumen-q3", "They moved our dates for the weather and it was absolutely the right call.", "Mei Lin", "Lofoten, 2024"),
      ],
      layout: "grid",
    },
    { id: "lumen-cta", type: "cta", title: "Next new moon: 19 November", description: "Four places left on the Westfjords departure.", actions: [act("lumen-a4", "Reserve a place", "/trips/westfjords"), act("lumen-a5", "Ask a question", "/contact", "outline")], layout: "centered", theme: "brand" },
  ]),
}

const maison: Showcase = {
  slug: "maison",
  name: "Maison Ambre",
  tagline: "Leather goods and jewellery, made in small batches.",
  idea: "Quiet luxury: Garamond headings, sage and cream surfaces, terracotta actions and a forest brand band.",
  fonts: { heading: "Cormorant Garamond", body: "Jost" },
  radius: "0.375rem",
  settings: settings("Maison Ambre", ["Collection", "Atelier", "Journal", "Stockists"], [act("maison-h1", "Account", "/account", "ghost"), act("maison-h2", "Shop", "/collection")], "© 2026 Maison Ambre SAS, Lyon."),
  page: page("maison-home", "Maison Ambre", [
    {
      id: "maison-hero",
      type: "hero",
      eyebrow: "Autumn collection",
      title: "Things you will still carry in twenty years",
      description: "Vegetable-tanned leather, recycled silver and a workshop of nine people in Lyon. Every piece is numbered.",
      actions: [act("maison-a1", "Shop the collection", "/collection"), act("maison-a2", "Visit the atelier", "/atelier", "outline")],
      media: photo("cliff-village", "A village of colourful houses on a cliff above the sea"),
      layout: "splitReverse",
    },
    {
      id: "maison-cards",
      type: "cardGrid",
      eyebrow: "The collection",
      title: "New this season",
      cards: [
        { id: "maison-c1", type: "card", title: "The Ambre watch", excerpt: "Bamboo case, tan strap, Swiss movement.", meta: "€420", image: photo("watch-bamboo", "A watch with a bamboo case and tan strap", 300, 200), href: "/collection/ambre-watch" },
        { id: "maison-c2", type: "card", title: "Envelope clutch", excerpt: "Full-grain leather, hand-stitched.", meta: "€260", image: photo("purse", "A tan leather envelope clutch", 300, 200), href: "/collection/clutch" },
        { id: "maison-c3", type: "card", title: "Nebula earrings", excerpt: "Recycled silver with hand-painted glass.", meta: "€140", image: photo("earrings", "A pair of drop earrings with galaxy-patterned stones", 300, 200), href: "/collection/nebula" },
        { id: "maison-c4", type: "card", title: "Onyx bracelet", excerpt: "Matte stone beads on silk cord.", meta: "€95", image: photo("bracelet", "A black beaded bracelet", 300, 200), href: "/collection/onyx" },
      ],
      columns: "4",
      actions: [act("maison-a3", "View all pieces", "/collection", "ghost", "arrow-right")],
    },
    {
      id: "maison-split",
      type: "featureSplit",
      eyebrow: "The atelier",
      title: "Nine people, one room, no machines you could not lift",
      body: richTextFromParagraphs("Everything is cut, stitched and finished by hand on the Quai Saint-Antoine. Visit on Fridays and watch your piece being made."),
      bullets: ["Vegetable-tanned leather from Tuscany", "Repairs for life, free of charge", "Numbered and signed by the maker"],
      actions: [act("maison-a4", "Book a visit", "/atelier", "link", "arrow-right")],
      media: photo("canal-houses", "Old canal houses at dusk"),
      mediaPosition: "left",
      theme: "muted",
    },
    {
      id: "maison-quote",
      type: "testimonials",
      testimonials: [quote("maison-q1", "I bought the clutch for my mother in 2019. She has used it every day since, and it looks better now.", "Camille Durand", "Customer, Paris")],
      layout: "featured",
    },
    { id: "maison-media", type: "media", media: photo("coast-sunset", "A coastline at sunset seen from above"), caption: "The Tuscan tannery where our hides spend six weeks in oak bark.", width: "contained", theme: "muted" },
    { id: "maison-cta", type: "cta", title: "Join the list", description: "One letter a month: new pieces, atelier days and the occasional story about leather.", actions: [act("maison-a5", "Subscribe", "/newsletter"), act("maison-a6", "Find a stockist", "/stockists", "outline")], layout: "centered", theme: "brand" },
  ]),
}

const harbor: Showcase = {
  slug: "harbor",
  name: "Harbor & Co",
  tagline: "Holiday homes on the coast, run by people who live there.",
  idea: "Warm coastal: serif display headings on sand, navy text, an ocean primary and generous rounding.",
  fonts: { heading: "DM Serif Display", body: "DM Sans" },
  radius: "1.25rem",
  settings: settings("Harbor & Co", ["Homes", "Destinations", "Owners", "Help"], [act("harbor-h1", "List your home", "/owners", "ghost"), act("harbor-h2", "Find a home", "/homes")], "© 2026 Harbor & Co. Cornwall, Brittany, Algarve."),
  page: page("harbor-home", "Harbor & Co", [
    {
      id: "harbor-hero",
      type: "hero",
      eyebrow: "Coastal stays",
      title: "Wake up to the sea",
      description: "Two hundred homes on the Atlantic coast, each visited by us before it goes online. Linen, coffee and a local number to call.",
      actions: [act("harbor-a1", "Find a home", "/homes"), act("harbor-a2", "Browse destinations", "/destinations", "outline")],
      media: photo("sea-cliffs", "Waves breaking against dark sea cliffs at sunset"),
      layout: "split",
    },
    {
      id: "harbor-steps",
      type: "steps",
      eyebrow: "How it works",
      title: "Three steps to the beach",
      steps: [
        { id: "harbor-st1", type: "step", title: "Pick a coast", description: "Cornwall, Brittany or the Algarve. Filter by walk-to-beach time." },
        { id: "harbor-st2", type: "step", title: "Book with a person", description: "Every booking is confirmed by the local host, not an algorithm." },
        { id: "harbor-st3", type: "step", title: "Arrive to a stocked kitchen", description: "Bread, milk, coffee and a map of where the locals actually go." },
      ],
      orientation: "horizontal",
    },
    {
      id: "harbor-cards",
      type: "cardGrid",
      eyebrow: "Destinations",
      title: "Where to next",
      cards: [
        { id: "harbor-c1", type: "card", eyebrow: "Algarve", title: "Under the palms", excerpt: "Forty homes within ten minutes of a beach.", meta: "From €90 a night", image: photo("palms", "Palm trees silhouetted against a sunset sky"), href: "/destinations/algarve" },
        { id: "harbor-c2", type: "card", eyebrow: "Brittany", title: "Long light, long beaches", excerpt: "Stone cottages and surf schools.", meta: "From €110 a night", image: photo("coast-sunset", "A coastline at sunset seen from above"), href: "/destinations/brittany" },
        { id: "harbor-c3", type: "card", eyebrow: "Road trips", title: "Coast to canyon", excerpt: "Two weeks, four homes, one car.", meta: "From €1,900", image: photo("canyon-road", "A road winding through a red rock canyon"), href: "/destinations/road-trips" },
      ],
      columns: "3",
      actions: [],
      theme: "muted",
    },
    {
      id: "harbor-split",
      type: "featureSplit",
      eyebrow: "For owners",
      title: "Your home, looked after like ours",
      body: richTextFromParagraphs("We photograph, list, clean and host. You get a monthly statement and a home that is in better shape than you left it."),
      bullets: ["Local hosts in every destination", "No fees until your first booking", "You choose which weeks to keep"],
      actions: [act("harbor-a3", "List your home", "/owners", "link", "arrow-right")],
      media: photo("mountains", "Snow-capped mountain peaks at dusk", 1600, 1086),
      mediaPosition: "right",
    },
    {
      id: "harbor-faq",
      type: "faq",
      eyebrow: "Good to know",
      title: "Questions people ask",
      items: [
        { id: "harbor-f1", type: "faqItem", question: "Are dogs welcome?", answer: richTextFromParagraphs("In about half of our homes. Filter by 'dogs welcome' and we will have a bowl waiting.") },
        { id: "harbor-f2", type: "faqItem", question: "What if the weather turns?", answer: richTextFromParagraphs("Every home has a shelf of board games and a list of what to do in the rain. The coast is lovely in a storm.") },
        { id: "harbor-f3", type: "faqItem", question: "Can I cancel?", answer: richTextFromParagraphs("Free up to 30 days before arrival, and we will try to rebook for you after that.") },
      ],
      layout: "split",
    },
    { id: "harbor-cta", type: "cta", title: "The sea is waiting", description: "Spring dates are open. Book early for Easter.", actions: [act("harbor-a4", "Find a home", "/homes")], layout: "centered", theme: "brand" },
  ]),
}

const nova: Showcase = {
  slug: "nova",
  name: "Nova",
  tagline: "Outdoor gear built for the worst day of the trip.",
  idea: "Bold and energetic: wide display headings, midnight text, a coral primary and a midnight brand band.",
  fonts: { heading: "Syne", body: "Instrument Sans" },
  radius: "0.75rem",
  settings: settings("Nova", ["Shop", "Expeditions", "Repairs", "Stories"], [act("nova-h1", "Account", "/account", "ghost"), act("nova-h2", "Shop now", "/shop")], "© 2026 Nova Outdoor AG, Innsbruck."),
  page: page("nova-home", "Nova", [
    {
      id: "nova-hero",
      type: "hero",
      eyebrow: "New: the Ridge shell",
      title: "Made for the day the forecast was wrong",
      description: "Shells, packs and layers tested on real expeditions, guaranteed for life and repaired in our own workshop.",
      actions: [act("nova-a1", "Shop the Ridge shell", "/shop/ridge"), act("nova-a2", "Our guarantee", "/repairs", "outline")],
      media: photo("alpine-meadow", "A golden alpine meadow below dramatic mountains"),
      layout: "background",
    },
    { id: "nova-logos", type: "logoCloud", title: "Worn by", logos: logos(["Alpine Club", "Bergwacht", "Trail Run EU", "Summit", "Nordwand"]), layout: "row", grayscale: true, spacing: "sm" },
    {
      id: "nova-features",
      type: "featureGrid",
      eyebrow: "Why Nova",
      title: "Built, tested, repaired",
      features: [
        { id: "nova-f1", type: "featureItem", icon: "mountain", title: "Expedition tested", description: "Every product spends a season with rescue teams before it goes on sale." },
        { id: "nova-f2", type: "featureItem", icon: "wrench", title: "Repaired for life", description: "Tears, zips and seams fixed free in Innsbruck, forever." },
        { id: "nova-f3", type: "featureItem", icon: "leaf", title: "Recycled shells", description: "Our fabrics are made from our own returned products." },
      ],
      columns: "3",
      itemStyle: "card",
    },
    {
      id: "nova-split",
      type: "featureSplit",
      eyebrow: "The Ridge shell",
      title: "Three layers, 310 grams, no excuses",
      body: richTextFromParagraphs("A fully taped three-layer shell with a hood that fits over a helmet and pockets you can reach with a pack on."),
      bullets: ["28,000 mm waterproof", "Pit zips, helmet hood, pack-friendly pockets", "Five colours, sizes XS to XXL"],
      actions: [act("nova-a3", "See the details", "/shop/ridge", "link", "arrow-right")],
      media: photo("turquoise-lake", "A turquoise alpine lake below a mountain"),
      mediaPosition: "left",
      theme: "muted",
    },
    {
      id: "nova-stats",
      type: "stats",
      stats: [
        { id: "nova-s1", type: "stat", value: "41k", label: "Repairs done", description: "Since 2016" },
        { id: "nova-s2", type: "stat", value: "100%", label: "Recycled shells", description: "Across the range" },
        { id: "nova-s3", type: "stat", value: "7", label: "Expeditions", description: "Supported in 2025" },
        { id: "nova-s4", type: "stat", value: "Lifetime", label: "Guarantee", description: "No receipt needed" },
      ],
      columns: "4",
    },
    {
      id: "nova-quotes",
      type: "testimonials",
      testimonials: [quote("nova-q1", "Eleven years, two repairs, still my only shell.", "Tobias Kern", "Mountain rescue, Tyrol")],
      layout: "featured",
      theme: "muted",
    },
    { id: "nova-cta", type: "cta", title: "Free shipping on the first order", description: "And free repairs on every order after that.", actions: [act("nova-a4", "Shop now", "/shop"), act("nova-a5", "Find a store", "/stores", "outline")], layout: "centered", theme: "brand" },
  ]),
}

export const showcases: Showcase[] = [verso, kessler, lumen, maison, harbor, nova]

export const findShowcase = (slug: string) => showcases.find((s) => s.slug === slug)
