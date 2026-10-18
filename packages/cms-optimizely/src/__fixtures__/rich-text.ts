import type { SlateRoot } from "../rich-text"

/** Slate JSON covering headings, marks, links, lists, quotes, code and images. */
export const slateSample: SlateRoot = {
  type: "richText",
  children: [
    { type: "heading-two", children: [{ text: "Why event-based analytics" }] },
    {
      type: "paragraph",
      children: [
        { text: "Page views tell you where people went. " },
        { text: "Events", bold: true },
        { text: " tell you what they did." },
      ],
    },
    {
      type: "bulleted-list",
      children: [
        { type: "list-item", children: [{ text: "Name events after what the user did." }] },
        {
          type: "list-item",
          children: [
            {
              type: "paragraph",
              children: [
                { text: "Attach properties ", italic: true },
                { text: "generously", underline: true },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "numbered-list",
      children: [
        { type: "list-item", children: [{ text: "First" }] },
        { type: "list-item", children: [{ text: "Second" }] },
      ],
    },
    {
      type: "quote",
      children: [
        {
          type: "paragraph",
          children: [{ text: "The best tracking plan is the one your team follows.", italic: true }],
        },
      ],
    },
    {
      type: "pre",
      class: "language-ts",
      children: [{ type: "code", children: [{ text: 'track("checkout_completed", {\n  plan: "growth",\n})' }] }],
    },
    {
      type: "paragraph",
      children: [
        { text: "Read the " },
        { type: "link", url: "/docs/tracking-plan", children: [{ text: "tracking plan guide" }] },
        { text: " and run " },
        { text: "track()", code: true },
        { text: ", or see the " },
        { text: "old", strikethrough: true },
        { text: " notes." },
      ],
    },
    {
      type: "image",
      url: "/globalassets/diagram.png",
      alt: "Event flow diagram",
      width: 800,
      height: 450,
      children: [{ text: "" }],
    },
    { type: "paragraph", children: [{ text: "Line one\nLine two" }] },
  ],
}

export const htmlSample = `
<h2>Why <em>event-based</em> analytics</h2>
<p>Page views tell you where people went. <strong>Events</strong> tell you what they did.<br/>Second line &amp; more.</p>
<ul>
  <li>Name events after what the user did.</li>
  <li><p>Attach properties <i>generously</i></p></li>
</ul>
<ol><li>First</li><li>Second</li></ol>
<blockquote><p>The best tracking plan is the one your team follows.</p></blockquote>
<pre class="language-ts"><code>track("checkout_completed", {
  plan: "growth",
})</code></pre>
<p>Read the <a href="/docs/tracking-plan" target="_blank">tracking plan guide</a>.</p>
<img src="/globalassets/diagram.png" alt="Event flow diagram" width="800" height="450">
<hr>
<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Starter</td><td>$0</td></tr></table>
<!-- a comment -->
<p>&lt;not a tag&gt; &#169; &#xa9;</p>
`
