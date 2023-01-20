import { defineConfig } from 'tsup'

export default defineConfig({
	clean: true,
	sourcemap: true,
	dts: true,
	format: ["esm"],
	entry: [
		"src/index.ts",
	],
})
