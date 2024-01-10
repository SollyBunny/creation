
// Materials

export const materials = [];

function materialToolOnClick(event) {
	const tool = parseInt(event.target.value);
	if (isNaN(tool)) return;
	if (tool < 0) return;
	if (tool >= materials.length) return;
	mouse.tool = tool;
}
import { colorToString } from "./utils.mjs";
export function addMaterial(opts) {
	if (globalThis.document) {
		const e_materials = document.getElementById("materials");
		if (opts.placeable) {
			const el = document.createElement("button");
			el.style.backgroundColor = colorToString(opts.color);
			el.textContent = opts.name;
			el.title = opts.desc;
			el.value = materials.length;
			el.addEventListener("click", materialToolOnClick);
			e_materials.appendChild(el);
		}
	}
	materials.push(opts);
	return materials.length - 1;
};

// Add some

export const COLLIDENONE = 0;
export const COLLIDESOLID = 1;
export const COLLIDELIQUID = 2;
export const COLLIDEPLATFORM = 3;

export const FLUIDNONE = 0;
export const FLUIDSAND = 1;
export const FLUIDLIQUID = 2;

function attemptFall(src, des, id, x, y) {
	const density = materials[id].density;
	let h = 1;
	while (1) {
		const otherDensity = materials[src.getTile(x, y + h)].density;
		if (otherDensity > density) break;
		if (h > 5) return false;
		h += 1;
	}
	if (h === 1) return false;
	des.swap(x, y, x, y + h - 1);
	return true;
}
function checkIfCanReplace(src, des, id, x1, y1, x2, y2) {
	const otherId = src.getTile(x2, y2);
	if (materials[id].density <= materials[otherId].density) return false;
	des.swap(x1, y1, x2, y2);
	return true;
}
function checkIfCanReplaceOrGoOneFurther(src, des, id, x1, y1, x2, y2, x3, y3) {
	const otherId = src.getTile(x2, y2);
	if (materials[id].density === materials[otherId].density) {
		const otherOtherId = src.getTile(x3, y3);
		if (materials[id].density <= materials[otherOtherId].density) return false;
		des.swap(x1, y1, x3, y3);
		return true;
	} else if (materials[id].density > materials[otherId].density) {
		des.swap(x1, y1, x2, y2)
		return true;
	}
	return false;
}
function checkIfCanSurfaceTension(src, des, id, x1, y1, x2, y2, x3, y3) {
	const density = materials[id].density;
	const otherDensity = materials[src.getTile(x2, y2)].density;
	const otherOtherDensity = materials[src.getTile(x3, y3)].density;
	if (density !== otherOtherDensity) return false;
	if (otherDensity <= otherDensity) return false;
	des.swap(x1, y1, x2, y2);
	return true;
}

const UPDATENONE = undefined;
const UPDATELIQUID = (src, des, id, x, y) => {
	if (checkIfCanReplace(src, des, id, x, y, x, y + 1)) {
		des.setData(x, y + 1, 0);
		UPDATELIQUID()
	} else {

	}
	/*if (checkIfCanReplace(src, des, id, x, y, x, y + 1)) {
		if (data === 1)
			checkIfCanSurfaceTension(src, src, id, x, y, x + 1, y, x + 2, y);
		else
			checkIfCanSurfaceTension(src, src, id, x, y, x - 1, y, x - 2, y);
	} else {
		if (data === 1) {
			if (checkIfCanReplaceOrGoOneFurther(src, des, id, x, y, x + 1, y, x + 2, y)) return;
			des.setData(x, y, 2);
		} else {
			if (checkIfCanReplaceOrGoOneFurther(src, des, id, x, y, x - 1, y, x - 2, y)) return;
			des.setData(x, y, 1);
		}
	}*/
};

