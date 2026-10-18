import {
  richTextFromParagraphs,
  type Block,
  type Card,
  type FeatureItem,
  type GalleryItem,
  type Page,
} from "@platform/content-model"

import { act, photo, quote } from "./media"

/**
 * Six coasts. Each becomes a page under /destinations and a card on the
 * index, so the copy is written once here and the layout is the same for
 * every destination.
 */
interface Destination {
  slug: string
  name: string
  country: string
  tagline: string
  intro: string
  hero: { photo: string; alt: string }
  homes: number
  walk: string
  from: string
  season: string
  near: Array<[icon: string, title: string, text: string]>
  photos: Array<[name: string, alt: string]>
  quote: [text: string, name: string, role: string, face: number]
  faq: Array<[q: string, a: string]>
}

export const destinations: Destination[] = [
  {
    slug: "cornwall",
    name: "Cornwall",
    country: "England",
    tagline: "Granite coves, surf and a pasty for the walk back.",
    intro:
      "Our first coast and still our biggest. Fishing villages on the south, surf beaches on the north, and a coast path that joins them.",
    hero: { photo: "cornwall-cove", alt: "Atlantic waves breaking on dark rocks below a Cornish headland" },
    homes: 64,
    walk: "9 min",
    from: "€110",
    season: "All year",
    near: [
      ["waves", "Surf at Fistral", "Boards and wetsuits from the hut on the beach. Lessons at ten and two."],
      ["footprints", "The coast path", "Six hundred miles of it. Our hosts mark the stretch outside your door."],
      ["utensils", "Fish from the quay", "Buy it at four when the boats land and cook it that night."],
    ],
    photos: [
      ["cornwall-harbour", "Painted houses and rowing boats around a harbour"],
      ["cornwall-path", "The coast path above a cove at low tide"],
      ["cornwall-lighthouse", "A white lighthouse against a clear sky"],
      ["cornwall-surfer", "A surfer walking out at sunset"],
    ],
    quote: ["We went for a weekend and booked the next three before we left.", "Ellen Marsh", "Stayed in Mousehole", 2],
    faq: [
      [
        "When is the sea warm enough?",
        "Late July to September for most people. Surfers wear wetsuits and go all year.",
      ],
      ["Do I need a car?", "Not in the villages. For the north coast beaches, yes, or a very good bus timetable."],
      [
        "Which homes take dogs?",
        "About two thirds in Cornwall. Filter by 'dogs welcome' and we will leave a towel by the door.",
      ],
    ],
  },
  {
    slug: "brittany",
    name: "Brittany",
    country: "France",
    tagline: "Long light, long beaches, stone houses that stay cool.",
    intro:
      "The coast turns a corner every few miles: pink granite, pine-backed dunes, then an estuary with oyster beds. Crêpes are not optional.",
    hero: { photo: "brittany-rocks", alt: "Granite rocks on a quiet beach with islands offshore" },
    homes: 41,
    walk: "12 min",
    from: "€95",
    season: "Apr–Oct",
    near: [
      [
        "sailboat",
        "Sailing from Bénodet",
        "Half-day boats with a skipper, or a dinghy if you know what you are doing.",
      ],
      ["shell", "Oysters at Cancale", "Bought by the dozen from the market stalls and eaten on the sea wall."],
      ["bike", "The canal towpath", "Flat, shaded and car-free from Nantes to Brest. Bikes at every home."],
    ],
    photos: [
      ["brittany-boardwalk", "A boardwalk through the dunes to the sea"],
      ["brittany-boats", "A wooden sailing boat moored in the harbour"],
      ["brittany-pier", "A long wooden pier into a calm sea"],
      ["brittany-beach", "A wide, empty sand beach"],
    ],
    quote: [
      "The house was exactly as photographed, and the host's list of beaches was better than any guide.",
      "Tomás Herrera",
      "Stayed near Carnac",
      4,
    ],
    faq: [
      [
        "How do we get there?",
        "Ferry to Roscoff or St Malo with the car, or the train to Rennes and a hire car from there.",
      ],
      ["Is it very French?", "Yes. Our hosts speak English, the baker may not, and that is part of the point."],
      ["Are the beaches crowded?", "Only in August. In June and September you will often have one to yourselves."],
    ],
  },
  {
    slug: "algarve",
    name: "Algarve",
    country: "Portugal",
    tagline: "Warm sea from April to November and sunsets to set a clock by.",
    intro:
      "Whitewashed villages behind the cliffs, grilled sardines in the evening and a sea that is swimmable for most of the year.",
    hero: { photo: "algarve-cave", alt: "Turquoise water seen through a sea cave in the cliffs" },
    homes: 52,
    walk: "6 min",
    from: "€90",
    season: "All year",
    near: [
      ["sun", "Benagil by kayak", "Paddle into the cave at nine before the boats arrive."],
      ["fish", "Sardines in Portimão", "Six grilled sardines, bread and a jug of vinho verde. Twelve euros."],
      ["mountain", "The Monchique hills", "Twenty minutes inland, ten degrees cooler and cork forests all the way up."],
    ],
    photos: [
      ["algarve-sand", "Surf running up a golden beach, from above"],
      ["algarve-village", "A whitewashed terrace with a clay pot"],
      ["algarve-palms", "Palm trees against an evening sky"],
      ["algarve-lifeguard", "A lifeguard hut on an empty beach"],
    ],
    quote: [
      "Ten minutes from the beach meant ten minutes. The kids were in the sea before we had unpacked.",
      "Priya Natarajan",
      "Stayed in Carvoeiro",
      1,
    ],
    faq: [
      ["Which airport?", "Faro. Most homes are under an hour away and the hire car desks know us."],
      ["Is there air conditioning?", "In every Algarve home, plus shutters and thick walls that do most of the work."],
      [
        "Can we book for a month?",
        "Yes, and the nightly rate drops after 28 nights. Winter months are popular with people who work remotely.",
      ],
    ],
  },
  {
    slug: "lofoten",
    name: "Lofoten",
    country: "Norway",
    tagline: "Fishing cabins on stilts, mountains straight out of the sea.",
    intro:
      "Rorbuer, the red cabins where the cod fishermen slept, now with underfloor heating. Midnight sun in June, northern lights from September.",
    hero: { photo: "lofoten-fjord", alt: "A deep blue fjord between granite cliffs" },
    homes: 18,
    walk: "2 min",
    from: "€140",
    season: "May–Sep",
    near: [
      ["mountain-snow", "Reinebringen", "A steep two hours up stone steps for the view that is on every postcard."],
      [
        "fish",
        "Cod from the dock",
        "Dried on racks all around you from February. Fresh from the boat the rest of the year.",
      ],
      ["camera", "The northern lights", "From late September. Our hosts text when the forecast is good."],
    ],
    photos: [
      ["lofoten-aurora", "The northern lights over the mountains"],
      ["lofoten-snow-village", "Houses in the snow below jagged peaks"],
      ["lofoten-island", "A rock island reflected in still water"],
      ["lofoten-peaks", "Peaks and fjords from a summit"],
    ],
    quote: [
      "We saw the lights on the second night from the cabin steps. Nobody slept much.",
      "Lena Fischer",
      "Stayed in Reine",
      6,
    ],
    faq: [
      [
        "How cold is it?",
        "Milder than the latitude suggests because of the Gulf Stream. Summer days are 12 to 18 degrees.",
      ],
      [
        "Is it dark in winter?",
        "The sun does not rise from early December to early January. The lights and the blue light make up for it.",
      ],
      ["Do we need to hire a car?", "Yes. Fly to Bodø or Evenes and drive. The road is the point."],
    ],
  },
  {
    slug: "amalfi",
    name: "Amalfi",
    country: "Italy",
    tagline: "Villages stacked above the sea and lemons the size of your head.",
    intro:
      "Steps instead of streets, a bus that hugs the cliff, and dinner on a terrace that someone's grandmother built. Go in May or October.",
    hero: { photo: "amalfi-village", alt: "Painted houses stacked on a cliff above the sea" },
    homes: 14,
    walk: "15 min",
    from: "€160",
    season: "Apr–Oct",
    near: [
      ["ship", "The ferry to Capri", "Forty minutes from Amalfi. Go early, come back late."],
      [
        "citrus",
        "The lemon terraces",
        "Walk the Sentiero dei Limoni between Minori and Maiori and buy a granita at the top.",
      ],
      ["chef-hat", "Dinner in Ravello", "Up the hill, above the crowds, with the best view on the coast."],
    ],
    photos: [
      ["amalfi-cliffs", "A deep blue bay below steep cliffs"],
      ["amalfi-alley", "A narrow lane ending at the sea"],
      ["amalfi-houses", "Balconies and shutters on a village street"],
      ["amalfi-coast", "The coast road above the sea"],
    ],
    quote: [
      "Two hundred steps down to the beach and worth every one on the way back up.",
      "Marcus Oyelaran",
      "Stayed in Positano",
      3,
    ],
    faq: [
      ["Steps: how many?", "Every listing says. The fewest is 40, the most is 310, and we are honest about both."],
      [
        "Where do we park?",
        "Mostly you do not. Come by train to Salerno and ferry along the coast, and let us carry the bags.",
      ],
      [
        "Is it good with young children?",
        "With a carrier, yes. With a buggy, choose one of our three homes at street level.",
      ],
    ],
  },
  {
    slug: "lakes",
    name: "The Lakes",
    country: "Austria and Switzerland",
    tagline: "New for 2027: alpine water, cold enough to wake you up.",
    intro:
      "Our first homes away from the sea. Wooden houses on lakes you can swim across, with mountains where the beach would be.",
    hero: { photo: "lakes-jetty", alt: "A wooden jetty on a mountain lake" },
    homes: 11,
    walk: "4 min",
    from: "€120",
    season: "Jun–Sep",
    near: [
      ["waves", "Swimming from the jetty", "Every lake home has one. The water is 20 degrees by July."],
      ["cable-car", "Up the mountain", "Cable cars run all summer for the walks and all winter for the pistes."],
      ["coffee", "Cake at four", "A cultural obligation. Our hosts know which café."],
    ],
    photos: [
      ["lakes-canoe", "Paddling a canoe across a still lake"],
      ["lakes-mountains", "A lake winding between mountains"],
      ["lakes-green", "Two people fishing from a canoe"],
      ["lakes-reeds", "Reeds at the edge of a lake at dusk"],
    ],
    quote: [
      "We came for the swimming and stayed in for the storms. The thunder in that valley is something else.",
      "Yuki Tanaka",
      "Stayed on the Wolfgangsee",
      5,
    ],
    faq: [
      ["Can we ski from the house?", "From four of the eleven. The others are a ten-minute drive from a lift."],
      [
        "Is the water really that cold?",
        "In June, yes. By August the shallow lakes are warmer than Cornwall in any month.",
      ],
      ["Why lakes?", "Owners asked, guests asked, and a lake is a coast with better weather."],
    ],
  },
]

