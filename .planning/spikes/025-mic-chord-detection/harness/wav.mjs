// Minimal 16-bit PCM WAV reader/writer. Zero deps. Spike-grade.
import { readFileSync, writeFileSync } from 'node:fs';

/** Reads a mono or stereo 16-bit PCM WAV, returns { sampleRate, data: Float32Array (mono mixdown) }. */
export function readWavMono(path) {
	const buf = readFileSync(path);
	if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
		throw new Error(`not a RIFF/WAVE file: ${path}`);
	}
	let off = 12;
	let sampleRate = 0;
	let channels = 1;
	let bits = 16;
	let dataStart = -1;
	let dataLen = 0;
	while (off + 8 <= buf.length) {
		const id = buf.toString('ascii', off, off + 4);
		const size = buf.readUInt32LE(off + 4);
		const body = off + 8;
		if (id === 'fmt ') {
			channels = buf.readUInt16LE(body + 2);
			sampleRate = buf.readUInt32LE(body + 4);
			bits = buf.readUInt16LE(body + 14);
		} else if (id === 'data') {
			dataStart = body;
			dataLen = size;
		}
		off = body + size + (size % 2);
	}
	if (dataStart < 0) throw new Error(`no data chunk: ${path}`);
	if (bits !== 16) throw new Error(`expected 16-bit PCM, got ${bits}: ${path}`);
	const frames = Math.floor(dataLen / 2 / channels);
	const out = new Float32Array(frames);
	for (let i = 0; i < frames; i++) {
		let acc = 0;
		for (let c = 0; c < channels; c++) acc += buf.readInt16LE(dataStart + (i * channels + c) * 2) / 32768;
		out[i] = acc / channels;
	}
	return { sampleRate, data: out };
}

/** Writes a mono 16-bit PCM WAV (used only for eyeballing/listening to renders). */
export function writeWavMono(path, data, sampleRate) {
	const n = data.length;
	const buf = Buffer.alloc(44 + n * 2);
	buf.write('RIFF', 0, 'ascii');
	buf.writeUInt32LE(36 + n * 2, 4);
	buf.write('WAVE', 8, 'ascii');
	buf.write('fmt ', 12, 'ascii');
	buf.writeUInt32LE(16, 16);
	buf.writeUInt16LE(1, 20);
	buf.writeUInt16LE(1, 22);
	buf.writeUInt32LE(sampleRate, 24);
	buf.writeUInt32LE(sampleRate * 2, 28);
	buf.writeUInt16LE(2, 32);
	buf.writeUInt16LE(16, 34);
	buf.write('data', 36, 'ascii');
	buf.writeUInt32LE(n * 2, 40);
	for (let i = 0; i < n; i++) {
		const v = Math.max(-1, Math.min(1, data[i]));
		buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
	}
	writeFileSync(path, buf);
}
