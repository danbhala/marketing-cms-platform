import { richTextFromParagraphs, type Article, type Category, type Page } from "@platform/content-model"

import { photo } from "./media"

/**
 * The journal: four categories and two dozen stories across a year, so the
 * listing's filters, search and pagination have something real to do.
 */
export const categories: Category[] = [
  {
    id: "cat-new-homes",
    type: "category",
    title: "New homes",
    slug: "new-homes",
    description: "Homes that went online this month.",
  },
  {
    id: "cat-destinations",
    type: "category",
    title: "Destinations",
    slug: "destinations",
    description: "Coasts, seasons and where the hosts go.",
  },
  {
    id: "cat-owners",
    type: "category",
    title: "Owners",
    slug: "owners",
    description: "Stories from the people whose homes these are.",
  },
  {
    id: "cat-company",
    type: "category",
    title: "Company",
    slug: "company",
    description: "Hiring, prices and how we work.",
  },
]

const byCategory = Object.fromEntries(categories.map((c) => [c.slug, c])) as Record<string, Category>

type Story = {
  title: string
  category: string
  date: string
  excerpt: string
  photo: [name: string, alt: string]
  body: string[]
  tags?: string[]
}

const stories: Story[] = [
  {
    title: "Spring dates are open on every coast",
    category: "company",
    date: "2026-10-14",
    excerpt: "Easter, May half-term and the June gaps are live. Cornwall and the Algarve go first, every year.",
    photo: ["cornwall-cove", "Waves on the rocks below a Cornish headland"],
    body: [
      "The spring calendar opened this morning on all six coasts. If the last three years are a guide, Easter in Cornwall and the Algarve will be gone by the end of January, Brittany by March, and the Lakes will still have a few gaps in May.",
      "Prices are the same as last spring except for the Algarve villas, which go up by about four percent because the housekeepers' wages did.",
    ],
    tags: ["destinations"],
  },
  {
    title: "Three fishing cabins in Reine",
    category: "new-homes",
    date: "2026-10-07",
    excerpt: "Red, on stilts, over the water. Underfloor heating and the best aurora view on the islands.",
    photo: ["lofoten-island", "A rock island reflected in still water"],
    body: [
      "Sigrid has been working on these three for a year. They are rorbuer, the cabins the cod fishermen slept in, owned by the same family since 1890 and rebuilt inside with underfloor heating, a proper kitchen and a window seat facing north.",
      "They sleep four, two minutes from the dock, and are already booked for most of the lights season. There is a gap in late November if you are quick.",
    ],
    tags: ["destinations"],
  },
  {
    title: "Why we count the steps",
    category: "company",
    date: "2026-09-30",
    excerpt: "Every Amalfi listing says how many steps to the door. Here is how Luca counts them and why it matters.",
    photo: ["amalfi-alley", "A narrow lane of steps ending at the sea"],
    body: [
      "Amalfi has steps instead of streets. The difference between 40 and 310 is the difference between a holiday and a training camp, so every listing on the coast says exactly how many there are from the nearest road to the front door and from the door to the beach.",
      "Luca counts them himself, with a suitcase, in August. If an owner disagrees with the number, he counts them again with the owner.",
    ],
  },
  {
    title: "Inês: 'They said no to the first photographer'",
    category: "owners",
    date: "2026-09-23",
    excerpt: "An owner in Lagos on what listing with us was like, including the bits she did not expect.",
    photo: ["camera", "A film camera held in both hands"],
    body: [
      "Inês Carvalho has let her grandmother's house in Lagos with us since 2022. We asked her to write honestly about it, and she did, including the first photographer we sent, who she thought made the kitchen look small. We agreed and sent Ada instead.",
      "'The thing nobody tells you about letting a house is that you worry. The statement on the first of the month is what stopped the worrying.'",
    ],
  },
  {
    title: "The Lakes: our first homes away from the sea",
    category: "destinations",
    date: "2026-09-16",
    excerpt: "Eleven wooden houses on lakes you can swim across, in Austria and Switzerland. Open for next summer.",
    photo: ["lakes-mountains", "A lake winding between mountains"],
    body: [
      "People asked for years and we said no, because we are a coastal company. Then Hannah spent a summer on the Wolfgangsee, swam every morning, and sent back the kind of photos that end arguments.",
      "The homes are wooden, on or close to the water, with jetties, boats and mountains where the beach would be. Four of them are ski-in in winter. Bookings open for June 2027 on 1 November.",
    ],
    tags: ["new-homes"],
  },
  {
    title: "Autumn in the Algarve",
    category: "destinations",
    date: "2026-09-09",
    excerpt: "The sea is still 22 degrees in October and the crowds have gone home. Beatriz's October list.",
    photo: ["algarve-palms", "Palm trees against an evening sky"],
    body: [
      "October is Beatriz's favourite month on her coast: the sea is warmer than June, the car parks are empty and the restaurants have time to talk. Her list for the month is the walk from Salema to Figueira, kayaking into Benagil before nine, and the Monchique chestnut festival.",
      "Houses are a third cheaper than August. Villas with pools go first because the pools are still warm.",
    ],
  },
  {
    title: "Dev Raman joins guest care",
    category: "company",
    date: "2026-09-02",
    excerpt:
      "The voice on the local number from eight until eight. He has never put anyone on hold and does not plan to start.",
    photo: ["home-cafe", "Two people talking in a bright café"],
    body: [
      "Dev ran the front desk at a hotel in Padstow for eleven years, which is how we met him: he found a guest's lost dog on a Sunday and did not mention it until Tuesday. He now answers the Cornwall line and trains the hosts on the others.",
      "His rule is that nobody should hear a menu. If the phone rings, a person picks it up.",
    ],
  },
  {
    title: "A sea-front house in Mousehole",
    category: "new-homes",
    date: "2026-08-26",
    excerpt: "Four bedrooms, a harbour view from every one of them, and the first storm of autumn included.",
    photo: ["cornwall-harbour", "Harbour houses and rowing boats"],
    body: [
      "Two doors down from the first cottage we ever let, a granite house with four bedrooms and the harbour in every window. The owners have moved up the hill and kept the boat in the harbour, which you are welcome to admire and not borrow.",
      "It sleeps eight, takes two dogs, and the storm-watching in November is the best on the coast.",
    ],
    tags: ["destinations"],
  },
  {
    title: "What a changeover actually involves",
    category: "company",
    date: "2026-08-19",
    excerpt: "Sixty points, two people and about four hours. The checklist, printed.",
    photo: ["home-linen", "Fresh linen and a mug of coffee"],
    body: [
      "Every time a guest leaves and before the next one arrives, two people go through sixty points, from the smoke alarm batteries to whether the welcome map still mentions the café that closed. It takes four hours for a cottage and most of a day for a villa.",
      "We publish the checklist because owners asked what they were paying for, and because guests who read it tend to leave the dishes, which is what we want.",
    ],
    tags: ["owners"],
  },
  {
    title: "Rory: 'I keep the house, they keep the diary'",
    category: "owners",
    date: "2026-08-12",
    excerpt: "An owner in St Ives on three years of letting, in his own words.",
    photo: ["home-door", "A cottage front door and window box"],
    body: [
      "Rory Penhaligon inherited a house in St Ives that he could not afford to keep empty and did not want to sell. He has let it with us since 2023 and keeps the first two weeks of September for the family.",
      "'The part I was dreading was strangers. It turns out strangers who get bread and a map behave like guests. I have had one broken glass in three years, and they told me.'",
    ],
  },
  {
    title: "Brittany in June: the beaches you get to yourself",
    category: "destinations",
    date: "2026-08-05",
    excerpt: "Joël's case for coming before the schools break up.",
    photo: ["brittany-beach", "A wide, empty sand beach"],
    body: [
      "Joël has lived in Finistère all his life and thinks June is the month. The light goes on until ten, the oyster beds are open, and the long beaches of the Pays Bigouden have more oystercatchers than people.",
      "The stone houses are also at their best: cool inside in a heatwave, warm enough with the fire in a wet week. June prices are low season.",
    ],
  },
  {
    title: "No cleaning fee, ever",
    category: "company",
    date: "2026-07-29",
    excerpt: "The price on the listing is the price at checkout. A short note on why that took some arguing.",
    photo: ["home-dining", "A bright dining room"],
    body: [
      "Guests told us the thing they hated most about booking anywhere was the fees that appear on the last screen. So there are none. The nightly price includes cleaning, linen, the first-morning shop and the host.",
      "It makes our nightly rate look higher than some sites until you get to their last screen. We think that is the right way round.",
    ],
  },
  {
    title: "Two villas with pools above Carvoeiro",
    category: "new-homes",
    date: "2026-07-22",
    excerpt: "Side by side, each sleeping ten, with housekeepers who have looked after them for twenty years.",
    photo: ["villa-ladder", "Pool steps looking out to sea"],
    body: [
      "Two sisters built these in the nineties and have kept them exactly as they wanted them, which means big shaded terraces, a pool each and a kitchen built for feeding twelve. The housekeepers, Rosa and Fátima, come with the houses and are the reason to book them.",
      "They take each other's overflow, so a group of twenty can have both. Minimum seven nights in summer.",
    ],
  },
  {
    title: "Lofoten's lights season starts",
    category: "destinations",
    date: "2026-07-15",
    excerpt: "From late September the sky does what it does. Sigrid explains the forecast and the texts.",
    photo: ["lofoten-aurora-forest", "Green aurora over a dark forest"],
    body: [
      "You cannot book the northern lights, but you can improve your odds: come between late September and March, stay at least four nights, and let Sigrid text you when the forecast is good. She watches the Kp index the way other people watch the football.",
      "The cabins in Reine face north over the water, with no streetlights. Most guests see something; the lucky ones see everything.",
    ],
  },
  {
    title: "We are hiring hosts in Galicia and the Hebrides",
    category: "company",
    date: "2026-07-08",
    excerpt: "Two coasts we have been asked about for years. If you live on one and know the beaches, read on.",
    photo: ["skye-cliffs", "Green cliffs above the sea"],
    body: [
      "A new coast starts with a host, not with homes. We are looking for one person in Galicia and one in the Outer Hebrides who has lived there for years, can talk to owners in their own language, and is not afraid of a blocked drain at nine on a Saturday.",
      "It is a proper job with a proper salary, a van and a phone that rings. Write to Mara directly.",
    ],
  },
  {
    title: "Anders: 'August is mine'",
    category: "owners",
    date: "2026-07-01",
    excerpt: "An owner in Reine on sharing a cabin that has been in the family for four generations.",
    photo: ["lofoten-snow-village", "Houses in the snow below jagged peaks"],
    body: [
      "Anders Lund's cabin was his great-grandfather's. The family use it every August and it was empty the rest of the year until 2024, when he listed it with us on the condition that nothing on the walls moved.",
      "'Nothing has. The guests write in the same book we do. Some of them have better handwriting.'",
    ],
  },
  {
    title: "The Amalfi ferry timetable, explained",
    category: "destinations",
    date: "2026-06-24",
    excerpt: "Luca's guide to doing the coast without a car, which is the only way to do it.",
    photo: ["amalfi-cliffs", "A deep blue bay below steep cliffs"],
    body: [
      "Do not drive. Take the train to Salerno, then the ferry: Salerno to Amalfi is 35 minutes, Amalfi to Positano another 25, and Capri is 50 from Amalfi on the fast boat. We meet the ferry and carry the bags up the steps.",
      "Luca keeps the timetable on the help page and updates it when the seasons change, which they do without warning.",
    ],
  },
  {
    title: "A lakeside boathouse on the Wolfgangsee",
    category: "new-homes",
    date: "2026-06-17",
    excerpt: "The first of the Lakes homes, and the one Hannah would keep for herself.",
    photo: ["lakes-jetty", "A wooden jetty on a mountain lake"],
    body: [
      "A boathouse with the boat still in it, a bedroom above the water and a jetty you can dive from by July. It sleeps four, is ten minutes from the village on foot, and the thunder in that valley is a reason to stay in.",
      "Bookings for June 2027 open on 1 November. There is no August availability because the owners, sensibly, keep it.",
    ],
    tags: ["destinations"],
  },
  {
    title: "Our fee is 18%. Here is where it goes",
    category: "company",
    date: "2026-06-10",
    excerpt:
      "Cleaning, linen, the first-morning shop, the host's wages and the van. Owners asked, so here is the split.",
    photo: ["gulls", "Gulls over a harbour"],
    body: [
      "Of every booking, 18% comes to us. Roughly seven points pay for the changeover, three for linen and consumables, five for the hosts and their vans, and three run the office in Falmouth, including this journal.",
      "We publish it because the alternative is owners guessing, and they guessed high.",
    ],
    tags: ["owners"],
  },
  {
    title: "Storm-watching season in Cornwall",
    category: "destinations",
    date: "2026-06-03",
    excerpt: "November to February, when the sea comes over the harbour wall and the cottage has a wood burner.",
    photo: ["cornwall-waves", "Winter surf from above"],
    body: [
      "Our quietest months on the coast are some guests' favourite. The Atlantic arrives properly from November, the coast path is empty, and the cottages in Mousehole and Porthleven have wood burners and a view of the wall taking it.",
      "Winter prices are the lowest of the year and dogs are welcome in nearly all of them.",
    ],
  },
  {
    title: "Ada on photographing a house honestly",
    category: "company",
    date: "2026-05-27",
    excerpt: "No wide-angle, no staging, morning light only. The rules behind the photos.",
    photo: ["dune-chair", "A white lifeguard chair in the dunes"],
    body: [
      "Ada shoots every home we list, and reshoots it if it rained. Her rules: a 35mm lens so rooms are the size they are, nothing moved that the guest will not find there, and morning light because that is when people decide if they like a house.",
      "If a kitchen is small, the photo says so. Guests who book anyway are the guests who leave five stars.",
    ],
  },
  {
    title: "A stone longère near Carnac",
    category: "new-homes",
    date: "2026-05-20",
    excerpt: "A long Breton farmhouse, three bedrooms, a walled garden and the standing stones at the end of the lane.",
    photo: ["brittany-shore", "Granite rocks at low tide"],
    body: [
      "A longère is the Breton farmhouse: one room deep, very long, with the animals at one end a century ago and a kitchen there now. This one has a walled garden, a wood store and the Carnac alignments a ten-minute walk away.",
      "Twelve minutes to the beach at Saint-Colomban, bikes in the barn, two dogs welcome.",
    ],
    tags: ["destinations"],
  },
  {
    title: "What the welcome map is for",
    category: "company",
    date: "2026-05-13",
    excerpt: "Hand-drawn by the host, updated every season. The one thing guests mention more than the view.",
    photo: ["welcome-map", "A hand holding a paper map"],
    body: [
      "Every home has one on the fridge: a hand-drawn map of the five-minute radius, with where to swim at low tide, which café does the good bread and where to park on a Saturday. Hosts redraw it every spring.",
      "Guests mention the map in reviews more than any other single thing. It costs us a felt-tip.",
    ],
  },
  {
    title: "Step-free homes: the list",
    category: "company",
    date: "2026-05-06",
    excerpt: "Twenty-two homes with no steps from the car to the bed. Counted by us, not by the listing software.",
    photo: ["beach-walk", "A father carrying his child along a beach path"],
    body: [
      "Twenty-two of our homes are step-free from where you park to the bedroom and bathroom. We checked each one on foot and the list is maintained by Dev, who also knows which of the others have one manageable step and which have three.",
      "If a listing says step-free, it is. If it is close, ask, and we will tell you precisely.",
    ],
  },
]

