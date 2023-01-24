import typescript from "rollup-plugin-typescript2";
import autometrics from "rollup-plugin-autometrics";

export default {
	input: "src/index.ts",
	output: {
		file: "dist/bundle.js",
		format: "cjs",
	},

	plugins: [autometrics(), typescript()],
};
