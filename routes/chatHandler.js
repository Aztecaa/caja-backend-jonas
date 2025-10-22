import fs from "fs/promises";
import { join } from "path";

const users = {};
const CHAT_FILE = join(process.cwd(), "data/chat.json");

// === ASEGURAR ARCHIVO EXISTENTE ===
async function ensureChatFile() {
    try {
        await fs.access(CHAT_FILE);
    } catch {
        await fs.mkdir(join(process.cwd(), "data"), { recursive: true });
        await fs.writeFile(CHAT_FILE, JSON.stringify({}, null, 2));
    }
}

// === LEER CHATS ===
async function loadChats() {
    await ensureChatFile();
    const data = await fs.readFile(CHAT_FILE, "utf-8");
    return JSON.parse(data || "{}");
}

// === GUARDAR CHATS ===
async function saveChats(chats) {
    await fs.writeFile(CHAT_FILE, JSON.stringify(chats, null, 2));
}

// === INICIALIZAR SOCKET CHAT ===
export function initChat(io, socket) {
    socket.on("register-user", (userName) => {
        users[userName] = socket.id; // registramos el socket
    });

    socket.on("chat-request", async (user) => {
        const chats = await loadChats();
        socket.emit("chat-historial", chats[user] || []);
    });

    socket.on("chat-message", async (msg) => {
        const { autor, destinatario } = msg;

        // Guardado en archivo como antes
        const chats = await loadChats();
        if (!chats[autor]) chats[autor] = [];
        if (!chats[destinatario]) chats[destinatario] = [];
        chats[autor].push(msg);
        chats[destinatario].push(msg);
        await saveChats(chats);

        // Emitir solo a autor y destinatario
        if (users[autor]) io.to(users[autor]).emit("chat-message", msg);
        if (users[destinatario]) io.to(users[destinatario]).emit("chat-message", msg);
    });
}
