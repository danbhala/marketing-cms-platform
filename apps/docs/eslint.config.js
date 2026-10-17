import { config } from "@platform/eslint-config/next"

export default [...config, { ignores: [".next/**", ".source/**", "next-env.d.ts"] }]
