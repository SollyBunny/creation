
import { colorToString, genLooping2DNoise } from "./utils.mjs";
import { COLLIDENONE, COLLIDESOLID, COLLIDELIQUID, COLLIDEPLATFORM, FLUIDNONE, FLUIDSAND, FLUIDLIQUID } from "./consts.mjs";

export function collidesBoxBox(a, b) {
	return (Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) * 2 < (a.w + b.w)) && (Math.abs((a.y + a.h / 2) - (b.y + b.h / 2)) * 2 < (a.h + b.h));
}
export function collidesBoxTilemap(box, tilemap) {
	let collideTypeBack = false;
	let fire = false;
	const out = {};
	for (let x = Math.floor(box.x - box.w); x < box.x + box.w; ++x) {
		for (let y = Math.floor(box.y - box.h); y < box.y + box.h; ++y) {
			const id = tilemap.getTile(x, y);
			const material = materials[id];
			const collideType = material.collide;
			if (material.fire) out.fire = true;
			if (collideType === COLLIDENONE) continue;
			const collision = collidesBoxBox(box, {
				x: x, y: y,
				w: 1, h: 1
			});
			if (!collision) continue;
			if (collideType === COLLIDESOLID) return COLLIDESOLID;
			if (collideType > collideTypeBack)
				collideTypeBack = collideType;
		}
	}
	return collideTypeBack;
	// return {
	// 	type: collideTypeBack,
	// 	fire: fire
	// };
}
export function collides(a, b) {
	// this is really dumb and must be hardcoded, but whatevs
	if (a.collideType === "box" && b.collideType === "tilemap")
		return collidesBoxTilemap(a, b);
}

export const things = new Set();

export class Thing {
	constructor() {}
	add() {
		things.add(this);
	}
	del() {
		things.delete(this);
	}
}

import { TilemapBase } from "./tilemapbase.mjs";