export const articles: Article[] = stories.map((s, i) => {
  const slug = s.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  const term = byCategory[s.category]!
  const [name, alt] = s.photo
  return {
    id: `article-${i + 1}`,
    type: "article",
    title: s.title,
    path: `/news/${slug}`,
    publishedAt: s.date,
    excerpt: s.excerpt,
    image: photo(name, alt),
    category: term,
    tags: (s.tags ?? []).map((t) => byCategory[t]!),
    body: richTextFromParagraphs(...s.body),
    blocks: [],
    seoDescription: s.excerpt,
  }
})

export const newsPage: Page = {
  id: "page-news",
  type: "page",
  path: "/news",
  title: "Journal",
  seoDescription: "New homes, new coasts and what the hosts are up to.",
  blocks: [
    {
      id: "news-hero",
      type: "hero",
      eyebrow: "Journal",
      title: "New homes, new coasts and what the hosts are up to",
      description: "Written by the people on the coasts, roughly once a week.",
      actions: [],
      layout: "centered",
      spacing: "sm",
    },
    {
      id: "news-collection",
      type: "collection",
      source: "article",
      layout: "featured",
      pageSize: 10,
      filters: "category",
      search: true,
      sort: "newest",
      emptyMessage: "Nothing matches those filters yet.",
    },
  ],
}
