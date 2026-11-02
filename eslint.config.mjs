import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
	...nextVitals,
	...nextTs,
	globalIgnores([
		".next/**",
		"out/**",
		"next-env.d.ts",
		"SpaceViewer/**",
		"scripts/**",
	]),
	{
		rules: {
			"@next/next/no-img-element": "off", // the icons are small SVG files, which next/image does not optimise
			// older code (LocalMap zoom, useGame polling) predates these React rules: reported, to be fixed later, but not blocking
			"react-hooks/refs": "warn",
			"react-hooks/purity": "warn",
			"react-hooks/set-state-in-effect": "warn",
		},
	},
]);
