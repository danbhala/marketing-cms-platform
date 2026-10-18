import {
  richTextFromParagraphs,
  type Page,
  type Person,
  type PricingPlan,
  type RichText,
  type Testimonial,
} from "@platform/content-model"

import { destinationCards } from "./destinations"
import { act, photo, portrait, press, quote } from "./media"

// ---------------------------------------------------------------------------
// Shared items
// ---------------------------------------------------------------------------

const guests: Testimonial[] = [
  quote(
    "q-1",
    "We went for a weekend and booked the next three before we left.",
    "Ellen Marsh",
    "Cornwall, three times",
    2
  ),
  quote(
    "q-2",
    "Ten minutes from the beach meant ten minutes. The kids were in the sea before we had unpacked.",
    "Priya Natarajan",
    "Algarve",
    1
  ),
  quote(
    "q-3",
    "The house was exactly as photographed, and the host's list of beaches was better than any guide.",
    "Tomás Herrera",
    "Brittany",
    4
  ),
  quote(
    "q-4",
    "We saw the lights on the second night from the cabin steps. Nobody slept much.",
    "Lena Fischer",
    "Lofoten",
    6
  ),
  quote(
    "q-5",
    "Someone had left bread, milk and a hand-drawn map. That is the whole company in one gesture.",
    "Marcus Oyelaran",
    "Amalfi",
    3
  ),
  quote(
    "q-6",
    "I have stopped using the big booking sites. There is a person on the phone here.",
    "Yuki Tanaka",
    "The Lakes",
    5
  ),
]

const owners: Testimonial[] = [
  quote(
    "oq-1",
    "The statement arrives on the first of the month and the house is cleaner than when I left it.",
    "Rory Penhaligon",
    "Owner, St Ives",
    7
  ),
  quote(
    "oq-2",
    "They said no to the first photographer and sent a better one. I knew then they cared.",
    "Inês Carvalho",
    "Owner, Lagos",
    8
  ),
  quote(
    "oq-3",
    "I keep August for the family and they fill the other eleven months.",
    "Anders Lund",
    "Owner, Reine",
    4
  ),
]

const team: Person[] = [
  {
    id: "p-1",
    type: "person",
    name: "Mara Thorne",
    role: "Founder",
    bio: "Grew up above a chandlery in Falmouth. Still answers the phone.",
    image: portrait(2, "Mara Thorne"),
  },
  {
    id: "p-2",
    type: "person",
    name: "Joël Kervran",
    role: "Head of Brittany",
    bio: "Sailor, oyster bore, knows every tide table by heart.",
    image: portrait(3, "Joël Kervran"),
  },
  {
    id: "p-3",
    type: "person",
    name: "Beatriz Nunes",
    role: "Head of Algarve",
    bio: "Ran a surf school in Sagres for nine years.",
    image: portrait(1, "Beatriz Nunes"),
  },
  {
    id: "p-4",
    type: "person",
    name: "Sigrid Hansen",
    role: "Head of Lofoten",
    bio: "Fourth generation on the islands. Sends the aurora texts.",
    image: portrait(5, "Sigrid Hansen"),
  },
  {
    id: "p-5",
    type: "person",
    name: "Luca Ferrante",
    role: "Head of Amalfi",
    bio: "Counts the steps so you do not have to.",
    image: portrait(4, "Luca Ferrante"),
  },
  {
    id: "p-6",
    type: "person",
    name: "Hannah Weiss",
    role: "Head of the Lakes",
    bio: "Opened our first inland coast in 2026.",
    image: portrait(6, "Hannah Weiss"),
  },
  {
    id: "p-7",
    type: "person",
    name: "Dev Raman",
    role: "Guest care",
    bio: "The voice on the local number. Has never put anyone on hold.",
    image: portrait(7, "Dev Raman"),
  },
  {
    id: "p-8",
    type: "person",
    name: "Ada Okonkwo",
    role: "Photography",
    bio: "Shoots every home in morning light, and reshoots if it rained.",
    image: portrait(8, "Ada Okonkwo"),
  },
]

