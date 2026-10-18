import type { Meta, StoryObj } from "@storybook/react-vite"

import { animationDelays, animationDurations, headingAnimations } from "@platform/content-model"
import type { AnimationDelay, AnimationDuration, HeadingAnimation } from "@platform/content-model"

import { SplitText } from "./split-text"

/**
 * `SplitText` is what a block title renders through when its `headingAnimation`
 * field is set. These stories show each heading preset on its own; the
 * Blocks/Animation stories show them inside blocks. Re-select a story to replay.
 */
interface DemoProps {
  text: string
  preset: Exclude<HeadingAnimation, "none">
  duration: AnimationDuration
  delay: AnimationDelay
}

function Demo({ text, preset, duration, delay }: DemoProps) {
  return (
    <h2 aria-label={text} className="font-heading heading-style max-w-3xl text-4xl text-balance section-sm:text-5xl">
      <SplitText text={text} animation={{ preset, duration, delay }} />
    </h2>
  )
}

/** Wait for every piece to land (and the scramble to settle) so the axe run sees the finished heading. */
async function waitForText({ canvasElement }: { canvasElement: HTMLElement }) {
  const deadline = Date.now() + 6000
  const settled = () =>
    Array.from(canvasElement.querySelectorAll<HTMLElement>("[style]")).every((el) => getComputedStyle(el).opacity === "1") &&
    !canvasElement.querySelector("[data-char][style]")
  await new Promise((resolve) => setTimeout(resolve, 300))
  while (!settled() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100))
}

const meta = {
  title: "Animation/SplitText",
  component: Demo,
  play: waitForText,
  args: {
    text: "Understand what your users do, not just where they went",
    duration: "normal",
    delay: "none",
  },
  argTypes: {
    preset: { control: "select", options: headingAnimations.filter((p) => p !== "none") },
    duration: { control: "inline-radio", options: animationDurations },
    delay: { control: "inline-radio", options: animationDelays },
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Heading effects without Motion+: the title is split into words or characters in the component, lines are measured from the rendered layout, and the pieces animate with Motion variants. The heading element keeps an `aria-label` so screen readers hear one string.",
      },
    },
  },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

/** Each word rises half a line as it fades in. */
export const Words: Story = { args: { preset: "words" } }

/** One piece per letter; words stay unbreakable so lines wrap as usual. */
export const Characters: Story = { args: { preset: "characters" } }

/** Each rendered line slides up out of a clipped box, in order, and re-measures on resize. */
export const Lines: Story = { args: { preset: "lines" } }

/** Letters snap in one after another behind a caret that fades once the title is complete. */
export const Typewriter: Story = { args: { preset: "typewriter" } }

/** Letters cycle through random glyphs and settle left to right, each at its final width. */
export const Scramble: Story = { args: { preset: "scramble" } }
