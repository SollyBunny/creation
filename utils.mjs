
export function drawLine(x1, y1, x2, y2, callback) {
	const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
	if (callback(x1, y1)) return;
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
	let i = 0;
    while (x1 !== x2 || y1 !== y2) {
        let e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
		if (callback(x1, y1)) return;
		++i;
		if (i > 10) return;
    }
}

export function UI8_to_B64(uint8) {
	let binary = "";
	for (let i = 0; i < uint8.length; ++i)
		binary += String.fromCharCode(uint8[i]);
	return btoa(binary);
}
export function B64_to_UI8(base64) {
	const binary = atob(base64);
	const length = binary.length;
	const uint8 = new Uint8Array(length);
	for (let i = 0; i < length; ++i)
		uint8[i] = binary.charCodeAt(i);
	return uint8;
}

import { createNoise4D, createNoise3D } from "./noise.mjs";

export function genLooping2DNoise(width, height, scale) {
	const noise3D = createNoise3D(new Math.seedrandom(42));
	const wrapX = (v) => (v + width) % width;
	const wrapY = (v) => (v + height) % height;
	function looping2DNoise(x, y, z) {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		const x0 = wrapX(xi);
		const y0 = wrapY(yi);
		const x1 = wrapX(xi + 1);
		const y1 = wrapY(yi + 1);
		const dx = x - xi;
		const dy = y - yi;
		const v00 = noise3D(x0, y0, z);
		const v01 = noise3D(x0, y1, z);
		const v10 = noise3D(x1, y0, z);
		const v11 = noise3D(x1, y1, z);
		const wx = (3 - 2 * dx) * dx * dx;
		const wy = (3 - 2 * dy) * dy * dy;
		const vx0 = v00 * (1 - wx) + v10 * wx;
		const vx1 = v01 * (1 - wx) + v11 * wx;
		return vx0 * (1 - wy) + vx1 * wy;
	}
	function noisetonot(x) {
		return Math.floor((x + 1) * 128)
	}
	const imageData = new ImageData(width, height);
	let i = 0;
	for (let y = 0; y < height; ++y) {
		for (let x = 0; x < width; ++x) {
			imageData.data[i] = noisetonot(looping2DNoise(x / scale * 2, y / scale * 6, 0));
			imageData.data[i + 1] = noisetonot(looping2DNoise(x / scale, y / scale, 1e4));
			imageData.data[i + 2] = noisetonot(looping2DNoise(x / scale / 2, y / scale / 2, 2e4));
			imageData.data[i + 3] = noisetonot(looping2DNoise(x / scale / 3, y / scale / 3, 3e4));
			i += 4;
		}
	}
	return imageData;
}
export function genLooping2DNoiseOld(size, _, scale, radius) {
	const noise4D = createNoise4D(new Math.seedrandom(42));
	radius = radius || 1;
	scale = scale || 1;
	/*

	How this works

	1. Sample a 3D sphere from the noise function
	2. Sample the 3D sphere's surface to get a 2D noise
	3. This should loop in x and y if done right

	*/

	function sphericalToCartesian(phi, theta, r) {
		const x = r * Math.sin(phi) * Math.cos(theta);
		const y = r * Math.sin(phi) * Math.sin(theta);
		const z = r * Math.cos(phi);
		return { x, y, z };
	}
	function sphericalToCube(phi, theta, r) {
		const x = r * Math.sin(phi) * Math.cos(theta);
		const y = r * Math.sin(phi) * Math.sin(theta);
		const z = r * Math.cos(phi);
		const lambda = theta;
		const phiPrime = Math.PI / 2 - phi;
		const cubeX = x;
		const cubeY = y;
		const cubeZ = z;
		return { x: cubeX, y: cubeY, z: cubeZ };
	}
	function noisetonot(x) {
		return Math.floor((x + 1) * 128)
	}

	const r = size * radius;
	const imageData = new ImageData(size, size);
	for (let a = 0; a < size; ++a) {
		for (let b = 0; b < size; ++b) {
			const i = (a * size + b) * 4; // 4 channels: Red, Green, Blue, Alpha
			{
				let {x, y, z} = sphericalToCube(
					a / size * 2 * Math.PI,
					b / size * 2 * Math.PI,
					r
				);
				x /= scale; y /= scale; z /= scale;
				imageData.data[i] = noisetonot(noise4D(x, y, z, 1e4));
			} {
				let {x, y, z} = sphericalToCube(
					a / size * 2 * Math.PI,
					b / size * 2 * Math.PI,
					r
				);
				x /= scale * 1.2; y /= scale * 1.2; z /= scale * 1.2;
				imageData.data[i + 1] = noisetonot(noise4D(x, y, z, 2e4));
			} {
				let {x, y, z} = sphericalToCube(
					a / size * 2 * Math.PI,
					b / size * 2 * Math.PI,
					r * 2
				);
				x /= scale * 1.5; y /= scale * 2; z /= scale * 2;
				imageData.data[i + 2] = noisetonot(noise4D(x, y, z, 3e4));
			} {
				let {x, y, z} = sphericalToCube(
					a / size * 2 * Math.PI,
					b / size * 2 * Math.PI,
					r * 3
				);
				x /= scale * 1.5; y /= scale * 3; z /= scale * 3;
				imageData.data[i + 3] = noisetonot(noise4D(x, y, z, 4e4));
			}
		}
	}
	return imageData;
}

export function colorToString(color) {
	return `rgb(${color.r},${color.g},${color.b})`;
}

export function arrayDiffSerialize(data, w, h) {
	const out = [1];
	for (const index in data) {
		let value = data[index];
		out.push(
			index >> 16,
			index >> 8 & 255,
			index & 255,
			value[1]
		);
	}
	return new Uint8Array(out);
}
export function arrayDiffDeserialize(array, data, w, h) {
	for (let i = 1; i < data.length; i += 4) {
		// console.log((data[i] << 16) | (data[i + 1] << 8) | data[i + 2], data[i], data[i + 1], data[i + 2], data[i + 3]);
		const index = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
		const value = data[i + 3];
		array[index] = value;
	}
	return array;
}