import { revalidateTag } from "next/cache"

import { getAdapter } from "@/cms.config"

/**
 * /api/revalidate — one webhook endpoint for every CMS (POST; Drupal's
 * revalidator calls it with GET and query params, so GET is the same handler). The adapter
 * verifies the signature and maps the payload to cache tags; each tag is
 * revalidated with the "max" profile (stale-while-revalidate), so visitors
 * keep getting the cached page while the fresh one is built.
 */
export async function POST(request: Request) {
  const adapter = await getAdapter()
  const payload = await adapter.webhook.verify(request)
  if (payload === null) return Response.json({ ok: false, error: "Invalid signature" }, { status: 401 })

  const event = adapter.webhook.toEvent(payload)
  for (const tag of event.tags) revalidateTag(tag, "max")

  return Response.json({ ok: true, revalidated: event.tags, summary: event.summary })
}

export { POST as GET }
