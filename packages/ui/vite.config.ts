import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Shared by Storybook (react-vite) and Vitest. Tailwind runs as a Vite plugin
// here; apps use the PostCSS plugin instead. The React Compiler is enabled in
// the Next.js apps (`reactCompiler: true`), not here: Storybook and tests
// don't benefit from it and the Vite integration is still experimental.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
