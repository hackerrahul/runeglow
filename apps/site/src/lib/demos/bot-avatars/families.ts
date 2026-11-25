/* Bot avatars come in four families. Three are one component, BotAvatar, in
   different materials; the fourth, the robot, is a component of its own.
   The docs page has a tab per family and the home page a tile per family,
   both read from here. */

export type Family = 'fabric' | 'plastic' | 'flat' | 'robot';
/** The families BotAvatar draws. */
export type SoftFamily = Exclude<Family, 'robot'>;

export interface FamilyInfo {
	id: Family;
	name: string;
	/** A few words, under the name on a tab or a tile. */
	blurb: string;
	/** A sentence, at the top of the family's own section. */
	lead: string;
	component: 'BotAvatar' | 'RobotHead';
}

export const FAMILIES: FamilyInfo[] = [
	{
		id: 'fabric',
		name: 'Fabric',
		blurb: 'Plush fur',
		lead: 'Soft toys: a pile of combed fur under a studio light, with glossy bead eyes.',
		component: 'BotAvatar'
	},
	{
		id: 'plastic',
		name: 'Plastic',
		blurb: 'Glossy, moulded',
		lead: 'The same bodies as a glossy moulded material, with a hot spot, a sheen and a window reflection.',
		component: 'BotAvatar'
	},
	{
		id: 'flat',
		name: 'Flat',
		blurb: 'Clean vector',
		lead: 'Vector bodies for small sizes and dense lists: a crisp lit rim, a soft gradient, or no lighting at all.',
		component: 'BotAvatar'
	},
	{
		id: 'robot',
		name: 'Robot',
		blurb: 'LED faces',
		lead: 'Robot heads in 3D with an LED face that shows what the agent is doing, from thinking to done.',
		component: 'RobotHead'
	}
];

export const isFamily = (value: string): value is Family => FAMILIES.some((f) => f.id === value);