export class Tilemap extends TilemapBase {
	static deserialize(data) {
		return super.deserialize(data, Tilemap);
	}
	constructor(w, h) {
		super(w, h);
		// webgl stuff
		const wgl = {};
		wgl.ctx = canwgl.getContext("webgl");
		this.wgl = wgl;
		// Vert shader
		const vertShader = wgl.ctx.createShader(wgl.ctx.VERTEX_SHADER);
		wgl.ctx.shaderSource(vertShader, `attribute vec4 position; void main() { gl_Position = position; }`);
		wgl.ctx.compileShader(vertShader);
		// Frag shader
		const fragmentShaderCode = `//#version 300 es

precision mediump float;

const vec2 noiseSize = vec2(${this.w}.0, ${this.h}.0);
const vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
const vec4 white = vec4(1.0, 1.0, 1.0, 0.0);

uniform sampler2D noise;
uniform sampler2D tilemap;

uniform vec2 resolution;
uniform vec2 size;
uniform float time;
uniform vec3 camera;

void main() {
	// Get pos in world space
	vec2 raw;
	raw.x = (gl_FragCoord.x - (resolution.x / 2.0)) / camera.z + camera.x, size.x;
	raw.y = ((resolution.y - gl_FragCoord.y) - (resolution.y / 2.0)) / camera.z + camera.y, size.y;
	raw.x = mod(mod(raw.x, size.x) + size.x, size.x);
	raw.y = mod(mod(raw.y, size.y) + size.y, size.y);
	vec2 pos = floor(raw);
	vec2 off = mod(raw, 1.0);

	float tile = texture2D(tilemap, pos / size).r;
	tile = mod(tile, 16.0 / 256.0);
	// gl_FragColor = vec4(tile * 255.0 / 8.0, 0, 0, 1); return;
	
	${materials.map((material, id) => {
		let out = ` if (abs(tile - ${(id / 255).toFixed(100).replace(/0+$/, "")}) < 0.003) {`;
		if (material.shader) {
			out += `${material.shader};return;`;
		} else {
			out += `gl_FragColor = vec4(${material.color.r / 255},${material.color.g / 255},${material.color.b / 255},1);return;`;
		}
		return out;
	}).join("} else ")} } else {
		discard;
	}
}
`;
		const fragShader = wgl.ctx.createShader(wgl.ctx.FRAGMENT_SHADER);
		wgl.ctx.shaderSource(fragShader, fragmentShaderCode);
		wgl.ctx.compileShader(fragShader);
		if (!wgl.ctx.getShaderParameter(fragShader, wgl.ctx.COMPILE_STATUS)) {
			console.log(fragmentShaderCode.split("\n").map((line, i) => `${i}: ${line}`).join("\n"));
			console.log(this, this.w, this.h)
			console.error("Frag shader compilation error:", wgl.ctx.getShaderInfoLog(fragShader));
			return;
		}
		// Program
		wgl.prog = wgl.ctx.createProgram();
		wgl.ctx.attachShader(wgl.prog, vertShader);
		wgl.ctx.attachShader(wgl.prog, fragShader);
		wgl.ctx.linkProgram(wgl.prog);
		wgl.ctx.useProgram(wgl.prog);
		// Bind other stuff
		wgl.locRes = wgl.ctx.getUniformLocation(wgl.prog, "resolution");
		wgl.locSize = wgl.ctx.getUniformLocation(wgl.prog, "size");
		wgl.locTime = wgl.ctx.getUniformLocation(wgl.prog, "time");
		wgl.locCamera = wgl.ctx.getUniformLocation(wgl.prog, "camera");
		// Noise Texture
		wgl.noise = wgl.ctx.createTexture();
		wgl.ctx.activeTexture(wgl.ctx.TEXTURE1);
		wgl.ctx.bindTexture(wgl.ctx.TEXTURE_2D, wgl.noise);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_MIN_FILTER, wgl.ctx.LINEAR);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_MAG_FILTER, wgl.ctx.LINEAR);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_WRAP_S, wgl.ctx.REPEAT);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_WRAP_T, wgl.ctx.REPEAT)
		wgl.ctx.texImage2D(wgl.ctx.TEXTURE_2D, 0, wgl.ctx.RGBA, this.w, this.h, 0, wgl.ctx.RGBA, wgl.ctx.UNSIGNED_BYTE, genLooping2DNoise(this.w, this.h, 5).data);
		wgl.ctx.uniform1i(wgl.ctx.getUniformLocation(wgl.prog, "noise"), 1);
		// Data texture
		wgl.texture = wgl.ctx.createTexture();
		wgl.ctx.activeTexture(wgl.ctx.TEXTURE0);
		wgl.ctx.bindTexture(wgl.ctx.TEXTURE_2D, wgl.texture);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_MIN_FILTER, wgl.ctx.NEAREST);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_MAG_FILTER, wgl.ctx.NEAREST);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_WRAP_S, wgl.ctx.CLAMP_TO_EDGE); 
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_WRAP_T, wgl.ctx.CLAMP_TO_EDGE)
		wgl.ctx.texImage2D(wgl.ctx.TEXTURE_2D, 0, wgl.ctx.LUMINANCE, this.w, this.h, 0, wgl.ctx.LUMINANCE, wgl.ctx.UNSIGNED_BYTE, this.data);
		wgl.ctx.uniform1i(wgl.ctx.getUniformLocation(wgl.prog, "tilemap"), 0);
		// Drawey stuff
		const vertices = [ -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0 ];
		const vertexBuffer = wgl.ctx.createBuffer();
		wgl.ctx.bindBuffer(wgl.ctx.ARRAY_BUFFER, vertexBuffer);
		wgl.ctx.bufferData(wgl.ctx.ARRAY_BUFFER, new Float32Array(vertices), wgl.ctx.STATIC_DRAW);
		const positionAttribute = wgl.ctx.getAttribLocation(wgl.prog, "position");
		wgl.ctx.enableVertexAttribArray(positionAttribute);
		wgl.ctx.vertexAttribPointer(positionAttribute, 2, wgl.ctx.FLOAT, false, 0, 0);

	}
	render() {
		const wgl = this.wgl;
		tilemap.wgl.ctx.viewport(0, 0, window.innerWidth, window.innerHeight)
		// Use the updated texture in your shader
		wgl.ctx.useProgram(wgl.prog);
		wgl.ctx.activeTexture(wgl.ctx.TEXTURE0);
		wgl.ctx.bindTexture(wgl.ctx.TEXTURE_2D, wgl.texture);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_MIN_FILTER, wgl.ctx.NEAREST);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_MAG_FILTER, wgl.ctx.NEAREST);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_WRAP_S, wgl.ctx.CLAMP_TO_EDGE);
		wgl.ctx.texParameteri(wgl.ctx.TEXTURE_2D, wgl.ctx.TEXTURE_WRAP_T, wgl.ctx.CLAMP_TO_EDGE);
		wgl.ctx.texSubImage2D(
			wgl.ctx.TEXTURE_2D, 0,
			0, 0,
			this.w, this.h,
			wgl.ctx.LUMINANCE, wgl.ctx.UNSIGNED_BYTE,
			this.data
		);

		wgl.ctx.uniform2f(wgl.locRes, can.width, can.height);
		wgl.ctx.uniform2f(wgl.locSize, this.w, this.h);
		wgl.ctx.uniform1f(wgl.locTime, timing.last);
		wgl.ctx.uniform3f(wgl.locCamera, camera.x, camera.y, camera.zoom);

		wgl.ctx.drawArrays(wgl.ctx.TRIANGLE_STRIP, 0, 4);
	}
	renderFast() {
		for (const material of materials) {
			if (material.density === 0) continue;
			material.path = new Path2D();
		}
		let i = 0;
		for (let y = camera.min.y; y < camera.max.y; ++y) {
			for (let x = camera.min.x; x < camera.max.x; ++x) {
				const id = this.getTile(x, y);
				const material = materials[id];
				if (material.density === 0) continue;
				material.path.rect(x, y, 1, 1);
				i += 1;
				if (i > 1e10) break;
			}
			if (i > 1e10) break;
		}
		for (const material of materials) {
			if (material.density === 0) continue;
			ctx.fillStyle = colorToString(material.color);
			ctx.fill(material.path);
			delete material.path;
		}
	}
}

