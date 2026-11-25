import pkg from '../../../../packages/svelte/package.json';

export const SITE = {
	name: 'Runeglow',
	pkg: '@runeglow/svelte',
	version: pkg.version,
	tagline: 'UI effects for any framework',
	/** Where the site, and the registry under /r, are served. */
	url: 'https://runeglow.dev',
	repo: 'https://github.com/hackerrahul/runeglow' as string | null,
	npm: 'https://www.npmjs.com/package/runeglow',
	author: {
		name: 'Rahul Gangotri',
		x: 'https://x.com/rahul__gangotri',
		handle: '@rahul__gangotri',
		github: 'https://github.com/hackerrahul'
	},
	/** The author's other projects, listed in the footer. */
	projects: [
		{ name: 'betterMQ', url: 'https://bettermq.com' },
		{ name: 'GistUI', url: 'https://gistui.com' }
	],
	upstream: {
		name: 'Libraries.dev',
		url: 'https://libraries.dev',
		repo: 'https://github.com/Jakubantalik/Libraries.dev',
		author: 'Jakub Antalik'
	}
};

export type LibraryStatus = 'ready' | 'porting';

export interface Library {
	slug: string;
	name: string;
	blurb: string;
	status: LibraryStatus;
	/** Two colours that stand for the library: its icon and its catalogue card. */
	colors: [string, string];
}

export const LIBRARIES: Library[] = [
	{
		slug: 'border-beam',
		name: 'Border beam',
		blurb: 'A soft glow that rides the border',
		status: 'ready',
		colors: ['#5ab0ff', '#a06bff']
	},
	{
		slug: 'thinking-orbs',
		name: 'Thinking orbs',
		blurb: 'Orbs that think while you wait',
		status: 'ready',
		colors: ['#d9d9e3', '#8f8fa3']
	},
	{
		slug: 'bot-avatars',
		name: 'Bot avatars',
		blurb: 'Animated faces for AI agents',
		status: 'ready',
		colors: ['#ffd36b', '#ff8a4c']
	},
	{
		slug: 'liquid-gooey',
		name: 'Gooey',
		blurb: 'Pieces that merge like goo',
		status: 'ready',
		colors: ['#7bffb6', '#2ec4b6']
	},
	{
		slug: 'voice-glow',
		name: 'Voice',
		blurb: 'A glow that rises with your voice',
		status: 'ready',
		colors: ['#6bd0ff', '#9180ff']
	},
	{
		slug: 'voice-ring',
		name: 'Voice ring',
		blurb: 'Light that bends with your voice',
		status: 'ready',
		colors: ['#ff8ad1', '#9180ff']
	},
	{
		slug: 'metal-fx',
		name: 'Liquid metal',
		blurb: 'Liquid metal for buttons',
		status: 'ready',
		colors: ['#f4f4f6', '#9a9aa8']
	},
	{
		slug: 'img-fx',
		name: 'Image generation',
		blurb: 'A loader that becomes the image',
		status: 'ready',
		colors: ['#ffb86b', '#ff6f91']
	},
	{
		slug: 'distortion-waves',
		name: 'Distortion waves',
		blurb: 'A wave from one view to the next',
		status: 'ready',
		colors: ['#5cf0ff', '#7b6bff']
	}
];
