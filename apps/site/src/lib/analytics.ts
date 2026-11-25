import { OpenPanel } from '@openpanel/web';
import { OPENPANEL } from './openpanel.ts';
import { SITE } from './site.ts';

const HOST = new URL(SITE.url).hostname;
let op: OpenPanel | undefined;

/**
 * Counts a page view. Browser only.
 *
 * Only the real site counts: a dev server, a local preview and the workers.dev
 * address send nothing. OpenPanel would refuse them anyway, since its allowed
 * domain is the site's.
 *
 * The SDK can watch the history itself, but that also counts every #anchor on
 * a docs page as a new view. The layout calls this after each navigation
 * instead, and the address is sent without its hash, so a page counts once.
 */
export function pageView(url: URL) {
	if (url.hostname !== HOST) return;
	// Clicks on links that leave the site are reported too, as `link_out`.
	op ??= new OpenPanel({ ...OPENPANEL, trackOutgoingLinks: true });
	op.screenView(url.origin + url.pathname + url.search);
}