const plans: PricingPlan[] = [
  {
    id: "plan-cottage",
    type: "pricingPlan",
    name: "Cottage",
    price: "€90",
    period: "/night",
    description: "Two to four people, close to the water.",
    features: [
      "Linen and towels",
      "Coffee, bread and milk on arrival",
      "A local host's number",
      "Dogs welcome in most",
    ],
    action: [act("plan-cottage-a", "See cottages", "/homes#cottages", "outline")],
  },
  {
    id: "plan-house",
    type: "pricingPlan",
    name: "House",
    price: "€160",
    period: "/night",
    description: "Room for two families, a dog and a wet-room for the boards.",
    features: [
      "Everything in Cottage",
      "Three or more bedrooms",
      "Garden or terrace",
      "Mid-week clean on stays over 7 nights",
      "Cot and high chair on request",
    ],
    action: [act("plan-house-a", "See houses", "/homes#houses")],
    highlighted: true,
    badge: "Most booked",
  },
  {
    id: "plan-villa",
    type: "pricingPlan",
    name: "Villa",
    price: "€320",
    period: "/night",
    description: "A pool, a view and a housekeeper who comes in the morning.",
    features: ["Everything in House", "Private pool", "Daily housekeeping", "A cook on request", "Airport transfer"],
    action: [act("plan-villa-a", "See villas", "/homes#villas", "outline")],
  },
]

