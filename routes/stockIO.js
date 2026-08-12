import express from "express";
import {
  productos,
  exportarStockJSON,
  importarStockJSON,
  hacerBackupDiario,
  getRutas,
} from "../stockHandler.js";
import ExcelJS from "exceljs";

const router = express.Router();

router.get("/export/json", async (req, res) => {
  try {
    const json = await exportarStockJSON();
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="stock-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.send(json);
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

router.get("/export/excel", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Stock");
    sheet.columns = [
      { header: "Código", key: "codigo", width: 18 },
      { header: "Nombre", key: "nombre", width: 32 },
      { header: "Precio Costo", key: "precioCosto", width: 14 },
      { header: "Precio Venta", key: "precioVenta", width: 14 },
      { header: "Stock", key: "cantidadUnidadesSueltas", width: 10 },
      { header: "En Promoción", key: "enPromocion", width: 14 },
      { header: "Ganancia Unit.", key: "ganancia", width: 14 },
      { header: "Margen %", key: "margen", width: 12 },
    ];

    productos.forEach((p) => {
      const costo = Number(p.precioCosto) || 0;
      const venta = Number(p.precioVenta) || 0;
      const ganancia = venta - costo;
      const margen = costo > 0 ? ((ganancia / costo) * 100).toFixed(1) : "0";
      sheet.addRow({
        codigo: p.codigo,
        nombre: p.nombre,
        precioCosto: costo,
        precioVenta: venta,
        cantidadUnidadesSueltas: p.cantidadUnidadesSueltas,
        enPromocion: p.enPromocion ? "SÍ" : "NO",
        ganancia,
        margen: Number(margen),
      });
    });

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="stock-${new Date().toISOString().slice(0, 10)}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

router.post("/import", express.json({ limit: "10mb" }), async (req, res) => {
  try {
    const { json, reemplazar = false } = req.body;
    if (!json) {
      return res.status(400).json({ ok: false, msg: "Falta el campo json" });
    }
    const resultado = await importarStockJSON(
      typeof json === "string" ? json : JSON.stringify(json),
      { reemplazar: Boolean(reemplazar) }
    );
    if (req.io) req.io.emit("stockActualizado", resultado);
    res.json({
      ok: true,
      total: resultado.length,
      modo: reemplazar ? "reemplazo" : "merge",
    });
  } catch (err) {
    res.status(400).json({ ok: false, msg: err.message });
  }
});

router.post("/backup", async (req, res) => {
  try {
    await hacerBackupDiario();
    res.json({ ok: true, msg: "Backup realizado", rutas: getRutas() });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

router.get("/info", (req, res) => {
  res.json({ totalProductos: productos.length, rutas: getRutas() });
});

export default router;