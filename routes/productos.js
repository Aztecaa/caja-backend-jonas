import express from "express";
import { productos, guardarStock } from "../stockHandler.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(productos);
});

router.post("/", async (req, res) => {
  try {
    let {
      codigo = "",
      nombre = "",
      precioCosto = 0,
      precioVenta = 0,
      cantidadUnidadesSueltas = 0,
      enPromocion = false,
    } = req.body;

    if (req.body.precio !== undefined && !precioVenta) {
      precioVenta = Number(req.body.precio) || 0;
    }
    if (req.body.cantidad !== undefined && !cantidadUnidadesSueltas) {
      cantidadUnidadesSueltas = Number(req.body.cantidad) || 0;
    }
    if (!codigo) {
      return res.status(400).json({ ok: false, msg: "El código es obligatorio" });
    }

    precioCosto = Number(precioCosto) || 0;
    precioVenta = Number(precioVenta) || 0;
    cantidadUnidadesSueltas = Number(cantidadUnidadesSueltas) || 0;
    enPromocion = Boolean(enPromocion);
    nombre = (nombre || "").trim() || "Sin nombre";

    const existente = productos.find((p) => p.codigo === codigo);
    if (existente) {
      existente.nombre = nombre;
      existente.precioCosto = precioCosto;
      existente.precioVenta = precioVenta;
      existente.cantidadUnidadesSueltas = cantidadUnidadesSueltas;
      existente.enPromocion = enPromocion;
      existente.precio = precioVenta;
    } else {
      productos.push({
        codigo,
        nombre,
        precioCosto,
        precioVenta,
        cantidadUnidadesSueltas,
        enPromocion,
        precio: precioVenta,
      });
    }

    await guardarStock();
    if (req.io) req.io.emit("stockActualizado", productos);
    res.json({ ok: true, productos });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

router.delete("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const index = productos.findIndex((p) => p.codigo === codigo);
    if (index === -1) {
      return res.status(404).json({ ok: false, msg: "Producto no encontrado" });
    }
    productos.splice(index, 1);
    await guardarStock();
    if (req.io) req.io.emit("stockActualizado", productos);
    res.json({ ok: true, productos });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

export default router;