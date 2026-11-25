import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Every package is read from its source, so a change shows without a build.
const pkg = (name: string) => fileURLToPath(new URL(`../../packages/${name}/src`, import.meta.url));
export default defineConfig({
	// what the build of Vue that compiles templates asks to be told
	define: { __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false },
	resolve: {
		alias: [
			{ find: /^@runeglow\/(react|vue|elements)\/(.+)$/, replacement: `${pkg('$1')}/$2/index.ts` },
			{ find: /^runeglow\/(.+)$/, replacement: `${pkg('runeglow')}/$1/index.ts` },
			// the build of Vue that compiles the templates written in the page
			{ find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' }
		]
	}
});
