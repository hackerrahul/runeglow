import { getAudioContext, useMicrophone } from 'runeglow/voice-glow';

/* The playground's microphone. On top of `useMicrophone` it adds what a demo
   needs when the browser opens the wrong device: a list of inputs to pick
   from, and a check for an input that delivers nothing at all.

   A working microphone always has a noise floor, so its samples are never
   exactly zero for long. A device that is switched off in hardware (a
   laptop's built-in microphone with the lid closed, a muted interface) hands
   over a stream of exact zeros. When that happens the next input is tried,
   and the note under the stage says so. */

export interface MicInputDevice {
	id: string;
	label: string;
}

/** "Default - EarPods Microphone (05ac:110b)" -> "EarPods Microphone". */
export function tidyLabel(label: string): string {
	return label
		.replace(/^Default - /, '')
		.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, '')
		.trim();
}

const SILENT_AFTER = 1500;

export function createMicInput() {
	let deviceId = $state<string | null>(null);
	let devices = $state.raw<MicInputDevice[]>([]);
	let silent = $state(false);
	let switchedFrom = $state<string | null>(null);
	// Inputs already found silent this session, by label.
	const tried = new Set<string>();
	let wanted = false;

	const mic = useMicrophone({
		get constraints() {
			return deviceId ? { deviceId: { exact: deviceId } } : undefined;
		}
	});

	const label = $derived(tidyLabel(mic.stream?.getAudioTracks()[0]?.label ?? ''));

	async function refreshDevices() {
		try {
			const all = await navigator.mediaDevices.enumerateDevices();
			const seen = new Set<string>();
			const next: MicInputDevice[] = [];
			for (const d of all) {
				if (d.kind !== 'audioinput' || !d.label) continue;
				const name = tidyLabel(d.label);
				// "default" is an alias of one of the real devices.
				if (seen.has(name)) continue;
				seen.add(name);
				next.push({ id: d.deviceId, label: name });
			}
			// Prefer a real id over the alias when both name the same device.
			for (const d of all) {
				if (d.kind !== 'audioinput' || !d.label || d.deviceId === 'default') continue;
				const entry = next.find((n) => n.label === tidyLabel(d.label));
				if (entry) entry.id = d.deviceId;
			}
			devices = next;
		} catch {
			devices = [];
		}
	}

	async function open() {
		silent = false;
		mic.stop();
		const stream = await mic.start();
		if (!wanted) {
			mic.stop();
			return;
		}
		if (stream) await refreshDevices();
	}

	async function tryNext() {
		const current = label;
		if (current) tried.add(current);
		await refreshDevices();
		const next = devices.find((d) => !tried.has(d.label));
		if (!next || !wanted) {
			silent = true;
			return;
		}
		switchedFrom = switchedFrom ?? current;
		deviceId = next.id;
		await open();
	}

	// Watch the open stream for exact silence.
	$effect(() => {
		const stream = mic.stream;
		if (!stream) return;
		const ctx = getAudioContext();
		if (!ctx || stream.getAudioTracks().length === 0) return;

		const source = ctx.createMediaStreamSource(stream);
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 512;
		source.connect(analyser);
		const samples = new Float32Array(analyser.fftSize);
		let lastSound = performance.now();
		let moved = false;

		const timer = setInterval(() => {
			const now = performance.now();
			// A suspended context reads as zeros too; that is not a dead device.
			if (ctx.state !== 'running') {
				lastSound = now;
				return;
			}
			analyser.getFloatTimeDomainData(samples);
			let peak = 0;
			for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
			if (peak > 0) {
				lastSound = now;
				silent = false;
			} else if (!moved && now - lastSound > SILENT_AFTER) {
				moved = true;
				void tryNext();
			}
		}, 150);

		return () => {
			clearInterval(timer);
			try {
				source.disconnect();
			} catch {
				/* already gone */
			}
		};
	});

	$effect(() => {
		const media = navigator.mediaDevices;
		if (!media?.addEventListener) return;
		const on = () => {
			if (mic.state === 'live') void refreshDevices();
		};
		media.addEventListener('devicechange', on);
		return () => media.removeEventListener('devicechange', on);
	});

	return {
		get stream() {
			return mic.stream;
		},
		get state() {
			return mic.state;
		},
		/** The inputs the browser offers, once it has been allowed to name them. */
		get devices() {
			return devices;
		},
		/** The name of the input that is open. */
		get label() {
			return label;
		},
		/** True when no input is delivering any sound. */
		get silent() {
			return silent;
		},
		/** The input that was dropped for being silent, if one was. */
		get switchedFrom() {
			return switchedFrom;
		},
		/** Start listening. Call it from a click. */
		start() {
			wanted = true;
			tried.clear();
			switchedFrom = null;
			return open();
		},
		stop() {
			wanted = false;
			silent = false;
			mic.stop();
		},
		/** Listen on one particular input. */
		choose(id: string) {
			wanted = true;
			tried.clear();
			switchedFrom = null;
			deviceId = id;
			return open();
		}
	};
}
