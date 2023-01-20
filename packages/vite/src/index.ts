import type { Plugin, PluginOption } from "vite";
import ts from "typescript";

function parse(fileName: string, code: string): ts.SourceFile {
	return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
}

function autometrics(): Plugin {
	return {
		name: "autometrics",
		apply: "build",
		enforce: "pre",
		transform(src: string, filename: string) {

			let sourceFile = parse(filename, src);
			console.log(filename);
			console.log(sourceFile);

			return {
				code: src,
				map: { mappings: "" }
			}
		},
	};
}

export default autometrics;
