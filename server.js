import { Server } from "socket.io";
import fs from "fs/promises";
import { join } from "path";
import { productos } from "./routes/productos.js";

const STOCK_FILE = join(process.cwd(), "stock.json");
const CHAT_FILE = join(process.cwd(), "chat.json");

// === CHAT ===
async function cargarChat() {
    try {
        await fs.access(CHAT_FILE).catch(async () => {
            console.log("⚠️ No existe chat.json, creando nuevo historial vacío");
            await fs.writeFile(CHAT_FILE, "[]");
        });

        const data = await fs.readFile(CHAT_FILE, "utf-8");
        const parsed = JSON.parse(data);
        return parsed;
    } catch (err) {
        console.error("❌ Error leyendo chat.json:", err);
        return [];
    }
}

async function guardarMensaje(msg) {
    try {
        const chat = await cargarChat();
        chat.push(msg);
        // Limitar a 500 mensajes
        await fs.writeFile(CHAT_FILE, JSON.stringify(chat.slice(-500), null, 2));
    } catch (err) {
        console.error("❌ Error al guardar mensaje:", err);
    }
}

// === STOCK ===
async function guardarStock() {
    try {
        await fs.writeFile(STOCK_FILE, JSON.stringify(productos, null, 2));
    } catch (err) {
        console.error("❌ Error guardando stock:", err);
    }
}

// Cargar stock inicial
async function cargarStockInicial() {
    try {
        await fs.access(STOCK_FILE).catch(async () => {
            console.log("⚠️ No existe stock.json, creando archivo vacío");
            await fs.writeFile(STOCK_FILE, "[]");
        });

        const data = await fs.readFile(STOCK_FILE, "utf-8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            productos.splice(0, productos.length, ...parsed);
            console.log(`✅ Stock inicial cargado (${productos.length} productos)`);
        }
    } catch (err) {
        console.error("❌ Error leyendo stock.json:", err);
    }
}

// === SOCKET SERVER ===
export default async function initSocketServer(server, allowedOrigins) {
    await cargarStockInicial();
    console.log("🚀 Inicializando Socket.IO...");

    const io = new Server(server, {
        cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
    });

    io.on("connection", async (socket) => {
        console.log(`🟢 Cliente conectado: ${socket.id}`);

        // Enviar historial de chat
        socket.emit("chat-historial", await cargarChat());

        // Chat
        socket.on("chat-message", async (msg) => {
            console.log("💬 Mensaje recibido:", msg);
            await guardarMensaje(msg);
            io.emit("chat-message", msg);
            console.log("📤 Mensaje emitido a todos los clientes.");
        });

        // Stock
        socket.emit("stockActualizado", productos);

        socket.on("agregarProducto", async (data) => {
            let { codigo, nombre, precio = 0, cantidadUnidadesSueltas = 0 } = data;
            let p = productos.find(x => x.codigo === codigo);
            if (p) {
                p.cantidadUnidadesSueltas += cantidadUnidadesSueltas;
                if (precio) p.precio = precio;
            } else {
                productos.push({ codigo, nombre, precio, cantidadUnidadesSueltas });
            }
            await guardarStock();
            io.emit("stockActualizado", productos);
        });

        socket.on("eliminarProducto", async (codigo) => {
            const index = productos.findIndex(p => p.codigo === codigo);
            if (index !== -1) productos.splice(index, 1);
            await guardarStock();
            io.emit("stockActualizado", productos);
        });

        socket.on("confirmarVenta", async (items) => {
            items.forEach(({ codigo, cantidad }) => {
                const p = productos.find(x => x.codigo === codigo);
                if (p) p.cantidadUnidadesSueltas = Math.max(p.cantidadUnidadesSueltas - cantidad, 0);
            });
            await guardarStock();
            io.emit("stockActualizado", productos);
        });

        socket.on("disconnect", () => console.log(`🔴 Cliente desconectado: ${socket.id}`));
    });

    console.log("📡 Socket.IO listo para aceptar conexiones.");
    return io;
}
