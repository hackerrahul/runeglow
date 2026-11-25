/* The title and description of every page, in one place. The layout turns
   these into the page's <title>, its description, and the tags that social
   previews and search engines read. A new page gets an entry here. */

export interface PageMeta {
	title: string;
	description: string;
}

export const PAGES: Record<string, PageMeta> = {
	"/": {
		title: "Runeglow: UI effects for Svelte, React and Vue",
		description:
			"Runeglow is an open source set of UI effects for Svelte, React, Vue and plain HTML: border beams, thinking orbs, liquid metal, voice glows and more. Built on Libraries.dev."
	},
	"/border-beam": {
		title: "Border beam for Svelte, React and Vue | Runeglow",
		description:
			"Border beam adds an animated glowing border to any card, button or input in Svelte, React, Vue or plain HTML: a beam that travels the edge, or a soft pulse. MIT, zero dependencies, live playground."
	},
	"/bot-avatars": {
		title: "Bot avatars for Svelte, React and Vue | Runeglow",
		description:
			"Bot avatars are animated faces for AI agents in Svelte, React, Vue and plain HTML, in four families: plush fabric, glossy plastic, flat vector, and 3D robot heads with LED faces. Drawn on a canvas. MIT."
	},
	"/distortion-waves": {
		title: "Distortion waves for Svelte, React and Vue | Runeglow",
		description:
			"Distortion waves is a view transition for Svelte, React and Vue: a coloured wave leaves a button or an icon and carries one view into another, bending the live page. MIT."
	},
	"/img-fx": {
		title: "Image generation for Svelte, React and Vue | Runeglow",
		description:
			"Image generation is a WebGL mosaic loader for cards in Svelte, React and Vue that resolves into an image, holds it and dissolves back, with reveal and regenerate controls. MIT."
	},
	"/install": {
		title: "Installation | Runeglow",
		description:
			"How to install Runeglow for Svelte, React, Vue, custom elements or plain JavaScript: one npm package per framework, with an import path per library. Svelte projects can also copy a library's source in."
	},
	"/liquid-gooey": {
		title: "Gooey for Svelte, React and Vue | Runeglow",
		description:
			"Gooey gives interfaces in Svelte, React and Vue a liquid surface: pieces that merge like goo, shapes that change like jelly, sliders that trail, cards that bend and images that melt into each other. MIT."
	},
	"/metal-fx": {
		title: "Liquid metal for Svelte, React and Vue | Runeglow",
		description:
			"Liquid metal adds an animated WebGL metal ring to buttons in Svelte, React and Vue, plus metal text and a metal badge, with glow, reflections on neighbouring elements and a cursor-driven bend. MIT."
	},
	"/thinking-orbs": {
		title: "Thinking orbs for Svelte, React and Vue | Runeglow",
		description:
			"Thinking orbs are dotted loading indicators for AI and agent interfaces in Svelte, React and Vue: nine animated states at three tuned sizes, drawn on a plain canvas. MIT, zero dependencies."
	},
	"/voice-glow": {
		title: "Voice glow for Svelte, React and Vue | Runeglow",
		description:
			"Voice glow adds a coloured beam that rises with a voice to a chat input, recording pill or mobile screen, in Svelte, React and Vue. Works from a microphone stream or a level you supply. MIT."
	},
	"/voice-ring": {
		title: "Voice ring for Svelte, React and Vue | Runeglow",
		description:
			"Voice ring is a ring of light for voice interfaces in Svelte, React and Vue. It bends with the voice, takes the colour of an emotion and leans toward the speaker. MIT."
	}
};

export const FALLBACK: PageMeta = {
	title: 'Runeglow: UI effects for Svelte, React and Vue',
	description: PAGES['/'].description
};
