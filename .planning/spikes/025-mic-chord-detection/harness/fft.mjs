// Iterative radix-2 FFT, used only to convolve a room impulse response fast
// enough to run the whole grid. ~40 lines, no deps.

/** In-place complex FFT. `re`/`im` length must be a power of two. */
export function fft(re, im, inverse = false) {
	const n = re.length;
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			[re[i], re[j]] = [re[j], re[i]];
			[im[i], im[j]] = [im[j], im[i]];
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = ((inverse ? 2 : -2) * Math.PI) / len;
		const wr = Math.cos(ang);
		const wi = Math.sin(ang);
		for (let i = 0; i < n; i += len) {
			let cr = 1;
			let ci = 0;
			for (let k = 0; k < len / 2; k++) {
				const ur = re[i + k];
				const ui = im[i + k];
				const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
				const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
				re[i + k] = ur + vr;
				im[i + k] = ui + vi;
				re[i + k + len / 2] = ur - vr;
				im[i + k + len / 2] = ui - vi;
				const nr = cr * wr - ci * wi;
				ci = cr * wi + ci * wr;
				cr = nr;
			}
		}
	}
	if (inverse) for (let i = 0; i < n; i++) {
		re[i] /= n;
		im[i] /= n;
	}
}

function nextPow2(n) {
	let p = 1;
	while (p < n) p <<= 1;
	return p;
}

/** Precomputes the spectrum of an impulse response for repeated convolution. */
export function prepareIR(h, signalLen) {
	const n = nextPow2(h.length + signalLen);
	const hr = new Float64Array(n);
	const hi = new Float64Array(n);
	hr.set(h);
	fft(hr, hi);
	return { n, hr, hi, irLen: h.length };
}

/** Linear convolution of `x` with a prepared IR, truncated to x.length. */
export function convolve(x, prepared) {
	const { n, hr, hi } = prepared;
	const xr = new Float64Array(n);
	const xi = new Float64Array(n);
	xr.set(x);
	fft(xr, xi);
	for (let i = 0; i < n; i++) {
		const re = xr[i] * hr[i] - xi[i] * hi[i];
		const im = xr[i] * hi[i] + xi[i] * hr[i];
		xr[i] = re;
		xi[i] = im;
	}
	fft(xr, xi, true);
	const out = new Float32Array(x.length);
	for (let i = 0; i < x.length; i++) out[i] = xr[i];
	return out;
}