export const destinationCards: Card[] = destinations.map((d) => ({
  id: `dest-card-${d.slug}`,
  type: "card",
  eyebrow: d.country,
  title: d.name,
  excerpt: d.tagline,
  meta: `${d.homes} homes · from ${d.from} a night`,
  image: photo(d.hero.photo, d.hero.alt),
  href: `/destinations/${d.slug}`,
}))

function destinationPage(d: Destination): Page {
  const gallery: GalleryItem[] = [
    { id: `${d.slug}-g0`, type: "galleryItem", media: photo(d.hero.photo, d.hero.alt), caption: d.name },
    ...d.photos.map(([name, alt], i) => ({
      id: `${d.slug}-g${i + 1}`,
      type: "galleryItem" as const,
      media: photo(name, alt),
      caption: alt,
    })),
  ]
  const near: FeatureItem[] = d.near.map(([icon, title, description], i) => ({
    id: `${d.slug}-near-${i}`,
    type: "featureItem",
    icon,
    title,
    description,
  }))
  const blocks: Block[] = [
    {
      id: `${d.slug}-hero`,
      type: "hero",
      eyebrow: `${d.name}, ${d.country}`,
      title: d.tagline,
      description: d.intro,
      actions: [
        act(`${d.slug}-a1`, `Homes in ${d.name}`, "/homes"),
        act(`${d.slug}-a2`, "All destinations", "/destinations", "outline"),
      ],
      media: photo(d.hero.photo, d.hero.alt),
      layout: "background",
      scrollEffect: "parallax",
      headingAnimation: "words",
    },
    {
      id: `${d.slug}-stats`,
      type: "stats",
      stats: [
        {
          id: `${d.slug}-s1`,
          type: "stat",
          value: String(d.homes),
          label: "Homes",
          description: "Each visited by us before it goes online",
        },
        {
          id: `${d.slug}-s2`,
          type: "stat",
          value: d.walk,
          label: "Walk to the water",
          description: "On average, door to sand",
        },
        {
          id: `${d.slug}-s3`,
          type: "stat",
          value: d.from,
          label: "From, per night",
          description: "Low season, smallest home",
        },
        { id: `${d.slug}-s4`, type: "stat", value: d.season, label: "Season", description: "When we recommend going" },
      ],
      columns: "4",
      theme: "muted",
      spacing: "sm",
    },
    {
      id: `${d.slug}-near`,
      type: "featureGrid",
      eyebrow: "Nearby",
      title: `What our ${d.name} hosts send you to`,
      description: "Three things from the welcome note. The full list is on the fridge when you arrive.",
      features: near,
      columns: "3",
      itemStyle: "card",
    },
    {
      id: `${d.slug}-gallery`,
      type: "gallery",
      eyebrow: "Pictures",
      title: `${d.name} in five frames`,
      items: gallery,
      layout: "stage",
      columns: "4",
      lightbox: true,
      autoplay: true,
    },
    {
      id: `${d.slug}-quote`,
      type: "testimonials",
      testimonials: [quote(`${d.slug}-q`, ...d.quote)],
      layout: "featured",
      theme: "brand",
    },
    {
      id: `${d.slug}-faq`,
      type: "faq",
      eyebrow: "Good to know",
      title: `Questions about ${d.name}`,
      items: d.faq.map(([question, answer], i) => ({
        id: `${d.slug}-f${i}`,
        type: "faqItem",
        question,
        answer: richTextFromParagraphs(answer),
      })),
      layout: "split",
    },
    {
      id: `${d.slug}-news`,
      type: "latestNews",
      eyebrow: "Journal",
      title: "Latest from the coasts",
      source: "article",
      count: "3",
      layout: "list",
      actions: [],
    },
    {
      id: `${d.slug}-cta`,
      type: "cta",
      title: `Find a home in ${d.name}`,
      description: `${d.homes} to choose from. Filter by walk-to-water time, dogs and pools.`,
      actions: [
        act(`${d.slug}-a3`, "Browse homes", "/homes"),
        act(`${d.slug}-a4`, "Ask a host", "/contact", "outline"),
      ],
      layout: "split",
      theme: "dark",
    },
  ]
  return {
    id: `page-dest-${d.slug}`,
    type: "page",
    path: `/destinations/${d.slug}`,
    title: d.name,
    seoTitle: `${d.name} holiday homes · Harbor & Co`,
    seoDescription: d.tagline,
    ogImage: photo(d.hero.photo, d.hero.alt),
    blocks,
  }
}

