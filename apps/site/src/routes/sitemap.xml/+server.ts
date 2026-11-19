import { PAGES } from '#lib/seo.ts';
import { SITE } from '#lib/site.ts';

export const prerender = true;

/* Every page in PAGES, so a new page is listed as soon as it has a title. */
export function GET() {
	const today = new Date().toISOString().slice(0, 10);
	const urls = Object.keys(PAGES)
		.map((path) => {
			const priority = path === '/' ? '1.0' : path === '/install' ? '0.9' : '0.8';
			return `\t<url><loc>${SITE.url}${path}</loc><lastmod>${today}</lastmod><priority>${priority}</priority></url>`;
		})
		.join('\n');
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	return new Response(xml, { headers: { 'content-type': 'application/xml' } });
}
