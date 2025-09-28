// server.js
import { Server } from "socket.io";
import { productos } from "./routes/productos.js";
import fs from "fs";
import { join } from "path";

const STOCK_FILE = join(process.cwd(), "stock.json");

// Guardar stock en archivo
function guardarStock() {
    fs.writeFileSync(STOCK_FILE, JSON.stringify(productos, null, 2));
}

// Cargar stock inicial si existe archivo
if (fs.existsSync(STOCK_FILE)) {
    try {
        const data = fs.readFileSync(STOCK_FILE, "utf-8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            productos.splice(0, productos.length, ...parsed);
        }
    } catch (err) {
        console.error("❌ Error leyendo stock.json:", err);
    }
}

export default function initSocketServer(server, allowedOrigins) {
    const io = new Server(server, {
        cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
    });

    io.on("connection", (socket) => {
        console.log("🟢 Cliente conectado");

        socket.on("chat-message", (msg) => {
            console.log("💬 Mensaje recibido:", msg);
            io.emit("chat-message", msg); // reenvía a todos los clientes conectados
        });

        // Al conectar, enviar stock actual
        socket.emit("stockActualizado", productos);

        socket.on("agregarProducto", (data) => {
            let { codigo, nombre, precio = 0, cantidadUnidadesSueltas = 0 } = data;
            let p = productos.find(x => x.codigo === codigo);
            if (p) {
                p.cantidadUnidadesSueltas += cantidadUnidadesSueltas;  // ✅ suma lo nuevo
                if (precio) p.precio = precio;
            } else {
                productos.push({ codigo, nombre, precio, cantidadUnidadesSueltas });
            }
            guardarStock();
            io.emit("stockActualizado", productos);
        });

        socket.on("eliminarProducto", (codigo) => {
            const index = productos.findIndex(p => p.codigo === codigo);
            if (index !== -1) productos.splice(index, 1);
            guardarStock();
            io.emit("stockActualizado", productos);
        });

        socket.on("confirmarVenta", (items) => {
            items.forEach(({ codigo, cantidad }) => {
                const p = productos.find(x => x.codigo === codigo);
                if (p) {
                    p.cantidadUnidadesSueltas -= cantidad;
                    if (p.cantidadUnidadesSueltas < 0) p.cantidadUnidadesSueltas = 0;
                }
            });
            guardarStock();
            io.emit("stockActualizado", productos);
        });

        socket.on("disconnect", () => console.log("❌ Cliente desconectado:", socket.id));
    });

    return io;
}
