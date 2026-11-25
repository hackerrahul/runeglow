/* Where analytics go: a self-hosted OpenPanel. Both values are public, the
   browser sends them with every event. The client secret is not here: only the
   Worker in worker/index.ts uses it, and it is stored as a Worker secret. */
export const OPENPANEL = {
	apiUrl: 'https://opapi-afadjenqvz8mzdqspef5creh.d.websetgo.in',
	clientId: '835a555f-ba67-4d80-b59c-6cb6ff1428ab'
};