export class Box extends Thing {
	constructor(x, y, w, h) {
		super();
		this.collideType = "box";
		this.x = x - w / 2;
		this.y = y - h / 2;
		this.xv = 0;
		this.yv = 0;
		this.w = w;
		this.h = h;
		this.grounded = 0;
		this.walled = 0;
		this.color = "black";
		this.gravity = 0.01;
	}
	render() {
		ctx.fillStyle = this.color;
		ctx.fillRect(this.x, this.y, this.w, this.h);
	}
	update() {
		this.xv *= 0.8;
		this.yv *= 0.9;
		this.yv += this.gravity;
		this.walled = 0;
		this.grounded = 0;
		const steps = 2;
		for (let _ = 0; _ < steps; ++_) {
			if (this.walled === 0) {
				this.x += this.xv * timing.delta / steps;
				for (const thing of things) {
					if (thing === this) continue;
					switch (collides(this, thing)) {
						case COLLIDESOLID:
							this.walled = Math.sign(this.xv);
							this.x -= this.xv * timing.delta / steps;
							this.xv = 0;
							break;
						case COLLIDELIQUID:
							this.xv *= 0.9;
							break;
					}
				}
			}
			if (this.grounded === 0) {
				this.y += this.yv * timing.delta / steps;
				for (const thing of things) {
					if (thing === this) continue;
					switch (collides(this, thing)) {
						case COLLIDEPLATFORM:
							if (this.phaseThruPlatforms) break;
							if (this.yv < 0) break;
						case COLLIDESOLID:
							this.grounded = Math.sign(this.yv);
							this.y -= this.yv * timing.delta / steps;
							this.yv = 0;
							break;
						case COLLIDELIQUID:
							this.yv *= 0.7;
							this.grounded = 1;
							break;
					}
				}
			}
		}
	}
}