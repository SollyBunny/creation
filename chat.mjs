const e_chat = document.getElementById("chat-container");
const e_chat_box = document.getElementById("chat-input-box");

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
chatSolly("Welcome to Creation, a fan remake of a very old Jiggmin flash game");

export function chatFocus() {
	e_chat_box.focus();
}
window.chatFocus = chatFocus;

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
	const args = index === -1 ? [msg] : [msg.slice(1, index), msg.slice(index + 1)];
	console.log(args)
	
}
window.chatSubmit = chatSubmit;