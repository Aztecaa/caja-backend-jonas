import { Server } from "socket.io";
import {
  productos,
  guardarStock,
  cargarStockInicial,
  hacerBackupDiario,
  exportarStockJSON,
  importarStockJSON,
} from "./stockHandler.js";
import {
  lotes,
  guardarLotes,
  cargarLotesInicial,
  normalizarLote,
  consumirLotesFEFO,
} from "./loteHandler.js";
import {
  bultos,
  guardarBultos,
  cargarBultosInicial,
  normalizarBulto,
} from "./bultoHandler.js";

export default async function initSocketServer(server, allowedOrigins) {
  await cargarStockInicial();
  await cargarLotesInicial();
  await cargarBultosInicial();
  console.log("🚀 Inicializando Socket.IO...");

  await hacerBackupDiario();
  setInterval(() => {
    hacerBackupDiario().catch(console.error);
  }, 6 * 60 * 60 * 1000);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  function normalizarProducto(data) {
    const precioVenta = Number(data.precioVenta ?? data.precio ?? 0) || 0;
    const precioCosto = Number(data.precioCosto ?? data.costo ?? 0) || 0;
    const cantidad = Number(data.cantidadUnidadesSueltas ?? data.cantidad ?? 0) || 0;
    return {
      codigo: String(data.codigo || "").trim(),
      nombre: (data.nombre || "Sin nombre").trim(),
      precioCosto,
      precioVenta,
      cantidadUnidadesSueltas: cantidad,
      enPromocion: Boolean(data.enPromocion),
      precio: precioVenta,
    };
  }

  io.on("connection", (socket) => {
    console.log(`🟢 Cliente conectado: ${socket.id}`);
    socket.emit("stockActualizado", productos);
    socket.emit("lotesActualizados", lotes);
    socket.emit("bultosActualizados", bultos);

    socket.on("agregarProducto", async (data) => {
      try {
        const prod = normalizarProducto(data);
        if (!prod.codigo) return;
        const idx = productos.findIndex((p) => p.codigo === prod.codigo);
        if (idx >= 0) productos[idx] = { ...productos[idx], ...prod };
        else productos.push(prod);
        await guardarStock();
        io.emit("stockActualizado", productos);
      } catch (err) {
        console.error("Error en agregarProducto:", err);
        socket.emit("errorStock", { msg: "No se pudo guardar el producto" });
      }
    });

    socket.on("eliminarProducto", async (codigo) => {
      try {
        const index = productos.findIndex((p) => p.codigo === codigo);
        if (index !== -1) {
          productos.splice(index, 1);
          await guardarStock();
          io.emit("stockActualizado", productos);
        }
      } catch (err) {
        console.error("Error en eliminarProducto:", err);
      }
    });

    socket.on("confirmarVenta", async (items) => {
      try {
        if (!Array.isArray(items)) return;
        items.forEach(({ codigo, cantidad }) => {
          const p = productos.find((x) => x.codigo === codigo);
          if (p) {
            p.cantidadUnidadesSueltas = Math.max(
              (p.cantidadUnidadesSueltas || 0) - (Number(cantidad) || 0),
              0
            );
          }
          consumirLotesFEFO(codigo, cantidad);
        });
        await guardarStock();
        await guardarLotes();
        io.emit("stockActualizado", productos);
        io.emit("lotesActualizados", lotes);
      } catch (err) {
        console.error("Error en confirmarVenta:", err);
      }
    });

    socket.on("agregarBulto", async (data) => {
      try {
        const bulto = normalizarBulto(data);
        if (!bulto.codigo || !bulto.unidadAsignada || !bulto.unidadesPorBulto) {
          socket.emit("errorStock", {
            msg: "Código, producto asignado y unidades por bulto son obligatorios",
          });
          return;
        }
        const idx = bultos.findIndex((b) => b.codigo === bulto.codigo);
        if (idx >= 0) bultos[idx] = { ...bultos[idx], ...bulto };
        else bultos.push(bulto);

        await guardarBultos();
        io.emit("bultosActualizados", bultos);
      } catch (err) {
        console.error("Error en agregarBulto:", err);
        socket.emit("errorStock", { msg: "No se pudo guardar el bulto" });
      }
    });

    socket.on("eliminarBulto", async (codigo) => {
      try {
        const index = bultos.findIndex((b) => b.codigo === codigo);
        if (index !== -1) {
          bultos.splice(index, 1);
          await guardarBultos();
          io.emit("bultosActualizados", bultos);
        }
      } catch (err) {
        console.error("Error en eliminarBulto:", err);
      }
    });

    // data: { id, codigoBulto, cantidadBultos, costoLote, fechaVencimiento }
    socket.on("agregarLote", async (data) => {
      try {
        const bulto = bultos.find((b) => b.codigo === data.codigoBulto);
        if (!bulto) {
          socket.emit("errorStock", { msg: "No existe un bulto con ese código" });
          return;
        }

        const lote = normalizarLote(data, bulto);
        if (!lote.id) {
          socket.emit("errorStock", { msg: "Falta el número/id de lote" });
          return;
        }

        const idx = lotes.findIndex((l) => l.id === lote.id);
        if (idx >= 0) lotes[idx] = { ...lotes[idx], ...lote };
        else lotes.push(lote);

        // Suma las unidades del lote al stock del producto unitario vinculado
        const prod = productos.find((p) => p.codigo === lote.unidadAsignada);
        if (prod) {
          prod.cantidadUnidadesSueltas =
            (prod.cantidadUnidadesSueltas || 0) + lote.unidadesContenidas;
        }

        await guardarLotes();
        await guardarStock();
        io.emit("lotesActualizados", lotes);
        io.emit("stockActualizado", productos);
      } catch (err) {
        console.error("Error en agregarLote:", err);
        socket.emit("errorStock", { msg: "No se pudo guardar el lote" });
      }
    });

    socket.on("eliminarLote", async (id) => {
      try {
        const index = lotes.findIndex((l) => l.id === id);
        if (index !== -1) {
          lotes.splice(index, 1);
          await guardarLotes();
          io.emit("lotesActualizados", lotes);
        }
      } catch (err) {
        console.error("Error en eliminarLote:", err);
      }
    });

    socket.on("exportarStock", async () => {
      try {
        const json = await exportarStockJSON();
        socket.emit("stockExportado", { json, fecha: new Date().toISOString() });
      } catch {
        socket.emit("errorStock", { msg: "Error al exportar" });
      }
    });

    socket.on("importarStock", async (data) => {
      try {
        const { json, reemplazar = false } = data || {};
        if (!json) {
          socket.emit("errorStock", { msg: "No se recibió JSON" });
          return;
        }
        await importarStockJSON(json, { reemplazar });
        io.emit("stockActualizado", productos);
        socket.emit("importacionOk", {
          total: productos.length,
          modo: reemplazar ? "reemplazo" : "merge",
        });
      } catch (err) {
        console.error("Error importando:", err);
        socket.emit("errorStock", { msg: err.message || "Error al importar" });
      }
    });

    socket.on("hacerBackup", async () => {
      await hacerBackupDiario();
      socket.emit("backupOk", { fecha: new Date().toISOString() });
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Cliente desconectado: ${socket.id}`);
    });
  });

  console.log("📡 Socket.IO listo");
  return io;
}