import { defineConfig } from "orval";

const OPENAPI_FILE = "./server/openapi.json";
const OUTPUT_DIR = "./lib/api/generated";

export default defineConfig({
	spacegame: {
		input: OPENAPI_FILE,
		output: {
			target: `${OUTPUT_DIR}/api.ts`,
			schemas: `${OUTPUT_DIR}/model`,
			client: "react-query",
			mode: "split",
			clean: true,
			override: {
				mutator: { path: "./lib/api/client.ts", name: "apiFetch" },
			},
		},
	},
	spacegameZod: {
		input: OPENAPI_FILE,
		output: {
			target: `${OUTPUT_DIR}/zod`,
			client: "zod",
			mode: "tags-split",
			fileExtension: ".zod.ts",
		},
	},
});
