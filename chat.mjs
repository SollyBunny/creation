const e_chat = document.getElementById("chat-container");
const e_chat_box = document.getElementById("chat-input-box");

let tabOpts = undefined;
let tabIndex = 0;
e_chat_box.addEventListener("keydown", async function(event) {
	if (event.key !== "Tab") {
		tabOpts = undefined;
		return;
	}
	event.preventDefault();
	if (tabOpts === undefined) {
		tabIndex = 0;
		const value = event.target.value;
		if (value.startsWith("/")) {
			if (value.indexOf(" ") === -1) {
				const cmdName = value.slice(1).toLowerCase();
				tabOpts = commands.filter(cmd => cmd.names.find(name => name.startsWith(cmdName))).map(cmd => `/${cmd.names[0]}`).sort((a, b) => a.length - b.length);
			} else {
				const cmdName = value.slice(1, value.indexOf(" ")).toLowerCase();
				const cmd = commandsIndex[cmdName];
				if (cmd && cmd.tab) {
					tabOpts = await cmd.tab(value.slice(value.indexOf(" ") + 1));
					tabOpts = tabOpts.map(opt => `/${cmdName} ${opt}`);
				}
			}
		} else {
			const index = value.lastIndexOf(" ");
			const endPart = value.slice(index + 1).toLowerCase();
			const startPart = value.slice(0, index < 0 ? 0 : index + 1);
			console.log(endPart)
			tabOpts = players.filter(player2 => player2.name.toLowerCase().startsWith(endPart)).map(player2 => `${startPart}${player2.name}`).sort();
		}
	}
	if (tabOpts && tabOpts.length > 0) {
		console.log(tabOpts, tabIndex)
		event.target.value = tabOpts[tabIndex];
		tabIndex += 1;
		if (tabIndex >= tabOpts.length)
			tabIndex = 0;
	}
});

export function chatAddMsg(user, color, msg) {
	const e_msg = document.createElement("div");
	e_msg.classList.add("msg");
	{
		const e_user = document.createElement("div");
		e_user.classList.add("user");
		e_user.title = e_user.textContent = user;
		e_user.style.color = color;
		e_msg.appendChild(e_user)
	}
	{
		const e_content = document.createElement("div");
		e_content.classList.add("content");
		e_content.title = e_content.textContent = msg;
		e_msg.appendChild(e_content);
	}
	e_chat.appendChild(e_msg);
	e_chat.scrollTop = e_chat.scrollHeight
	if (e_chat.childElementCount > 50) {
		e_chat.firstChild.remove();
	}
}
window.chatAddMsg = chatAddMsg;

export function chatSystem(msg) {
	chatAddMsg("<SYSTEM>", "green", msg);
}
window.chatSystem = chatSystem;

export function chatSolly(msg) {
	chatAddMsg("Solly", "gold", msg);
}
window.chatSolly = chatSolly;
setTimeout(() => {
	chatSolly("Welcome to Creation, a fan remake of a very old Jiggmin flash game\nType /help to see help, see who's online with /rooms");
}, 5000);
export function chatFocus() {
	e_chat_box.focus();
}
window.chatFocus = chatFocus;
export function chatFocusCommand() {
	e_chat_box.focus();
	if (e_chat_box.value.length == 0)
		e_chat_box.value = "/";
}
window.chatFocusCommand = chatFocusCommand;

const commands = [];
const commandsIndex = {};
function addCommand(names, stuff) {
	stuff.names = names;
	commands.push(stuff);
	names.forEach(name => {
		commandsIndex[name] = stuff;
	});
}
function runCommand(args) {
	args[0] = args[0].toLowerCase();
	const cmd = commandsIndex[args[0]];
	if (!cmd) {
		return `Command ${args[0]} not found, see /help`;
	}
	if (cmd.arg && args.length === 1) {
		return `Command ${args[0]} requires an argument`;
	}
	return cmd.fnc(args[1]);
}