const story: RichText = {
  type: "root",
  children: [
    { type: "heading", level: 2, children: [{ type: "text", value: "How it started" }] },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          value:
            "In 2019 Mara Thorne let out her grandmother's cottage in Mousehole for a summer and spent most of it ",
        },
        { type: "text", value: "driving over with bread", marks: ["italic"] },
        {
          type: "text",
          value:
            ". The guests kept coming back. The following year four neighbours asked her to do the same for them, and Harbor & Co was a spreadsheet, a van and a phone.",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          value:
            "The rule from the start was that every home is visited before it goes online and every coast has someone who lives there. That has not changed. It has made us slower than the big sites and, we think, better.",
        },
      ],
    },
    { type: "heading", level: 2, children: [{ type: "text", value: "What we promise" }] },
    {
      type: "list",
      ordered: false,
      children: [
        {
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "The photos are the house. Ada reshoots if it rained." }],
            },
          ],
        },
        {
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "Walk-to-water times are measured on foot, by us, with a bag." }],
            },
          ],
        },
        {
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "A local number, answered by a person, for the whole stay." }],
            },
          ],
        },
        {
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: "Owners get a statement on the first of the month and the house back in better shape.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              value:
                "A holiday home is someone's home first. We try to behave like guests of the owner, not customers of a platform.",
              marks: ["italic"],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        { type: "text", value: "If that sounds like how you would want your own home looked after, " },
        { type: "link", href: "/owners", children: [{ type: "text", value: "read about listing with us" }] },
        { type: "text", value: "." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export const homePage: Page = {
  id: "page-home",
  type: "page",
  path: "/",
  title: "Harbor & Co · Holiday homes on the coast",
  seoTitle: "Harbor & Co · Coastal holiday homes",
  seoDescription:
    "Two hundred homes on six coasts, each visited by us before it goes online. Linen, coffee and a local number to call.",
  ogImage: photo("cornwall-cove", "Atlantic waves breaking on dark rocks below a headland"),
  blocks: [
    {
      id: "home-hero",
      type: "hero",
      eyebrow: "Coastal stays",
      title: "Wake up to the sea",
      description:
        "Two hundred homes on six coasts, each visited by us before it goes online. Linen, coffee and a local number to call.",
      actions: [
        act("home-a1", "Find a home", "/homes"),
        act("home-a2", "Browse destinations", "/destinations", "outline"),
      ],
      media: photo("cornwall-cove", "Atlantic waves breaking on dark rocks below a headland"),
      layout: "split",
      scrollEffect: "parallax",
      headingAnimation: "words",
    },
    {
      id: "home-press",
      type: "logoCloud",
      title: "Written about in",
      logos: press,
      layout: "marquee",
      grayscale: true,
      spacing: "sm",
    },
    {
      id: "home-steps",
      type: "steps",
      eyebrow: "How it works",
      title: "Three steps to the beach",
      steps: [
        {
          id: "home-st1",
          type: "step",
          title: "Pick a coast",
          description: "Six to choose from. Filter by walk-to-water time, dogs, pools and steps.",
        },
        {
          id: "home-st2",
          type: "step",
          title: "Book with a person",
          description: "Every booking is confirmed by the local host, not an algorithm, usually within the hour.",
        },
        {
          id: "home-st3",
          type: "step",
          title: "Arrive to a stocked kitchen",
          description: "Bread, milk, coffee and a map of where the locals actually go.",
        },
      ],
      orientation: "horizontal",
    },
    {
      id: "home-destinations",
      type: "cardGrid",
      eyebrow: "Destinations",
      title: "Where to next",
      cards: destinationCards.slice(0, 3),
      columns: "3",
      actions: [act("home-a3", "All six coasts", "/destinations", "ghost", "arrow-right")],
      theme: "muted",
    },
    {
      id: "home-owners",
      type: "featureSplit",
      eyebrow: "For owners",
      title: "Your home, looked after like ours",
      body: richTextFromParagraphs(
        "We photograph, list, clean and host. You get a statement on the first of the month and a home that is in better shape than you left it."
      ),
      bullets: [
        "Local hosts in every destination",
        "No fees until your first booking",
        "You choose which weeks to keep",
      ],
      actions: [act("home-a4", "List your home", "/owners", "link", "arrow-right")],
      media: photo("home-shed", "A weathered wooden boathouse with a bicycle outside"),
      mediaPosition: "right",
    },
    {
      id: "home-stats",
      type: "stats",
      title: "Seven years on the coast",
      stats: [
        { id: "home-s1", type: "stat", value: "200", label: "Homes", description: "Across six coasts" },
        {
          id: "home-s2",
          type: "stat",
          value: "9 min",
          label: "To the water",
          description: "Average walk, door to sand",
        },
        { id: "home-s3", type: "stat", value: "4.9", label: "Guest rating", description: "From 11,400 stays" },
        { id: "home-s4", type: "stat", value: "68%", label: "Come back", description: "Within two years" },
      ],
      columns: "4",
      theme: "dark",
    },
    {
      id: "home-gallery",
      type: "gallery",
      eyebrow: "This week",
      title: "What the hosts photographed",
      items: [
        ["algarve-cave", "Benagil, before the boats"],
        ["lofoten-aurora", "Reine, the first lights of the season"],
        ["brittany-boardwalk", "The dunes at La Torche"],
        ["amalfi-village", "Amalfi, stacked above the sea"],
        ["lakes-jetty", "The Wolfgangsee jetty in June"],
        ["cornwall-harbour", "The harbour at high tide"],
      ].map(([name, alt], i) => ({
        id: `home-gal-${i}`,
        type: "galleryItem" as const,
        media: photo(name!, alt!),
        caption: alt!,
      })),
      layout: "strip",
      columns: "3",
      lightbox: true,
    },
    {
      id: "home-quotes",
      type: "testimonials",
      eyebrow: "Guests",
      title: "What people say when they get home",
      testimonials: guests,
      layout: "carousel",
    },
    {
      id: "home-news",
      type: "latestNews",
      eyebrow: "Journal",
      title: "New homes, new coasts and what the hosts are up to",
      source: "article",
      count: "4",
      layout: "featured",
      actions: [act("home-a5", "Read the journal", "/news", "outline")],
    },
    {
      id: "home-faq",
      type: "faq",
      eyebrow: "Good to know",
      title: "Questions people ask",
      items: [
        {
          id: "home-f1",
          type: "faqItem",
          question: "Are dogs welcome?",
          answer: richTextFromParagraphs(
            "In about half of our homes. Filter by 'dogs welcome' and we will have a bowl waiting."
          ),
        },
        {
          id: "home-f2",
          type: "faqItem",
          question: "What if the weather turns?",
          answer: richTextFromParagraphs(
            "Every home has a shelf of board games and a list of what to do in the rain. The coast is lovely in a storm."
          ),
        },
        {
          id: "home-f3",
          type: "faqItem",
          question: "Can I cancel?",
          answer: richTextFromParagraphs(
            "Free up to 30 days before arrival, and we will try to rebook for you after that."
          ),
        },
        {
          id: "home-f4",
          type: "faqItem",
          question: "Who do I call if something breaks?",
          answer: richTextFromParagraphs(
            "The local host, on the number in your welcome note. They live within twenty minutes of every home."
          ),
        },
      ],
      layout: "split",
    },
    {
      id: "home-cta",
      type: "cta",
      title: "The sea is waiting",
      description: "Spring dates are open. Book early for Easter.",
      actions: [act("home-a6", "Find a home", "/homes"), act("home-a7", "List your home", "/owners", "outline")],
      layout: "centered",
      theme: "brand",
    },
  ],
}

export const homesPage: Page = {
  id: "page-homes",
  type: "page",
  path: "/homes",
  title: "Homes",
  seoDescription: "Cottages, houses and villas on six coasts. Every one visited by us, every one with a local host.",
  blocks: [
    {
      id: "homes-hero",
      type: "hero",
      eyebrow: "Homes",
      title: "Cottages, houses and villas",
      description:
        "Three sizes, one standard. The price is the price: no cleaning fee, no service fee, no surprises at checkout.",
      actions: [act("homes-a1", "Ask a host to shortlist", "/contact", "outline")],
      media: photo("home-dining", "A bright dining room with a wooden table"),
      layout: "splitReverse",
      scrollEffect: "zoom",
      headingAnimation: "lines",
    },
    {
      id: "homes-standard",
      type: "featureGrid",
      eyebrow: "In every home",
      title: "What you can count on",
      features: [
        {
          id: "homes-ft1",
          type: "featureItem",
          icon: "bed-double",
          title: "Proper linen",
          description: "Cotton, ironed, changed weekly on longer stays.",
        },
        {
          id: "homes-ft2",
          type: "featureItem",
          icon: "coffee",
          title: "A stocked first morning",
          description: "Bread, butter, milk, coffee and something local.",
        },
        {
          id: "homes-ft3",
          type: "featureItem",
          icon: "phone",
          title: "A local number",
          description: "Answered by the host, not a call centre.",
        },
        {
          id: "homes-ft4",
          type: "featureItem",
          icon: "wifi",
          title: "Wi-Fi that works",
          description: "Tested by us with a video call from the garden.",
        },
        {
          id: "homes-ft5",
          type: "featureItem",
          icon: "map",
          title: "The host's map",
          description: "Hand-annotated. Where to swim, eat and park.",
        },
        {
          id: "homes-ft6",
          type: "featureItem",
          icon: "flame",
          title: "Heat and shade",
          description: "A wood burner in the north, shutters and air conditioning in the south.",
        },
        {
          id: "homes-ft7",
          type: "featureItem",
          icon: "baby",
          title: "Cot and high chair",
          description: "On request, at no charge, already made up.",
        },
        {
          id: "homes-ft8",
          type: "featureItem",
          icon: "key-round",
          title: "Self check-in",
          description: "A key safe and a text with the code. Arrive when the ferry does.",
        },
      ],
      columns: "4",
      itemStyle: "card",
    },
    {
      id: "homes-pricing",
      type: "pricing",
      eyebrow: "Sizes",
      title: "From a cottage for two to a villa for twelve",
      description:
        "Low-season prices. Each listing shows the exact nightly rate for your dates before you enter any details.",
      plans,
      anchor: "cottages",
    },
    {
      id: "homes-compare",
      type: "comparisonTable",
      title: "Side by side",
      columns: [
        { id: "homes-col1", type: "comparisonColumn", label: "Cottage" },
        { id: "homes-col2", type: "comparisonColumn", label: "House", highlighted: true },
        { id: "homes-col3", type: "comparisonColumn", label: "Villa" },
      ],
      rows: [
        { id: "homes-r1", type: "comparisonRow", label: "Sleeps", values: ["2–4", "5–8", "8–12"] },
        {
          id: "homes-r2",
          type: "comparisonRow",
          label: "Walk to water",
          values: ["Under 10 min", "Under 15 min", "Varies, pool on site"],
        },
        { id: "homes-r3", type: "comparisonRow", label: "Dogs welcome", values: ["yes", "yes", "no"] },
        { id: "homes-r4", type: "comparisonRow", label: "Mid-stay clean", values: ["no", "yes", "yes"] },
        { id: "homes-r5", type: "comparisonRow", label: "Private pool", values: ["no", "no", "yes"] },
        { id: "homes-r6", type: "comparisonRow", label: "Airport transfer", values: ["no", "no", "yes"] },
      ],
      anchor: "houses",
      theme: "muted",
    },
    {
      id: "homes-villas",
      type: "featureSplit",
      eyebrow: "Villas",
      title: "The twelve homes we send our own families to",
      body: richTextFromParagraphs(
        "A villa with us is not a hotel. It is someone's house, with a pool, a housekeeper who has looked after it for years and a cook who will do Sunday lunch if you ask by Thursday."
      ),
      bullets: [
        "Four in the Algarve, three in Amalfi, two in Cornwall, three on the Lakes",
        "Minimum five nights, seven in August",
        "Transfer from the airport included",
      ],
      actions: [act("homes-a2", "Ask about villas", "/contact", "link", "arrow-right")],
      media: photo("villa-pool", "A sea-water pool at night with waves breaking over the edge"),
      mediaPosition: "left",
      anchor: "villas",
    },
    {
      id: "homes-quotes",
      type: "testimonials",
      eyebrow: "Guests",
      title: "Said after checkout",
      testimonials: guests.slice(0, 3),
      layout: "grid",
    },
    {
      id: "homes-cta",
      type: "cta",
      title: "Tell us the month and who is coming",
      description: "A host will send three homes by the next morning. No account, no newsletter.",
      actions: [act("homes-a3", "Ask a host", "/contact")],
      layout: "centered",
      theme: "brand",
    },
  ],
}

export const ownersPage: Page = {
  id: "page-owners",
  type: "page",
  path: "/owners",
  title: "Owners",
  seoDescription:
    "List your coastal home with Harbor & Co. We photograph, list, clean and host; you get a statement on the first of the month.",
  blocks: [
    {
      id: "owners-hero",
      type: "hero",
      eyebrow: "For owners",
      title: "Your home, looked after like ours",
      description:
        "We photograph, list, clean and host. You keep the weeks you want and get a statement on the first of every month.",
      actions: [
        act("owners-a1", "Get a valuation", "#valuation"),
        act("owners-a2", "Read owner stories", "/news?category=owners", "outline"),
      ],
      media: photo("home-door", "A stone cottage front with a green door and window box"),
      layout: "split",
      headingAnimation: "words",
    },
    {
      id: "owners-stats",
      type: "stats",
      stats: [
        {
          id: "owners-s1",
          type: "stat",
          value: "73%",
          label: "Occupancy",
          description: "Average across the year, 2025",
        },
        {
          id: "owners-s2",
          type: "stat",
          value: "€31,000",
          label: "Typical income",
          description: "A three-bed house, after our fee",
        },
        {
          id: "owners-s3",
          type: "stat",
          value: "18%",
          label: "Our fee",
          description: "Of bookings. Nothing until the first one",
        },
        {
          id: "owners-s4",
          type: "stat",
          value: "1st",
          label: "Of the month",
          description: "When your statement arrives",
        },
      ],
      columns: "4",
      theme: "muted",
      spacing: "sm",
    },
    {
      id: "owners-steps",
      type: "steps",
      eyebrow: "How it works",
      title: "From first call to first guest",
      steps: [
        {
          id: "owners-st1",
          type: "step",
          title: "A visit",
          description:
            "The local host comes round, walks to the water with a bag and tells you honestly what the home will earn.",
        },
        {
          id: "owners-st2",
          type: "step",
          title: "Photos and a listing",
          description: "Ada shoots it in morning light. You approve every word before it goes online.",
        },
        {
          id: "owners-st3",
          type: "step",
          title: "Calendar",
          description: "Block the weeks you want. Change them any time with 60 days' notice.",
        },
        {
          id: "owners-st4",
          type: "step",
          title: "Guests",
          description: "We confirm bookings, meet, clean and handle the 2am calls. You get the statement.",
        },
      ],
      orientation: "vertical",
    },
    {
      id: "owners-care",
      type: "featureSplit",
      eyebrow: "Looking after it",
      title: "The house comes back in better shape",
      body: richTextFromParagraphs(
        "Every changeover is a 60-point inspection. Hosts fix small things on the spot and tell you about the big ones with a photo and a quote, before anyone touches it."
      ),
      bullets: [
        "A named host for your home",
        "Linen, consumables and cleaning included in the fee",
        "Damage covered up to €5,000 per stay",
      ],
      actions: [act("owners-a3", "See a sample statement", "/help#statements", "link", "arrow-right")],
      media: photo("home-linen", "Fresh bed linen and a mug of coffee in morning light"),
      mediaPosition: "right",
    },
    {
      id: "owners-honest",
      type: "featureSplit",
      eyebrow: "What we will not do",
      title: "No dynamic pricing, no fake urgency",
      body: richTextFromParagraphs(
        "We set the price with you once a year and we show guests the whole price up front. Nobody gets a 'two people are looking at this' banner, because it is your home and not a seat sale."
      ),
      bullets: [
        "A season price list you sign off",
        "No extra fees charged to guests",
        "Your home is never bundled or resold",
      ],
      actions: [],
      media: photo("welcome-map", "A hand holding a paper map"),
      mediaPosition: "left",
    },
    {
      id: "owners-quotes",
      type: "testimonials",
      eyebrow: "Owners",
      title: "From the people whose homes these are",
      testimonials: owners,
      layout: "grid",
      theme: "muted",
    },
    {
      id: "owners-form",
      type: "form",
      eyebrow: "Valuation",
      title: "What would your home earn?",
      description:
        "Tell us where it is and how big. The local host replies within two working days with a number, not a range.",
      fields: [
        { id: "owners-ff1", type: "formField", name: "name", label: "Your name", inputType: "text", required: true },
        { id: "owners-ff2", type: "formField", name: "email", label: "Email", inputType: "email", required: true },
        {
          id: "owners-ff3",
          type: "formField",
          name: "coast",
          label: "Which coast",
          inputType: "select",
          options: ["Cornwall", "Brittany", "Algarve", "Lofoten", "Amalfi", "The Lakes", "Somewhere else"],
          required: true,
        },
        {
          id: "owners-ff4",
          type: "formField",
          name: "bedrooms",
          label: "Bedrooms",
          inputType: "select",
          options: ["1", "2", "3", "4", "5 or more"],
        },
        {
          id: "owners-ff5",
          type: "formField",
          name: "notes",
          label: "Anything we should know",
          inputType: "textarea",
          placeholder: "Steps, a pool, a view, a tricky neighbour",
        },
      ],
      submitLabel: "Request a valuation",
      endpoint: "/api/forms/valuation",
      successMessage: "Thanks. Your local host will be in touch within two working days.",
      consent: "We use these details only to reply to you. No newsletter, no list.",
      layout: "stacked",
      anchor: "valuation",
    },
    {
      id: "owners-faq",
      type: "faq",
      eyebrow: "Owners ask",
      title: "The questions from the first call",
      items: [
        {
          id: "owners-f1",
          type: "faqItem",
          question: "Can I still use the house myself?",
          answer: richTextFromParagraphs(
            "As much as you like. Most owners keep three to six weeks a year, and change them with 60 days' notice."
          ),
        },
        {
          id: "owners-f2",
          type: "faqItem",
          question: "What does it cost to start?",
          answer: richTextFromParagraphs(
            "Nothing. Photography, the listing and the first inspection are on us. Our 18% comes out of bookings."
          ),
        },
        {
          id: "owners-f3",
          type: "faqItem",
          question: "Who cleans?",
          answer: richTextFromParagraphs(
            "A team the local host has worked with for years, paid properly, included in the fee."
          ),
        },
        {
          id: "owners-f4",
          type: "faqItem",
          question: "What if a guest damages something?",
          answer: richTextFromParagraphs(
            "We fix or replace it, up to €5,000 per stay, and tell you with a photo before and after."
          ),
        },
        {
          id: "owners-f5",
          type: "faqItem",
          question: "Can I leave?",
          answer: richTextFromParagraphs(
            "With 90 days' notice, honouring bookings already made. Nobody has yet, but the door is there."
          ),
        },
      ],
      layout: "single",
    },
    {
      id: "owners-cta",
      type: "cta",
      title: "Talk to the host for your coast",
      description: "A call, not a form, if you prefer. The numbers are on the contact page.",
      actions: [act("owners-a4", "Get a valuation", "#valuation"), act("owners-a5", "Contact", "/contact", "outline")],
      layout: "split",
      theme: "brand",
    },
  ],
}

export const aboutPage: Page = {
  id: "page-about",
  type: "page",
  path: "/about",
  title: "About",
  seoDescription:
    "Harbor & Co started with one cottage in Mousehole in 2019. Now two hundred homes on six coasts, each with a host who lives there.",
  blocks: [
    {
      id: "about-hero",
      type: "hero",
      eyebrow: "About",
      title: "Run by people who live on the coast",
      description: "One cottage in 2019. Two hundred homes now, and still a person on the end of the phone.",
      actions: [],
      layout: "centered",
      headingAnimation: "words",
    },
    {
      id: "about-media",
      type: "media",
      media: photo("skye-cliffs", "Green cliffs falling to the sea under a soft sky"),
      caption: "The kind of coast we look for: cliffs, a path and nobody else.",
      width: "full",
      scrollEffect: "parallax",
      spacing: "none",
    },
    { id: "about-story", type: "richText", body: story, width: "prose" },
    {
      id: "about-stats",
      type: "stats",
      stats: [
        { id: "about-s1", type: "stat", value: "2019", label: "Founded", description: "With one cottage" },
        { id: "about-s2", type: "stat", value: "6", label: "Coasts", description: "And a host on each" },
        { id: "about-s3", type: "stat", value: "38", label: "People", description: "Thirty of them on the coasts" },
        { id: "about-s4", type: "stat", value: "0", label: "Call centres", description: "Still" },
      ],
      columns: "4",
      theme: "muted",
    },
    {
      id: "about-team",
      type: "teamGrid",
      eyebrow: "The hosts",
      title: "The people who answer the phone",
      description:
        "Every coast has a head host who lives there. These are the ones whose numbers are in your welcome note.",
      people: team,
      columns: "4",
    },
    {
      id: "about-gallery",
      type: "gallery",
      eyebrow: "A year on the coasts",
      title: "From the hosts' phones",
      items: [
        ["cornwall-waves", "Cornwall, the first storm of autumn"],
        ["lofoten-snow-village", "Lofoten, February"],
        ["algarve-palms", "Algarve, the last swim of the day"],
        ["amalfi-cliffs", "Amalfi, from the ferry"],
        ["brittany-boats", "Brittany, market morning in Concarneau"],
        ["lakes-canoe", "The Lakes, June"],
        ["algarve-lifeguard", "Algarve, noon"],
        ["pier-sunset", "Brittany, under the pier at Pornic"],
      ].map(([name, alt], i) => ({
        id: `about-gal-${i}`,
        type: "galleryItem" as const,
        media: photo(name!, alt!),
        caption: alt!,
      })),
      layout: "featured",
      columns: "4",
      lightbox: true,
    },
    {
      id: "about-cta",
      type: "cta",
      eyebrow: "Work with us",
      title: "We are hiring hosts in Galicia and the Hebrides",
      description: "If you live there, know the beaches and can fix a boiler, we would like to meet you.",
      actions: [act("about-a1", "Say hello", "/contact")],
      layout: "split",
      theme: "dark",
    },
  ],
}

export const helpPage: Page = {
  id: "page-help",
  type: "page",
  path: "/help",
  title: "Help",
  seoDescription: "Booking, arriving, staying and leaving: how Harbor & Co works, in plain words.",
  blocks: [
    {
      id: "help-hero",
      type: "hero",
      eyebrow: "Help",
      title: "How it works, in plain words",
      description:
        "Most of what people ask is below. For anything else there is a person on the phone from eight until eight.",
      actions: [act("help-a1", "Contact us", "/contact", "outline")],
      layout: "centered",
      spacing: "sm",
    },
    {
      id: "help-tabs",
      type: "tabs",
      eyebrow: "The stay",
      title: "Before, during and after",
      tabs: [
        {
          id: "help-t1",
          type: "tab",
          label: "Booking",
          title: "Booking and paying",
          body: richTextFromParagraphs(
            "Pick dates, see the whole price, pay a third to confirm and the rest 30 days before you arrive. The local host confirms, usually within the hour, always within a day.",
            "Cancel free up to 30 days before arrival. After that we try to rebook the dates and refund what we recover."
          ),
          media: photo("home-coffee", "A coffee on a café table"),
        },
        {
          id: "help-t2",
          type: "tab",
          label: "Arriving",
          title: "Keys, directions and the first morning",
          body: richTextFromParagraphs(
            "A week before, you get the host's number, directions that mention the tricky turn and the key safe code. Arrive when you like; the kitchen is stocked for the first morning."
          ),
          media: photo("home-door", "A cottage front door"),
        },
        {
          id: "help-t3",
          type: "tab",
          label: "During",
          title: "If something goes wrong",
          body: richTextFromParagraphs(
            "Call the host. They live within twenty minutes of the house and have keys, a toolbox and the plumber's number. If the house cannot be fixed, we move you and pay the difference."
          ),
          media: photo("cornwall-lighthouse", "A lighthouse against a clear sky"),
        },
        {
          id: "help-t4",
          type: "tab",
          label: "Leaving",
          title: "Checkout",
          body: richTextFromParagraphs(
            "Leave by ten, leave the dishes, leave the key in the safe. We do not ask you to strip beds. If you loved it, book again before someone else does."
          ),
          media: photo("foggy-jetty", "Steps down to the water in the morning mist"),
        },
      ],
    },
    {
      id: "help-faq",
      type: "faq",
      eyebrow: "Everything else",
      title: "Frequently asked",
      items: [
        {
          id: "help-f1",
          type: "faqItem",
          question: "Is the price on the listing the whole price?",
          answer: richTextFromParagraphs(
            "Yes. No cleaning fee, service fee or booking fee is added at any point. Tourist tax, where a town charges it, is shown separately and collected by the host."
          ),
        },
        {
          id: "help-f2",
          type: "faqItem",
          question: "Do you take deposits?",
          answer: richTextFromParagraphs(
            "No. Damage is covered by us up to €5,000 per stay and we talk to you like adults about anything beyond that."
          ),
        },
        {
          id: "help-f3",
          type: "faqItem",
          question: "Can we bring a dog?",
          answer: richTextFromParagraphs(
            "In about half of our homes, marked 'dogs welcome'. Two dogs is fine. A third needs a word with the host."
          ),
        },
        {
          id: "help-f4",
          type: "faqItem",
          question: "Are there minimum stays?",
          answer: richTextFromParagraphs("Three nights most of the year, seven in July and August, five for villas."),
        },
        {
          id: "help-f5",
          type: "faqItem",
          question: "What about accessibility?",
          answer: richTextFromParagraphs(
            "Every listing counts the steps to the door and inside. Twenty-two homes are step-free; filter for them, or ask and we will check a specific one for you."
          ),
        },
        {
          id: "help-f6",
          type: "faqItem",
          question: "How do you handle my data?",
          answer: richTextFromParagraphs(
            "We keep your name, contact details and booking history to run your stays, and nothing else. We do not sell it or send newsletters you did not ask for."
          ),
        },
        {
          id: "help-f7",
          type: "faqItem",
          question: "Where are the booking terms?",
          answer: richTextFromParagraphs(
            "In the confirmation email, in full and in plain English. Two pages, no capitals."
          ),
        },
      ],
      layout: "single",
      anchor: "terms",
    },
    {
      id: "help-cta",
      type: "cta",
      title: "Still stuck?",
      description: "Eight until eight, seven days. A person, every time.",
      actions: [act("help-a2", "Contact us", "/contact"), act("help-a3", "Browse homes", "/homes", "outline")],
      layout: "split",
      theme: "muted",
    },
  ],
}

export const contactPage: Page = {
  id: "page-contact",
  type: "page",
  path: "/contact",
  title: "Contact",
  seoDescription: "Talk to a Harbor & Co host. Eight until eight, seven days a week.",
  blocks: [
    {
      id: "contact-form",
      type: "form",
      eyebrow: "Contact",
      title: "Talk to a host",
      description: "Tell us the coast, the month and who is coming. We reply the same day, with homes, not a brochure.",
      fields: [
        { id: "contact-ff1", type: "formField", name: "name", label: "Your name", inputType: "text", required: true },
        { id: "contact-ff2", type: "formField", name: "email", label: "Email", inputType: "email", required: true },
        {
          id: "contact-ff3",
          type: "formField",
          name: "phone",
          label: "Phone, if you would rather talk",
          inputType: "tel",
        },
        {
          id: "contact-ff4",
          type: "formField",
          name: "coast",
          label: "Coast",
          inputType: "select",
          options: ["Not sure yet", "Cornwall", "Brittany", "Algarve", "Lofoten", "Amalfi", "The Lakes"],
        },
        {
          id: "contact-ff5",
          type: "formField",
          name: "message",
          label: "Dates, group and anything else",
          inputType: "textarea",
          placeholder: "Two adults, two children and a spaniel, the last week of May",
          required: true,
        },
        {
          id: "contact-ff6",
          type: "formField",
          name: "consent",
          label: "You can contact me about this enquiry",
          inputType: "checkbox",
          required: true,
        },
      ],
      submitLabel: "Send",
      endpoint: "/api/forms/contact",
      successMessage: "Thanks. A host will reply today.",
      layout: "stacked",
    },
    {
      id: "contact-offices",
      type: "cardGrid",
      eyebrow: "Or come in",
      title: "Three doors on three coasts",
      cards: [
        {
          id: "contact-c1",
          type: "card",
          eyebrow: "Cornwall",
          title: "Falmouth",
          excerpt: "The chandlery on Arwenack Street, upstairs. Nine to five, Monday to Saturday.",
          meta: "+44 1326 000 000",
          image: photo("cornwall-harbour", "Harbour houses and boats"),
          href: "/destinations/cornwall",
        },
        {
          id: "contact-c2",
          type: "card",
          eyebrow: "Algarve",
          title: "Lagos",
          excerpt: "By the market, with the blue door. Ten to six, closed Sundays.",
          meta: "+351 282 000 000",
          image: photo("algarve-village", "A whitewashed terrace in Lagos"),
          href: "/destinations/algarve",
        },
        {
          id: "contact-c3",
          type: "card",
          eyebrow: "Brittany",
          title: "Concarneau",
          excerpt: "Inside the walled town, next to the bakery. Ten to six, closed Mondays.",
          meta: "+33 2 98 00 00 00",
          image: photo("brittany-boats", "A sailing boat in Concarneau harbour"),
          href: "/destinations/brittany",
        },
      ],
      columns: "3",
      actions: [],
      theme: "muted",
    },
    {
      id: "contact-faq",
      type: "faq",
      title: "Before you write",
      items: [
        {
          id: "contact-f1",
          type: "faqItem",
          question: "How fast do you reply?",
          answer: richTextFromParagraphs(
            "Same day, between eight and eight. Hosts answer their own coast, so you get someone who knows the house."
          ),
        },
        {
          id: "contact-f2",
          type: "faqItem",
          question: "Can I book over the phone?",
          answer: richTextFromParagraphs("Yes. Some people prefer it and so do we."),
        },
        {
          id: "contact-f3",
          type: "faqItem",
          question: "I own a home. Is this the right form?",
          answer: richTextFromParagraphs(
            "It works, but the valuation form on the owners page gets to the right host faster."
          ),
        },
      ],
      layout: "single",
    },
  ],
}
