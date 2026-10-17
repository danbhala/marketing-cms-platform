import { config } from "@platform/eslint-config/base"

/** `schema/` holds generated output (a CommonJS migration and JSON); lint the generator, not its product. */
export default [...config, { ignores: ["schema/**"] }]