addCommand(["help"], {
	desc: "Shows commands",
	fnc: () => {
		let out = "";
		for (const command of commands) {
			out += `${command.names.map(name => `/${name}`).join(", ")}: ${command.desc}\n`;
		}
		return out;
	}
});
addCommand(["nickname", "nick"], {
	desc: "Changes ingame name",
	arg: true,
	fnc: (arg) => {
		if (arg.length > 16) return "Nickname too long";
		if (ws.readyState !== WebSocket.OPEN) {
			player.name = arg;
			return;
		}
		ws.send(S({ t: "nick", d: arg }));
	}
});
addCommand(["rooms"], {
	desc: "Get list of rooms",
	fnc: () => {
		if (ws.readyState !== WebSocket.OPEN) return "You are not online";
		ws.send(S({ t: "rooms" }));
	}
});
addCommand(["room"], {
	desc: "Go to a room by id",
	tab: (arg) => {
		if (ws.readyState !== WebSocket.OPEN) return;
		arg = arg.toLowerCase();
		return new Promise((resolve) => {
			function callback(data) {
				if (data.data.arrayBuffer) return;
				const msg = JSON.parse(data.data);
				if (msg.t === "rooms") {
					ws.removeEventListener("message", callback);
					resolve(
						msg.d.filter(room2 => room2 !== room && room2.toLowerCase().startsWith(arg))
					);
				}
			}
			ws.addEventListener("message", callback);
			ws.send(S({ t: "rooms" }));
		});
	},
	fnc: (arg) => {
		if (ws.readyState !== WebSocket.OPEN) return "You are not online";
		if (arg) {
			ws.send(S({ t: "room", d: arg }));
		} else {
			ws.send(S({ t: "rooms" }));
		}
	}
});
addCommand(["connect"], {
	desc: "Attempt to connect to the server",
	fnc: () => {
		if (ws.readyState === WebSocket.OPEN) return "You are already online";
		if (ws.readyState === WebSocket.CONNECTING) return "You are in the process of connecting";
		connect();
	}
});
addCommand(["disconnect"], {
	desc: "Disconnect from the server",
	fnc: () => {
		if (ws.readyState === WebSocket.CLOSED) return "You are already offline";
		if (ws.readyState === WebSocket.CONNECTING) return "You are in the process of disconnecting";
		disconnect();
	}
});
addCommand(["teleport", "tp"], {
	desc: "Teleport to a location",
	arg: true,
	tab: (arg) => {
		arg = arg.toLowerCase();
		return players.filter(player2 => {
			if (player2.id === player.id) return false;
			return player2.name.toLowerCase().startsWith(arg);
		}).map(player2 => player2.name);
	},
	fnc: (arg) => {
		let pos;
		const player2 = players.find(player3 => player3.name === arg);
		if (player2) {
			pos = [player2.x + player2.w, player2.y]
		} else {
			pos = arg.replace(/[^0-9., ]/g, "");
			pos = pos.split(/[, ]/);
			pos[0] = parseFloat(pos[0]);
			pos[1] = parseFloat(pos[1]);
			if (isNaN(pos[0]) || isNaN(pos[1]))
				return `Invalid position ${arg}`;
		}
		player.x = pos[0];
		player.y = pos[1];
	}
});
addCommand(["position", "pos"], {
	desc: "Share your location",
	fnc: () => {
		if (ws.readyState !== WebSocket.OPEN) return "You are not online";
		ws.send(S({ t: "msg", d: `I'm at ${player.x.toFixed()} ${player.y.toFixed()}, come to me with /tp`}));
	}
});
addCommand(["list"], {
	desc: "List all players in the room",
	fnc: () => {
		return players.map(player2 => player.name).join(", ");
	}
});
addCommand(["save"], {
	desc: "Save the current world",
	fnc: (arg) => {
		arg = arg.trim();
		arg = arg || "autosave";
		save(`saves.${arg}`);
		return `Saved as ${arg}`;
	}
});
addCommand(["load"], {
	desc: "Load a save",
	fnc: (arg) => {
		if (ws.readyState !== WebSocket.CLOSED) return "You are online, use /disconnect to load";
		arg = arg.trim();
		arg = arg || "autosave";
		load(`saves.${arg}`);
		return `Loaded ${arg}`;
	}
});
addCommand(["reset"], {
	desc: "Reset the world",
	fnc: (arg) => {
		if (ws.readyState !== WebSocket.CLOSED) return "You are online, use /disconnect to reset";
		tilemap.clear();
	}
})

export function chatSubmit() {
	e_chat_box.blur();
	if (e_chat_box.value.length === 0) return;
	const msg = e_chat_box.value;
	e_chat_box.value = "";
	if (!msg.startsWith("/")) {
		ws.send(S({ t: "msg", d: msg }));
		return;
	};
	// I'm a command
	const index = msg.indexOf(" ");
	const args = index === -1 ? [msg.slice(1)] : [msg.slice(1, index), msg.slice(index + 1)];
	const out = runCommand(args);
	if (out) {
		chatSystem(out);
	}
}
window.chatSubmit = chatSubmit;