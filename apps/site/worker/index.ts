// Runs in front of /r/*, the shadcn-svelte registry. The rest of the site is
// served as static files without it (see run_worker_first in wrangler.jsonc).
//
// It serves the file as usual and reports each registry item that goes out as a
// `registry_download` event, with the library's name, so OpenPanel can count
// downloads for each library.
import { OpenPanel } from '@openpanel/sdk';
import { OPENPANEL } from '../src/lib/openpanel.ts';

interface Env {
	ASSETS: { fetch(request: Request): Promise<Response> };
	/** Set with `wrangler secret put`. Without it files are served and nothing is reported. */
	OPENPANEL_CLIENT_SECRET?: string;
}
interface Context {
	waitUntil(promise: Promise<unknown>): void;
}

/** /r/border-beam.json is a library. /r/index.json is only the list of them. */
const ITEM = /^\/r\/([a-z0-9-]+)\.json$/;
/* OpenPanel trusts events sent with the secret and does not filter crawlers
   out of them, so the obvious ones are left out here. */
const CRAWLER = /bot|crawl|spider|slurp|preview|monitor|headless/i;

export default {
	async fetch(request: Request, env: Env, ctx: Context): Promise<Response> {
		const response = await env.ASSETS.fetch(request);

		const library = ITEM.exec(new URL(request.url).pathname)?.[1];
		const agent = request.headers.get('user-agent') ?? '';
		if (
			library &&
			library !== 'index' &&
			request.method === 'GET' &&
			response.status === 200 &&
			env.OPENPANEL_CLIENT_SECRET &&
			!CRAWLER.test(agent)
		) {
			// A client for each request: the two headers below belong to this caller.
			const op = new OpenPanel({ ...OPENPANEL, clientSecret: env.OPENPANEL_CLIENT_SECRET });
			// The caller's address gives the event a country, and with the user agent
			// lets OpenPanel tell one downloader from another. It stores neither.
			const ip = request.headers.get('cf-connecting-ip');
			if (ip) op.api.addHeader('x-client-ip', ip);
			if (agent) op.api.addHeader('user-agent', agent);
			// The file is already on its way; reporting never delays or fails it.
			ctx.waitUntil(op.track('registry_download', { library }));
		}

		return response;
	}
};
