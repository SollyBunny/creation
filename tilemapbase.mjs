import { B64_to_UI8, UI8_to_B64 } from "./utils.mjs";
import { COLLIDENONE, COLLIDESOLID, COLLIDELIQUID, COLLIDEPLATFORM, FLUIDNONE, FLUIDSAND, FLUIDLIQUID } from "./consts.mjs";
import { materials } from "./materials.mjs";

export class TilemapBase {
	// Stolen from Thing from ./engine.js
	add() {
		things.add(this);
	}
	del() {
		things.delete(this);
	}
	// ^ Do not call unless in client
	static deserialize(data, cl) {
		cl = cl || TilemapBase
		data = data.replace(/(^['"]+)|(['"]+$)/g, "");
		data = JSON.parse(data);
		if (data.tilemap.w < 4 || data.tilemap.h < 4) {
			throw `Size must be above 4 x 4, got ${data.tilemap.w} x ${data.tilemap.h}`;
		}
		if (data.tilemap.size > 1000 * 1000) {
			throw `Size must be smaller than 1mB, got ${data.tilemap.w} x ${data.tilemap.h} (${data.tile.w * data.tilemap.h})`;
		}
		let dataNew;
		try {
			dataNew = B64_to_UI8(data.tilemap.data);
		} catch (e) {
			throw `Failed to parse tilemap data: ${e}`;
		}
		if (dataNew.length !== data.tilemap.w * data.tilemap.h) {
			throw `Data size: expected ${data.tilemap.w * data.tilemap.h}, got ${tilemapNew.data.length}, expected ${dataNew.length}`;
		}
		const tilemapNew = new cl(data.tilemap.w, data.tilemap.h);
		tilemapNew.data.set(dataNew);
		for (let i = 0; i < tilemapNew.size; ++i) {
			const id = tilemapNew.data[i] & 0b00001111;
			if (id > materials.length) {
				throw `Invalid material: got ID ${id} @ ${i} (${i % tilemapNew.w}, ${Math.floor(i / tilemapNew.w)}), maximum is ${materials.length}`;
			}
		}
		return tilemapNew;
	}
	constructor(w, h) {
		this.collideType = "tilemap";
		this.w = w;
		this.h = h;
		this.size = w * h;
		this.data = new Uint8Array(this.size);
	}
	normX(x) {
		return (x % this.w + this.w) % this.w;
	}
	normY(y) {
		return (y % this.h + this.h) % this.h;
	}
	swap(x1, y1, x2, y2) {
		const tempTile = this.getTile(x1, y1);
		const tempData = this.getData(x1, y1);
		this.setTile(x1, y1, this.getTile(x2, y2));
		this.setData(x1, y1, this.getData(x2, y2));
		this.setTile(x2, y2, tempTile);
		this.setData(x2, y2, tempData);
	}
	setTile(x, y, block) {
		const index = this.normY(y) * this.w + this.normX(x);
		this.data[index] &= 0b11110000;
		this.data[index] |= block;
	}
	getTile(x, y) {
		return this.data[this.normY(y) * this.w + this.normX(x)] & 0b00001111;
	}
	setData(x, y, data) {
		const index = this.normY(y) * this.w + this.normX(x);
		this.data[index] &= 0b00001111;
		this.data[index] |= data << 4;
	}
	setChunk(x, y, w, h, data) {
		const endX = x + w;
		const endY = x + h;
		let i = 0;
		let j = y * this.w + x;
		for (; y < endY; ++y) {
			for (; x < endX; ++x) {
				this.data[j] = data[i];
				++j;
				++i;
			}
			x -= w;
			j -= w;
			j += h;
		}
	}
	getData(x, y) {
		return this.data[this.normY(y) * this.w + this.normX(x)] >> 4;
	}
	serialize() {
		return JSON.stringify({
			tilemap: {
				w: tilemap.w,
				h: tilemap.h,
				data: UI8_to_B64(tilemap.data)
			}
		});
	}
	tick() {
		if (!this._flip || this._flip.w !== this.w || this._flip.h !== this.h) {
			this._flip = new TilemapBase(this.w, this.h);
		}
		this._flip.data.set(this.data);
		let i = 0;
		for (let y = 0; y < tilemap.h; ++y) {
			for (let x = 0; x < tilemap.w; ++x) {
				const id = this._flip.data[i] & 0b00001111;
				let material = materials[id];
				let density = material.density;
				if (material.fluid) {
					let data = this._flip.data[i] >> 4;
					// Hyper optimized fluid stuff :0
					let densityOther = materials[this._flip.getTile(x, y + 1)].density;
					if (density > densityOther) {
						this.data[i] &= 0b00001111;
						this.swap(x, y, x, y + 1);
						let h = 1;
						while (1) { // allow blocks ontop to fall without going 1 by 1
							material = materials[this._flip.getTile(x, y - h)]
							if (!material.fluid) break;
							density = material.density;
							if (density > densityOther) {
								tilemap.setData(x, y - h + 1, 3);
								this.swap(x, y - h + 1, x, y - h);
							} else {
								break;
							}
							h += 1;
							densityOther = density;
						}
					} else if (data === 3) {
						this.data[i] &= 0b00001111;
					} else {
						if (data === 0) {
							data = Math.round(Math.random()) + 1;
							this.data[i] = (this.data[i] & 0b00001111) | (data << 4);
						}
						const offset = (data - 1) * 2 - 1; // now -1 or 1
						if (material.fluid === FLUIDSAND) {
							const densityA = materials[this._flip.getTile(x + offset, y)].density;
							if (density > densityA && density > materials[this._flip.getTile(x + offset, y + 1)].density) {
								this.swap(x, y, x + offset, y + 1);
							} else {
								const densityB = materials[this._flip.getTile(x - offset, y)].density;
								if (density > densityB && density > materials[this._flip.getTile(x - offset, y + 1)].density) {
									data = 2 - data + 1;
									this.data[i] = (this.data[i] & 0b00001111) | (data << 4);
									this.swap(x, y, x - offset, y + 1);
								}
							}
						} else if (material.fluid == FLUIDLIQUID) {
							const densityA = materials[this._flip.getTile(x + offset, y)].density;
							if (densityA === 0) {
								this.swap(x, y, x + offset, y);
							} else {
								const densityB = materials[this._flip.getTile(x - offset, y)].density;
								if (densityB === 0) {
									data = 2 - data + 1;
									this.data[i] = (this.data[i] & 0b00001111) | (data << 4);
									this.swap(x, y, x - offset, y);
								}
							}
						}
					}
				}
				if (material.update) {
					material.update(this._flip, this, id, x, y);
				}
				i += 1;
			}
		}
	}
}
