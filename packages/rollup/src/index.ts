import { Plugin } from "rollup";
import replaceInSrc from "@autometricsjs/core";

export default function autometrics(): Plugin {
	return {
		name: "autometrics",
		transform: {
			order: "pre",
			handler(src: string, filename: string) {
				let newSrc = src;
				if (filename.endsWith(".ts")) {
					const result = replaceInSrc(filename, src);

					if (!result.replaced) {
						return src
					}

					newSrc = result.fileText;
					return newSrc
				}

				return {
					code: newSrc,
					map: { mappings: "" },
				};
			},
		},
	};
}