const seasons = [
  [
    "Spring",
    "Cornwall and Brittany",
    "Empty beaches, long walks and the first swims for the brave. Easter fills up by January.",
    "brittany-boardwalk",
    "A boardwalk through spring dunes",
  ],
  [
    "Summer",
    "Algarve, Amalfi and the Lakes",
    "The sea is warm everywhere. Book the Algarve and Amalfi a year out; the Lakes still have gaps.",
    "algarve-cave",
    "Turquoise water through a sea cave",
  ],
  [
    "Autumn",
    "Algarve and Lofoten",
    "Portugal stays warm until November. Lofoten's lights season starts in late September.",
    "lofoten-aurora",
    "The northern lights over the mountains",
  ],
  [
    "Winter",
    "Cornwall, Lofoten and the Lakes",
    "Storm-watching in a cottage with a wood burner, polar night under the aurora, or skiing from the door.",
    "cornwall-waves",
    "Winter surf from above",
  ],
] as const

export const destinationsPage: Page = {
  id: "page-destinations",
  type: "page",
  path: "/destinations",
  title: "Destinations",
  seoDescription:
    "Six coasts, two hundred homes, one standard. Cornwall, Brittany, the Algarve, Lofoten, Amalfi and the Lakes.",
  blocks: [
    {
      id: "dest-hero",
      type: "hero",
      eyebrow: "Destinations",
      title: "Six coasts, one standard",
      description:
        "Every home is visited by one of us before it goes online, and every coast has a host who lives there. Pick by season, by sea temperature or by how far you want to be from an airport.",
      actions: [],
      layout: "centered",
      spacing: "sm",
      headingAnimation: "words",
    },
    {
      id: "dest-cards",
      type: "cardGrid",
      cards: destinationCards,
      columns: "3",
      actions: [],
    },
    {
      id: "dest-seasons",
      type: "tabs",
      eyebrow: "When to go",
      title: "The right coast for the month",
      tabs: seasons.map(([label, title, body, image, alt], i) => ({
        id: `season-${i}`,
        type: "tab",
        label,
        title,
        body: richTextFromParagraphs(body),
        media: photo(image, alt),
      })),
      theme: "muted",
    },
    {
      id: "dest-gallery",
      type: "gallery",
      eyebrow: "From the hosts",
      title: "Sent this month",
      description: "Hosts photograph their coast every week. These are the ones we kept.",
      items: [
        ["cornwall-arch", "Sea stacks and arches, north Cornwall"],
        ["algarve-white-village", "Whitewashed houses above the sea"],
        ["lofoten-aurora-forest", "The aurora over the trees, Lofoten"],
        ["brittany-shore", "Granite at low tide, Brittany"],
        ["amalfi-village", "A village stacked above the sea, Amalfi"],
        ["lakes-canoe", "Early paddle on the Wolfgangsee"],
        ["cornwall-lighthouse", "Godrevy lighthouse, Cornwall"],
        ["algarve-sand", "The Algarve from above"],
      ].map(([name, alt], i) => ({
        id: `dest-gal-${i}`,
        type: "galleryItem" as const,
        media: photo(name!, alt!),
        caption: alt!,
      })),
      layout: "masonry",
      columns: "4",
      lightbox: true,
    },
    {
      id: "dest-cta",
      type: "cta",
      title: "Not sure which coast?",
      description: "Tell us the month and who is coming and a host will suggest three homes by the next morning.",
      actions: [act("dest-a1", "Ask a host", "/contact"), act("dest-a2", "Browse all homes", "/homes", "outline")],
      layout: "centered",
      theme: "brand",
    },
  ],
}

export const destinationPages: Page[] = destinations.map(destinationPage)
