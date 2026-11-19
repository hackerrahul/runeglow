import { finalizeFrame, radiusScale, type Dot, type ModeFrame } from 'runeglow/thinking-orbs';

/** A hand-written frame, to show the `frame` prop: dots on a turning spiral. */
export const spiral: ModeFrame = (size, t, o) => {
	const c = size / 2;
	const R = size * 0.42;
	const rs = radiusScale(size, 0.6);
	const n = size > 40 ? 90 : 36;
	const dots: Dot[] = [];
	for (let i = 0; i < n; i++) {
		const f = i / n;
		const a = f * Math.PI * 6 + t * 0.8;
		const z = Math.cos(a * 0.5 + t * 0.6);
		dots.push({
			x: c + Math.cos(a) * R * f,
			y: c + Math.sin(a) * R * f,
			z,
			r: (1.6 + 3.2 * f) * rs,
			white: 0.55 - 0.45 * ((z + 1) / 2)
		});
	}
	return finalizeFrame(dots, [], o.rMin);
};

export const spiralSource = `const spiral = (size, t, o) => {
  const c = size / 2, R = size * 0.42, rs = radiusScale(size, 0.6);
  const n = size > 40 ? 90 : 36;
  const dots = [];
  for (let i = 0; i < n; i++) {
    const f = i / n;
    const a = f * Math.PI * 6 + t * 0.8;
    const z = Math.cos(a * 0.5 + t * 0.6);
    dots.push({
      x: c + Math.cos(a) * R * f,
      y: c + Math.sin(a) * R * f,
      z,
      r: (1.6 + 3.2 * f) * rs,
      white: 0.55 - 0.45 * ((z + 1) / 2)
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};`;
