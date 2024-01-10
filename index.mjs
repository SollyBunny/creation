
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
	constructor(name, x, y) {
		super(x, y, 2.5, 5.5);
		this.name = name;
		this.color = "#d4bea1";
		this.outline = "#87674d";
		this.speed = 0.01;
		this.jumpSpeed = 0.2;
	}
	renderFast() {
		ctx.save();
		const h = this.h - 1;
		ctx.translate(this.x + this.w / 2, this.y + h);
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
	}
	render() {
		this.renderFast()
	}
	update() {
		super.update();
		const collision = collides(this, tilemap);
		if (collision === COLLIDESOLID) {
			this.y -= 1;
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
	if (keys["mouse0"])
		utils.drawLine(mouse.lx, mouse.ly, mouse.x, mouse.y, (x, y) => {
			tilemap.setTile(x, y, mouse.tool);
		});
	if (keys["mouse2"])
		utils.drawLine(mouse.lx, mouse.ly, mouse.x, mouse.y, (x, y) => {
			tilemap.setTile(x, y, 0);
		});
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
	if (tilemap) {
		const now = performance.now();
		tilemap.tick();
		timing.tick = now - performance.now();
	}
	setTimeout(tick, 50);
}

window.addEventListener("keydown", event => {
	if (event.key === "Enter") {
		if (event.target.tagName === "INPUT") {
			chatSubmit();
			document.getElementById("chat-input-box").blur();
		} else {
			chatFocus();
			document.getElementById("chat-input-box").focus();
		}
		return;
	}
	if (event.target.tagName === "INPUT") return;
	keys[event.key.toLowerCase()] = true;
});
window.addEventListener("keyup", event => {
	keys[event.key.toLowerCase()] = false;
});

function loadData(data) {
	tilemap.del();
		tilemapNew.add();
		window.tilemap = tilemapNew;
		return true;
}
function saveData() {
	return JSON.stringify({
		tilemap: {
			w: tilemap.w,
			h: tilemap.h,
			data: utils.UI8_to_B64(tilemap.data)
		}
	});
}

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

window.onbeforeunload = () => {
	save("autosave");
    return false;
};

{
	const tilemap = new engine.Tilemap(512, 512);
	for (let x = -10; x < 10; ++x) {
		tilemap.setTile(x, 10, 1);
	}
	tilemap.add();
	window.tilemap = tilemap;
}

load("autosave");

// Run
requestAnimationFrame(frame);
setTimeout(tick, 50);

// Ws

window.S = JSON.stringify;

import { Collection } from "./collection.mjs";

let players = new Collection();
let room = undefined;
let player = new Player("offline", 0, 0);
camera.follow = player;
player.add();
players.add(player);

let ws;
function onopen() {
	chatSystem("Connected");
	ws.send(S({
		t: "new",
		d: saveData()
	}));
}
function onclose() {
	room = undefined;
	player.name = "offline";
	player.id = undefined;
	chatSystem("Disconnected, trying to reconnect...");
	setTimeout(connect, 500);
}
function onmsg(data) {
	const msg = JSON.parse(data.data);
	switch (msg.t) {
		case "join":
			if (msg.r) {
				chatSystem(`You have joined room ${msg.r}`);
				room = msg.r;
				player.name = player.id = msg.u;
			} else {
				const newPlayer = new Player(msg.u, 0, 0)
				players.add(player);
				chatSystem(`${msg.u} has joined`);
			}
			break;
		case "leave":
			players[msg.u].del();
			players.delId(msg.u);
			break;
		case "owner":
			if (msg.u === player.id) {
				chatSystem(`You are now the host!`);
			} else {
				chatSystem(`The host is now ${msg.u}`);
			}
			break;
		case "msg":
			chatAddMsg(msg.u, "white", msg.d);
			break;
	}
}
function connect() {
	ws = new WebSocket(`wss://${document.location.host}${document.location.pathname.slice(0, document.location.pathname.lastIndexOf("/") + 1)}server`);
	ws.onopen = onopen;
	ws.onclose = onclose;
	ws.onmessage = onmsg;
}
function disconnect() {
	room = undefined;
	player.name = "offline";
	player.id = undefined;
	ws.close();
}
connect();
window.ws = ws;
window.connect = connect;
window.disconnect = disconnect;