export const NONE = addMaterial({
	name: "Empty",
	desc: "Nothing!",
	color: { r: 122, g: 160, b: 249 },
	placeable: true,
	density: 0,
	collide: COLLIDENONE,
	update: UPDATENONE,
	shader: `
vec4 data = texture2D(noise, vec2(pos.y, pos.x) / noiseSize);
float x = (data.a) / 2.0;
x = 0.9 / (1.0 + pow(4.0, -40.0 * (x - 0.6))) + (x > 0.4 ? 0.0 : -2.0 * x * x + 0.3);
gl_FragColor = mix(
	vec4(192.0 / 255.0, 206.0 / 255.0, 217.0 / 255.0, 1.0),
	vec4(119.0 / 255.0, 148.0 / 255.0, 183.0 / 255.0, 1.0),
	x
);
off.x += (mod(pos.x * (1.0 - data.g) + 5.0, 3.0) - 1.5) / 15.0;
off.y += (mod(pos.y * data.g + 2.0, 3.0) - 1.5) / 15.0;
if (off.x > 0.9 || off.y > 0.9) {
	gl_FragColor.rgb /= 1.0 + max((off.x - 0.9) / 2.0, off.y - 0.9);
} else if (off.x < 0.1 || off.y < 0.1) {
	gl_FragColor.rgb *= 1.0 + (0.1 - min(off.x, off.y / 2.0)) / 8.0;
}
`
});
// Statics
export const PLASTIC = addMaterial({
	name: "Plastic",
	desc: "A solid physics defying plastic block",
	color: { r: 219, g: 76, b: 255 },
	placeable: true,
	density: 999,
	collide: COLLIDESOLID,
	update: UPDATENONE,
	shader: `
gl_FragColor = vec4(213.0 / 255.0, 100.0 / 255.0, 183.0 / 255.0, 1.0);
vec4 data = texture2D(noise, vec2(pos.y, pos.x) / noiseSize);
off.x += (mod(pos.x * (1.0 - data.r) + 5.0, 3.0) - 1.5) / 10.0;
off.y += (mod(pos.y * data.g + 2.0, 3.0) - 1.5) / 10.0;
if (off.x > 0.7 || off.y > 0.7) {
	gl_FragColor.rgb /= 1.0 + max((off.x - 0.7) / 2.0, off.y - 0.7) / 2.0;
} else if (off.x < 0.3 || off.y < 0.3) {
	gl_FragColor.rgb *= 1.0 + (0.1 - min(off.x, off.y / 2.0)) / 3.0;
}
gl_FragColor.r += (data.b - 0.5) * 0.2;
gl_FragColor.g += (data.r - 0.5) * 0.2;
gl_FragColor.b += mod(data.b, 0.5) * 0.2;
gl_FragColor.rgb *= 0.8 + mod((data.r + pos.x + pos.y) * 100.0, 0.4);
`
});
export const METAL = addMaterial({
	name: "Metal",
	desc: "A metal background you can walk thru",
	color: { r: 239, g: 242, b: 245 },
	placeable: true,
	density: 999,
	collide: COLLIDEPLATFORM,
	update: UPDATENONE,
	shader: `
gl_FragColor = vec4(239.0 / 255.0, 242.0 / 255.0, 245.0 / 255.0, 1.0);
vec4 data = texture2D(noise, vec2(pos.y, pos.x) / noiseSize);
off.x += (mod(pos.x * (1.0 - data.r) + 5.0, 3.0) - 1.5) / 10.0;
off.y += (mod(pos.y * data.g + 2.0, 3.0) - 1.5) / 10.0;
if (off.y > 0.7) {
	gl_FragColor.rgb /= 1.0 - 0.7 + off.y;
} else if (off.y < 0.3) {
	gl_FragColor.rgb *= 1.0 + off.y;
}
gl_FragColor.rgb *= max(off.x, off.y) / 10.0 + 1.0;
gl_FragColor.rgb *= 1.0 - mod((data.r + pos.x + pos.y) * 100.0, 0.3);
`
});
export const OBBY = addMaterial({
	name: "Obsidian",
	desc: "A metal forged by the combination of all known liquids",
	color: { r: 33, g: 27, b: 45 },
	placeable: false,
	density: 999,
	collide: COLLIDESOLID,
	update: UPDATENONE,
	shader: `
gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
vec4 data = texture2D(noise, vec2(pos.y, pos.x) / noiseSize);
gl_FragColor.rgb *= mod((data.r + pos.x + pos.y) * 100.0, 1.0);
off.x += (mod(pos.x * (1.0 - data.r) + 5.0, 3.0) - 1.5) / 10.0;
off.y += (mod(pos.y * data.g + 2.0, 3.0) - 1.5) / 2.0;
if (off.x > 0.9 || off.y > 0.9 || off.x < 0.1 || off.y < 0.1) {
	gl_FragColor.rgb = 1.0 - gl_FragColor.rgb * max(off.x, off.y);
}
gl_FragColor.rgb *= gl_FragColor.rgb;
gl_FragColor.rgb *= gl_FragColor.rgb;
`
});
export const GRASS = addMaterial({
	name: "Grass",
	desc: "Feels squishy, I wonder what it is",
	color: { r: 110, g: 220, b: 55 },
	placeable: false,
	density: 999,
	collide: COLLIDESOLID,
	update: UPDATENONE,
	shader: `
gl_FragColor = vec4(110.0 / 255.0, 220.0 / 255.0, 55.0 / 255.0, 1.0);
vec4 data = texture2D(noise, vec2(pos.y, pos.x) / noiseSize);
if (off.x < 0.1 || off.y < 0.1 || off.x > 0.9 || off.y > 0.9) gl_FragColor.rgb *= 0.9;
gl_FragColor.rgb *= mod((data.r + pos.x + pos.y) * 100.0, 0.4) + 0.9;
gl_FragColor.rgb *= data.b / 5.0 + 0.9;
`
});
// Sands
export const DIRT = addMaterial({
	name: "Dirt",
	desc: "The dusty soil beneath our feat",
	color: { r: 116, g: 80, b: 46 },
	placeable: true,
	density: 3,
	fluid: FLUIDSAND,
	collide: COLLIDESOLID,
	update: (src, des, id, x, y) => {
		if (src.getTile(x, y - 1) === WATER) {
			src.setTile(x, y - 1, NONE);
			src.setTile(x, y - 1, NONE);
			des.setTile(x, y, GRASS);
			des.setTile(x, y, GRASS);
			return;
		}
	},
	shader: `
gl_FragColor = vec4(116.0 / 255.0, 80.0 / 255.0, 46.0 / 255.0, 1.0);
vec4 data = texture2D(noise, vec2(pos.y, pos.x) / noiseSize);
off.x += (mod(pos.x * (1.0 - data.r) + 5.0, 3.0) - 1.5) / 10.0;
off.y += (mod(pos.y * data.g + 2.0, 3.0) - 1.5) / 10.0;
if (off.x > 0.7 || off.y > 0.7) {
	gl_FragColor.rgb /= 1.0 + max((off.x - 0.3) / 2.0, off.y - 0.3) / 2.0;
} else if (off.x < 0.3 || off.y < 0.3) {
	gl_FragColor.rgb *= 1.0 + (0.1 - min(off.x, off.y / 2.0)) / 3.0;
}
gl_FragColor.rgb *= 0.8 + mod((data.r + pos.x + pos.y) * 100.0, 0.5);
`
});
// Liquids
export const WATER = addMaterial({
	name: "Water",
	desc: "The first liquid, doesn't bite",
	color: { r: 48, g: 143, b: 168 },
	placeable: true,
	density: 1,
	fluid: FLUIDLIQUID,
	collide: COLLIDELIQUID,
	// update: UPDATELIQUID,
	shader: `
gl_FragColor = vec4(48.0 / 255.0, 143.0 / 255.0, 168.0 / 255.0, 1.0);
vec4 data = texture2D(noise, vec2(pos.y, pos.x) / noiseSize);
off.x += (mod(pos.x * (1.0 - data.r) + 5.0, 3.0) - 1.5) / 10.0;
off.y += (mod(pos.y * data.g + 2.0, 3.0) - 1.5) / 10.0;
if (off.x > 0.7 || off.y > 0.7) {
	gl_FragColor.rgb /= 1.0 + max((off.x - 0.7) / 2.0, off.y - 0.7) / 2.0;
} else if (off.x < 0.3 || off.y < 0.3) {
	gl_FragColor.rgb *= 1.0 + (0.1 - min(off.x, off.y / 2.0)) / 3.0;
}
gl_FragColor.r += (data.b - 0.5) * 0.2;
gl_FragColor.g += (data.r - 0.5) * 0.2;
gl_FragColor.rgb *= 1.0 + texture2D(noise, vec2(raw.y + data.b, raw.x + data.r) / noiseSize).r / 2.0;
// gl_FragColor.rgb *= 0.8 + mod((data.r + pos.x + pos.y) * 1.3, 0.7);
`
});
export const LAVA = addMaterial({
	name: "Lava",
	desc: "The second liquid, does bite",
	color: { r: 242, g: 72, b: 49 },
	placeable: true,
	density: 2,
	fire: true,
	fluid: FLUIDLIQUID,
	collide: COLLIDELIQUID,
	update: (src, des, id, x, y) => {
		if (src.getTile(x, y - 1) === WATER) {
			src.setTile(x, y - 1, NONE);
			src.setTile(x, y - 1, NONE);
			des.setTile(x, y, OBBY);
			des.setTile(x, y, OBBY);
			return;
		}
	},
	shader: `
gl_FragColor = vec4(242.0 / 255.0, 72.0 / 255.0, 49.0 / 255.0, 1.0);
vec4 data = texture2D(noise, vec2(pos.y, pos.x) / noiseSize);
if (off.x > 0.7 || off.y > 0.7 || off.x < 0.3 || off.y < 0.3) gl_FragColor.rgb *= 1.3;
gl_FragColor.r *= 1.0 + (data.b / 5.0);
gl_FragColor.g += (data.g - 0.4);
gl_FragColor.rg *= 1.0 + mod((data.r + pos.x + pos.y) * 2.0, 1.0);
`
});
