export class Collection {
	constructor() {
		this.set = new Set();
	}
	add(item) {
		if (this.set.has(item)) return;
		this.set.add(item);
		this[item.id] = item.id;
	}
	del(item) {
		if (!this.set.has(item)) return;
		this.set.delete(item);
		delete this[item.id];
	}
	delId(id) {
		const item = this[id];
		if (!item) return;
		this.del(item);
	}
	hasId(id) {
		return this[id] !== undefined;
	}
	has(item) {
		return this.set.has(item);
	}
	clear() {
		for (const item of this.set)
			delete this[item.id];
		this.set.clear();
	}
	get first() {
		this.set.values().next().value;
	}
	get length() {
		return this.set.size;
	}
	[Symbol.iterator]() {
		return this.set[Symbol.iterator]();
	}
}