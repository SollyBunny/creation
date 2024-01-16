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
		this.ticks = 0;
		this.data = new Uint8Array(this.size);
		this.disableChanges();
	}
	clear() {
		this.data.fill(0);
		for (let x = -10; x < 10; ++x)
			this.setTile(x, 10, 1);
	}
	enableChanges() {
		this.changes = {};
		this.addChange = this._addChange;
	}
	disableChanges() {
		this.changes = undefined;
		this.addChange = () => {};
	}
	_addChange(index, o, n) {
		this.changes[index] = [o, n];
	}
	normX(x) {
		return (x % this.w + this.w) % this.w;
	}
	normY(y) {
		return (y % this.h + this.h) % this.h;
	}
	index(x, y) {
		return this.normY(y) * this.w + this.normX(x);
	}
	swap(x1, y1, x2, y2) {
		const a = this.index(x1, y1);
		const b = this.index(x2, y2);
		const oldA = this.data[a];
		const oldB = this.data[b];
		this.data[a] = oldB;
		this.data[b] = oldA;
		this.addChange(a, oldA, oldB);
		this.addChange(b, oldB, oldA);
	}
		swapIndex(a, b) {
			const oldA = this.data[a];
			const oldB = this.data[b];
			this.data[a] = oldB;
			this.data[b] = oldA;
			this.addChange(a, oldA, oldB);
			this.addChange(b, oldB, oldA);
		}
		swapIndexNot(a, x2, y2) {
			const b = this.index(x2, y2);
			const oldA = this.data[a];
			const oldB = this.data[b];
			this.data[a] = oldB;
			this.data[b] = oldA;
			this.addChange(a, oldA, oldB);
			this.addChange(b, oldB, oldA);
		}
		swapNotIndex(x1, y1, b) {
			const a = this.index(x1, y1);
			const oldA = this.data[a];
			const oldB = this.data[b];
			this.data[a] = oldB;
			this.data[b] = oldA;
			this.addChange(a, oldA, oldB);
			this.addChange(b, oldB, oldA);
		}
	setTile(x, y, block) {
		const index = this.normY(y) * this.w + this.normX(x);
		const o = this.data[index];
		const n = (o & 0b11110000) | block;
		this.data[index] = n;
		this.addChange(index, o, n);
	}
		setTileIndex(index, block) {
			const o = this.data[index];
			const n = (o & 0b11110000) | block;
			this.data[index] = n;
			this.addChange(index, o, n);
		}
	clearTile(x, y) {
		const index = this.normY(y) * this.w + this.normX(x);
		const o = this.data[index];
		const n = o & 0b11110000;
		this.data[index] = n;
		this.addChange(index, o, n);
	}
		clearTileIndex(index) {
			const o = this.data[index];
			const n = o & 0b11110000;
			this.data[index] = n;
			this.addChange(index, o, n);
		}
	getWhole(x, y) {
		return this.data[this.normY(y) * this.w + this.normX(x)];
	}
		getWholeIndex(index) {
			return this.data[index];
		}
	setWhole(x, y, data) {
		const index = this.normY(y) * this.w + this.normX(x);
		const o = this.data[index];
		this.data[index] = data;
		this.addChange(index, o, data);
	}
		setWholeIndex(index, data) {
			const o = this.data[index];
			this.data[index] = data;
			this.addChange(index, o, data);
		}
	getTile(x, y) {
		return this.data[this.normY(y) * this.w + this.normX(x)] & 0b00001111;
	}
		getTileIndex(index) {
			return this.data[index] & 0b00001111;
		}
	setData(x, y, data) {
		const index = this.normY(y) * this.w + this.normX(x);
		const o = this.data[index];
		const n = (o & 0b00001111) | (data << 4);
		this.data[index] = n;
		this.addChange(index, o, n);
	}
		setDataIndex(index, data) {
			const o = this.data[index];
			const n = (o & 0b00001111) | (data << 4);
			this.data[index] = n;
			this.addChange(index, o, n);
		}
	clearData(x, y) {
		const index = this.normY(y) * this.w + this.normX(x);
		const o = this.data[index];
		const n = o & 0b00001111;
		this.data[index] = n;
		this.addChange(index, o, this.data[index]);
	}
		clearDataIndex(index) {
			const o = this.data[index];
			const n = o & 0b00001111;
			this.data[index] = n;
			this.addChange(index, o, this.data[index]);
		}
	getData(x, y) {
		return this.data[this.normY(y) * this.w + this.normX(x)] >> 4;
	}
		getDataIndex(index) {
			return this.data[index] >> 4;
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
	serialize() {
		return JSON.stringify({
			tilemap: {
				w: this.w,
				h: this.h,
				data: UI8_to_B64(this.data)
			}
		});
	}
	tick() {
		this.ticks += 1;
		if (!this._flip || this._flip.w !== this.w || this._flip.h !== this.h) {
			this._flip = new TilemapBase(this.w, this.h);
		}
		this._flip.data.set(this.data);
		let i = 0;
		for (let y = 0; y < this.h; ++y) {
			for (let x = 0; x < this.w; ++x) {
				const id = this._flip.getTileIndex(i);
				const material = materials[id];
				if (material.update) {
					material.update(this._flip, this, i, x, y);
				}
				i += 1;
			}
		}
		i = 0;
		for (let y = 0; y < this.h; ++y) {
			for (let x = 0; x < this.w; ++x) {
				const id = this._flip.getTileIndex(i);
				let material = materials[id];
				let density = material.density;
				if (material.fluid) {
					let data = this._flip.data[i] >> 4;
					// Hyper optimized fluid stuff :0
					let indexOther = this.index(x, y + 1);
					let idOther = this._flip.getTileIndex(indexOther)
					let densityOther = materials[idOther].density;
					if (density > densityOther) {
						this.setWholeIndex(i, idOther);
						this.setWholeIndex(indexOther, id);
					} else if (data === 3) {
						this.clearData(i);
					} else {
						if (data === 0) {
							data = Math.round(Math.random()) + 1;
							this.setDataIndex(i, data);
						}
						const offset = (data - 1) * 2 - 1; // now -1 or 1
						if (material.fluid === FLUIDSAND) {
							const indexADown = this.index(x + offset, y + 1);
							const idADown = this._flip.getTileIndex(indexADown);
							const densityADown = materials[idADown].density;
							if (density > materials[this._flip.getTile(x + offset, y)].density && density > densityADown) {
								this.setWholeIndex(i, this._flip.getWholeIndex(indexADown));
								this.setWholeIndex(indexADown, this._flip.getWholeIndex(i));
							} else {
								const indexBDown = this.index(x - offset, y + 1);
								const idBDown = this._flip.getTileIndex(indexBDown);
								const densityBDown = materials[idBDown].density;
								if (density > materials[this._flip.getTile(x - offset, y)].density && density > densityBDown) {
									data = 2 - data + 1;
									this.setWholeIndex(i, this._flip.getWholeIndex(indexBDown));
									this.setWholeIndex(indexBDown, id);
									this.setDataIndex(indexBDown, data);
								}
							}
						} else if (material.fluid == FLUIDLIQUID) {
							const indexA = this.index(x + offset, y);
							const idA = this._flip.getTileIndex(indexA);
							const densityA = materials[idA].density;
							if (densityA === 0) {
								this.swapIndex(i, indexA);
							} else {
								const indexB = this.index(x - offset, y);
								const idB = this._flip.getTileIndex(indexB);
								const densityB = materials[idB].density;
								if (densityB === 0) {
									data = 2 - data + 1;
									this.swapIndex(i, indexB);
									this.setDataIndex(indexB, data);
								}
							}
						}
					}
				}
				i += 1;
			}
		}
	}
}
