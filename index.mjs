
window.S = JSON.stringify;

// Canvas

const canwgl = document.getElementById("canwgl");
window.canwgl = canwgl;
const can = document.getElementById("can");
window.can = can;
const ctx = can.getContext("2d");
window.ctx = ctx;
function resize() {
	canwgl.width = can.width = window.innerWidth;
	canwgl.height = can.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// Input

const mouse = {
	x: 0, y: 0,
	lx: 0, ly: 0,
	rx: 0, ry: 0,
	lrx: 0, lry: 0,
	tool: 1
};
window.mouse = mouse;

const keys = {};
window.keys = keys;

window.addEventListener("contextmenu", event => {
	event.preventDefault();
});
can.addEventListener("pointerdown", event => {
	can.setPointerCapture(event.pointerId);
	keys[`mouse${event.button}`] = true;
});
can.addEventListener("pointerup", event => {
	can.releasePointerCapture(event.pointerId);
	keys[`mouse${event.button}`] = false;
});
window.addEventListener("pointercancel", event => {
	can.releasePointerCapture(event.pointerId);
	keys[`mouse${event.button}`] = false;
});
can.addEventListener("pointermove", event => {
	mouse.lrx = mouse.rx;
	mouse.lrx = mouse.rx;
	mouse.rx = event.clientX;
	mouse.ry = event.clientY;
});

// Globals

const camera = {
	x: 0, y: 0,
	x: 0, y: 0,
	zoom: 10, speed: 1,
	min: { x: 0, y: 0 }, max: { x: 0, y: 0 },
	follow: undefined
};
window.camera = camera;
const timing = {
	last: performance.now(),
	delta: 1,
	fps: 1,
	render: 1, update: 1, tick: 1,
};
window.timing = timing;

// Import

import * as utils from "./utils.mjs";
import * as engine from "./engine.mjs";
import { materials } from "./materials.mjs";
const things = engine.things;
window.utils = utils;
window.engine = engine;
window.materials = materials;
window.things = things;

//

import { collides } from "./engine.mjs";
import { COLLIDENONE, COLLIDESOLID, COLLIDELIQUID, COLLIDEPLATFORM, FLUIDNONE, FLUIDSAND, FLUIDLIQUID } from "./consts.mjs";
class Player extends engine.Box {
	constructor(id, name, x, y) {
		super(x, y, 2.5, 5.5);
		this.id = id;
		this.name = name;
		this.color = "#d4bea1";
		this.outline = "#87674d";
		this.speed = 0.01;
		this.jumpSpeed = 0.2;
	}
	render() {
		ctx.save();
		const h = this.h - 1;
		let x, y;
		{
			let dif = (this.x - camera.x + tilemap.w / 2) % tilemap.w - tilemap.w / 2;
  			let dis = (dif > tilemap.w / 2) ? dif - tilemap.w : (dif < -tilemap.w / 2) ? dif + tilemap.w : dif;
			x = camera.x + dis;
		} {
			let dif = (this.y - camera.y + tilemap.h / 2) % tilemap.h - tilemap.h / 2;
  			let dis = (dif > tilemap.h / 2) ? dif - tilemap.h : (dif < -tilemap.h / 2) ? dif + tilemap.h : dif;
			y = camera.y + dis;
		}
		ctx.translate(x + this.w / 2, y + h);
		// Text
		ctx.fillStyle = "#333333";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.font = "2px Sans-Serif";
		ctx.fillText(this.name, 0, 3);
		// Body
		if (this.xv < 0) ctx.scale(-1, 1);
		ctx.rotate(-0.1);

		const shape = new Path2D();
		shape.roundRect(-this.w / 2, -h, this.w, h, this.w / 5, this.w / 5);
		const arm = new Path2D();
		arm.bezierCurveTo(-1, 1, -1, 0, 0.2, 0);
		const leg = new Path2D();
		leg.bezierCurveTo(0, -2, 2, 1, 0.1, 1.2);
		ctx.lineWidth = 0.1;

		// Arm
		ctx.save();
		ctx.translate(-this.w / 2, -h / 1.8); // at left side
		if (this.yv < 0) ctx.scale(1, -1);
		ctx.stroke(arm);
		ctx.translate(this.w, h * 0.05);
		ctx.scale(-1, 1);
		ctx.stroke(arm);
		ctx.restore();

		// Legs
		const tick = Math.round(timing.last / 100)
		ctx.save();
		ctx.translate(-this.w / 2, -0.2);
		ctx.save();
		if (Math.abs(this.xv) > 0.01 && tick % 2 == 0) ctx.translate(0, -0.3);
		ctx.stroke(leg);
		ctx.restore();
		ctx.translate(this.w / 3, 0.1);
		if (Math.abs(this.xv) > 0.01 && tick % 2 == 1) ctx.translate(0, -0.3);
		ctx.stroke(leg);
		ctx.restore();

		// Body
		ctx.fillStyle = this.color;
		ctx.strokeStyle = this.outline;
		ctx.translate(-0.1, 0.1);
		ctx.stroke(shape);
		ctx.translate(0.1, -0.1);
		ctx.fill(shape);
		ctx.fillStyle = "white";
		ctx.fillRect(-this.w / 2, -h / 2, this.w, 0.8);
		ctx.stroke(shape);

		// Eyes
		ctx.lineWidth *= 2;
		ctx.beginPath();
		ctx.moveTo(-0.5, -h / 1.2);
		ctx.lineTo(-0.5, -h / 1.2 + 0.8);
		ctx.moveTo(0.5, -h / 1.2);
		ctx.lineTo(0.5, -h / 1.2 + 0.8);
		ctx.stroke();
		ctx.restore();

		// Fire
		if (this.fire > 0) {
			ctx.save();
			ctx.translate(this.x, this.y);
			ctx.fillStyle = "red";
			ctx.globalAlpha = this.fire / 10000;
			ctx.fillRect(0, 0, this.w, h);
			ctx.restore();
		}
	}
	update() {
		super.update();
		if (tilemap.normX) {
			this.x = tilemap.normX(this.x);
			this.y = tilemap.normY(this.y);
		}
		for (const thing of things) {
			if (thing === this) continue;
			const collision = collides(this, thing);
			if (collision.collide === COLLIDESOLID) {
				if (thing.y) {
					if (this.y > thing.y)
						this.y -= 1;
				} else {
					this.y -= 1;
				}
				break;
			}
		}
	}
}

function render() {
	ctx.resetTransform();
	ctx.clearRect(0, 0, can.width, can.height);
	ctx.translate(can.width / 2, can.height / 2);
	ctx.scale(camera.zoom, camera.zoom);
	ctx.translate(-camera.x, -camera.y);
	for (const thing of things) {
		if (thing.render) thing.render();
	}
}

function update() {
	for (const thing of things) {
		if (thing.update) thing.update();
	}
	if (camera.follow) {
		camera.x = camera.follow.x;
		camera.y = camera.follow.y;
	} else {
		if (keys["w"])
			camera.y -= camera.speed;
		else if (keys["s"])
			camera.y += camera.speed;
		if (keys["a"])
			camera.x -= camera.speed;
		else if (keys["d"])
			camera.x += camera.speed;
	}
	camera.max = {
		x: Math.ceil((can.width / 2) / camera.zoom + camera.x) + 1,
		y: Math.ceil((can.height / 2) / camera.zoom + camera.y) + 1
	};
	camera.min = {
		x: Math.floor((can.width / -2) / camera.zoom + camera.x) - 1,
		y: Math.floor((can.height / -2) / camera.zoom + camera.y) - 1
	};
	mouse.lx = mouse.x;
	mouse.ly = mouse.y;
	mouse.x = Math.floor((mouse.rx - can.width / 2) / camera.zoom + camera.x);
	mouse.y = Math.floor((mouse.ry - can.height / 2) / camera.zoom + camera.y);
	if (keys["mouse0"] || keys["mouse2"]) {
		const tool = keys["mouse0"] ? mouse.tool : 0;
		const out = [];
		utils.drawLine(mouse.lx, mouse.ly, mouse.x, mouse.y, (x, y) => {
			const index = tilemap.index(x, y);
			const id = tilemap.getTileIndex(index);
			if (id !== tool) {
				if (room) {
					out.push(index);
					if (!materials[id].fluid || tool === 0)
						tilemap.setTileIndex(index, tool);
				} else {
					tilemap.setTileIndex(index, tool);
				}
			}
		});
		if (room && out.length > 0) {
			ws.send(S({ t: "p", i: out, d: tool }));
		}
	}
	if (player) {
		if (keys["a"]) {
			if (!keys["d"]) player.xv -= player.speed;
		} else if (keys["d"]) {
			player.xv += player.speed;
		}
		if (player.grounded === 1) {
			if (keys["w"])
				player.yv = -player.jumpSpeed;
		} else {
			if (!keys["w"]) {
				if (player.yv < 0) player.yv *= 0.8;
			}
		}
		if (keys["s"]) {
			player.yv += player.gravity / 2;
		}
		player.phaseThruPlatforms = keys["s"];
	}
}

function frame() {
	let now = performance.now();
	timing.delta = now - timing.last;
	timing.last = now;
	timing.fps = 1000 / timing.delta;
	if (timing.delta > 60) timing.delta = 60;
	update();
	let now2 = performance.now()
	timing.update = now2 - now;
	render();
	timing.render = performance.now() - now2;
	requestAnimationFrame(frame);
}

function tick() {
	if (tilemap && !room) {
		if (!paused) {
			const now = performance.now();
			tilemap.tick();
			timing.tick = performance.now() - now;
		}
	} else {
		paused = false;
	}
	setTimeout(tick, 50);
}

function move() {
	if (
		room && player && ws.readyState === WebSocket.OPEN &&
		(player.sentX && player.x || player.sentY !== player.y)
	) {
		player.sentX = player.x;
		player.sentY = player.y;
		ws.send(S({ t: "m", d: [player.x, player.y, player.xv, player.yv] }));
	}
	setTimeout(move, 10);
}

window.paused = false;
window.addEventListener("keydown", event => {
	if (event.key === "Enter") {
		event.preventDefault();
		if (event.target.tagName === "INPUT") {
			chatSubmit();
		} else {
			chatFocus();
		}
		return;
	}
	if (event.target.tagName === "INPUT") return;
	if (event.key === "/") {
		event.preventDefault();
		chatFocusCommand();
		return;
	} else if ("123456789".indexOf(event.key) !== -1) {
		const e_materials = document.getElementById("materials");
		const index = parseInt(event.key) - 1;
		const btn = e_materials.children[index];
		if (!btn) return;
		btn.click();
		return;
	} else if (event.key === "p" || event.key === " ") {
		paused = !paused;
	}
	keys[event.key.toLowerCase()] = true;
});
window.addEventListener("keyup", event => {
	keys[event.key.toLowerCase()] = false;
});

function load(name) {
	const data = localStorage[`creation.${name}`];
	if (!data) return;
	let tilemapNew;
	try {
		tilemapNew = engine.Tilemap.deserialize(data);
	} catch (e) {
		console.error(e);
		alert(e);
		if (confirm("Invalid save! Press OK to delete it")) {
			delete localStorage[`creation.${name}`];
		}
		return;
	}
	tilemap.del();
	tilemapNew.add();
	window.tilemap = tilemapNew;
}
function save(name) {
	const data = tilemap.serialize();
	localStorage[`creation.${name}`] = data;
}
window.save = save;
window.load = load;

window.onbeforeunload = () => {
	save("autosave");
    return false;
};

{
	const tilemap = new engine.Tilemap(512, 512);
	tilemap.clear();
	tilemap.add();
	window.tilemap = tilemap;
}

load("autosave");

// Run
setTimeout(frame, 100);
setTimeout(tick, 100);
setTimeout(move, 100);

// Ws

import { Collection } from "./collection.mjs";


window.room = undefined;
window.player = new Player(undefined, "offline", 0, 0);
camera.follow = player;
player.add();
window.players = new Collection();
players.add(player);

let ws;
function onopen() {
	chatSystem("Connected");
	ws.send(S({
		t: "new",
		d: tilemap.serialize()
	}));
	if (localStorage["creation.nick"]) {
		ws.send(S({
			t: "nick",
			d: localStorage["creation.nick"]
		}));
	}
}
function onclose() {
	if (!room) {
		chatSystem("Disconnected, type /connect to reconnect");
		return;
	}
	window.room = undefined;
	player.name = localStorage["creation.nick"] || "offline";
	player.id = undefined;
	chatSystem("Disconnected, trying to reconnect...");
	setTimeout(connect, 1000);
}
import { TilemapBase } from "./tilemapbase.mjs";
function onmsg(data) {
	if (data.data.arrayBuffer) {
		data.data.arrayBuffer().then(buffer => {
			utils.arrayDiffDeserialize(tilemap.data, new Uint8Array(buffer), tilemap.w, tilemap.h);
		});
		return;
	}
	const msg = JSON.parse(data.data);
	if (["t", "m"].indexOf(msg.t) === -1)
		console.log(msg);
	switch (msg.t) {
		case "error":
			msg.d.forEach(chatSystem);
			break;
		case "join":
			if (msg.r) {
				chatSystem(`You have joined room ${msg.r}`);
				players.del(player);
				player.id = msg.d[0];
				players.add(player);
				window.room = msg.r;
			}
			let sent = false;
			if (msg.d.length === 2 && !msg.r) {
				sent = true;
				chatSystem(`${msg.d[1]} has joined`);
			}
			const out = [];
			for (let i = 0; i < msg.d.length; i += 2) {
				if (players[msg.d[i]]) {
					const player2 = players[msg.d[i]];
					players.del(player2);
					player2.id = msg.d[i];
					player2.name = msg.d[i + 1];
					players.add(player2);
				} else {
					const newPlayer = new Player(msg.d[i], msg.d[i + 1], 0, 0)
					newPlayer.add();
					players.add(newPlayer);
				}
				if (!sent) {
					if (msg.d[i] === player.id)
						out.push(`${msg.d[i + 1]}*`);
					else
						out.push(msg.d[i + 1]);
				}
			}
			if (!sent)
				chatSystem(`Players: ${out.join(", ")}`);
			break;
		case "leave":
			msg.d.forEach(id => {
				const player2 = players[id];
				if (!player2) return;
				players.del(player2);
				player2.del();
				chatSystem(`${player2.name} has left`);
			})
			break;
		case "owner":
			window.owner = msg.u;
			if (msg.u === player.id) {
				chatSystem(`You are now the host!`);
			} else {
				const player2 = players[msg.u];
				if (player2)
					chatSystem(`The host is now ${player2.name}`);
				else // TODO request sync
					chatSystem(`The host is now ${msg.u}`);
			}
			break;
		case "msg":
			for (let i = 0; i < msg.d.length; i += 2) {
				chatAddMsg(msg.d[i], "white", msg.d[i + 1]);
			}
			break;
		case "nick":
			for (let i = 0; i < msg.d.length; i += 2) {
				if (msg.d[i] === player.id) {
					localStorage["creation.nick"] = msg.d[i + 1];
				}
				const player2 = players[msg.d[i]];
				if (!player2) continue;
				player2.name = msg.d[i + 1];
			}
			break;
		case "rooms":
			msg.d = msg.d.map(id => {
				if (id === room) return `${id}*`;
				return id;
			});
			chatSystem(`Rooms: ${msg.d.join(", ")}`);
			break;
		case "p":
			for (const i of msg.i)
				tilemap.setTileIndex(i, msg.d);
			break;
		case "t":
			if (msg.d) {
				let tilemapNew;
				try { 
					tilemapNew = TilemapBase.deserialize(msg.d);
				} catch (e) {
					chatSystem(`Server sent malformed tilemap: ${e}`);
					break;
				}
				if (tilemapNew.w !== tilemap.w || tilemapNew.h !== tilemap.h) {
					chatSystem("Server gave different size tilemap, resizing");
					window.tilemap = tilemap = new Tilemap(tilemapNew.w, tilemapNew.h);
				}
				tilemap.data.set(tilemapNew.data);
			} else if (msg.s) {
				utils.arrayDiffDeserialize(tilemap.data, utils.B64_to_UI8(msg.s));
			} else {
				const now = performance.now();
				tilemap.tick();
				timing.tick = performance.now() - now;
			}
			break;
		case "m":
			for (let i = 0; i < msg.d.length; i += 5) {
				if (msg.d[i] === player.id) continue;
				const player2 = players[msg.d[i]];
				if (!player2) continue;
				player2.x = msg.d[i + 1];
				player2.y = msg.d[i + 2];
				player2.xv = msg.d[i + 3];
				player2.yv = msg.d[i + 4];
			}
			break;
	}
}
function connect() {
	ws = new WebSocket(`wss://${document.location.host}${document.location.pathname.slice(0, document.location.pathname.lastIndexOf("/") + 1)}server`);
	ws.addEventListener("open", onopen);
	ws.addEventListener("close", onclose);
	ws.addEventListener("message", onmsg);
	window.ws = ws;
}
function disconnect() {
	window.room = undefined;
	player.name = localStorage["creation.nick"] || "offline";
	player.id = undefined;
	ws.close();
}
connect();
window.ws = ws;
window.connect = connect;
window.disconnect = disconnect;