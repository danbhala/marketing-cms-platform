/**
 * What the Optimizely editor appends to the configured preview URL. The token
 * is a JWT valid for about five minutes; its value here is a placeholder.
 */
export const previewToken = "eyJhbGciOiJIUzI1NiJ9.preview.signature"

export const previewSearchParams = new URLSearchParams({
  key: "page-home",
  ver: "8",
  loc: "en",
  ctx: "edit",
  preview_token: previewToken,
})

export const previewModeSearchParams = new URLSearchParams({
  key: "page-home",
  ver: "8",
  loc: "en",
  ctx: "preview",
  preview_token: previewToken,
})

/** A Graph webhook body for a published document. */
export const webhookPayload = {
  timestamp: "2026-10-17T10:00:00Z",
  tenantId: "tenant-1",
  type: { subject: "doc", action: "updated" },
  data: { docId: "blk-hero_en_Published" },
}
