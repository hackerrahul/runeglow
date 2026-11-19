/* The title and description of every page, in one place. The layout turns
   these into the page's <title>, its description, and the tags that social
   previews and search engines read. A new page gets an entry here. */

export interface PageMeta {
	title: string;
	description: string;
}

export const PAGES: Record<string, PageMeta> = {
	"/": {
		title: "Runeglow: UI effects for Svelte",
		description:
			"Runeglow is an open source set of UI effects for Svelte 5: border beams, thinking orbs, liquid metal, voice glows and more, in one package. A port of Libraries.dev."
	},
	"/border-beam": {
		title: "Border beam for Svelte | Runeglow",
		description:
			"Border beam adds an animated glowing border to any Svelte card, button or input: a beam that travels the edge, or a soft pulse. MIT, zero dependencies, live playground."
	},
	"/bot-avatars": {
		title: "Bot avatars for Svelte | Runeglow",
		description:
			"Bot avatars are animated faces for AI agents in Svelte: twenty-one shapes, three states, five materials including plush fur and glossy plastic, drawn on a canvas. MIT."
	},
	"/distortion-waves": {
		title: "Distortion waves for Svelte | Runeglow",
		description:
			"Distortion waves is a view transition for Svelte: a coloured wave leaves a button or an icon and carries one view into another, bending the live page. MIT."
	},
	"/img-fx": {
		title: "Image generation for Svelte | Runeglow",
		description:
			"Image generation is a WebGL mosaic loader for Svelte cards that resolves into an image, holds it and dissolves back, with reveal and regenerate controls. MIT."
	},
	"/install": {
		title: "Installation | Runeglow",
		description:
			"How to install Runeglow in a Svelte 5 project: as one npm package with an import path per library, or by copying a single library's source in with the shadcn-svelte CLI."
	},
	"/liquid-gooey": {
		title: "Gooey for Svelte | Runeglow",
		description:
			"Gooey gives Svelte interfaces a liquid surface: pieces that merge like goo, shapes that change like jelly, sliders that trail, cards that bend and images that melt into each other. MIT."
	},
	"/metal-fx": {
		title: "Liquid metal for Svelte | Runeglow",
		description:
			"Liquid metal adds an animated WebGL metal ring to Svelte buttons, plus metal text and a metal badge, with glow, reflections on neighbouring elements and a cursor-driven bend. MIT."
	},
	"/thinking-orbs": {
		title: "Thinking orbs for Svelte | Runeglow",
		description:
			"Thinking orbs are dotted loading indicators for AI and agent interfaces in Svelte: nine animated states at three tuned sizes, drawn on a plain canvas. MIT, zero dependencies."
	},
	"/voice-glow": {
		title: "Voice glow for Svelte | Runeglow",
		description:
			"Voice glow adds a coloured beam that rises with a voice to a Svelte chat input, recording pill or mobile screen. Works from a microphone stream or a level you supply. MIT."
	},
	"/voice-ring": {
		title: "Voice ring for Svelte | Runeglow",
		description:
			"Voice ring is a ring of light for Svelte voice interfaces. It bends with the voice, takes the colour of an emotion and leans toward the speaker. MIT."
	}
};

export const FALLBACK: PageMeta = {
	title: 'Runeglow: UI effects for Svelte',
	description: PAGES['/'].description
};
