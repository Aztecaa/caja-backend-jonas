import { Server } from "socket.io";
import { productos } from "./routes/productos.js";
import { guardarStock, cargarStockInicial } from "./stockHandler.js";
import { initChat } from "./routes/chatHandler.js";

export default async function initSocketServer(server, allowedOrigins) {
    await cargarStockInicial();
    console.log("🚀 Inicializando Socket.IO...");

    const io = new Server(server, {
        cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
    });

    io.on("connection", async (socket) => {
        console.log(`🟢 Cliente conectado: ${socket.id}`);

        // === CHAT ===
        initChat(io, socket);

        // === STOCK ===
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