import fs from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export let lotes = [];

const DATA_DIR = join(process.cwd(), "data");
const LOTES_FILE = join(DATA_DIR, "lotes.json");

async function ensureDir() {
  if (!existsSync(DATA_DIR)) await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeAtomic(filePath, data) {
  const tmp = filePath + ".tmp";
  await fs.writeFile(tmp, data, "utf-8");
  await fs.rename(tmp, filePath);
}

export async function guardarLotes() {
  try {
    await ensureDir();
    await writeAtomic(LOTES_FILE, JSON.stringify(lotes, null, 2));
    console.log(`💾 Lotes guardados (${lotes.length})`);
  } catch (err) {
    console.error("❌ Error guardando lotes:", err);
  }
}

export async function cargarLotesInicial() {
  try {
    await ensureDir();
    if (!existsSync(LOTES_FILE)) {
      await writeAtomic(LOTES_FILE, "[]");
      lotes.length = 0;
      return;
    }
    const data = await fs.readFile(LOTES_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return;
    lotes.length = 0;
    lotes.push(...parsed);
    console.log(`✅ Lotes cargados (${lotes.length})`);
  } catch (err) {
    console.error("❌ Error leyendo lotes.json:", err);
  }
}

// data: { id, codigoBulto, cantidadBultos, costoLote, fechaVencimiento }
// bulto: { codigo, unidadAsignada, unidadesPorBulto }
export function normalizarLote(data, bulto) {
  const cantidadBultos = Number(data.cantidadBultos) || 0;
  const unidadesPorBulto = Number(bulto?.unidadesPorBulto) || 0;
  const unidadesContenidas = cantidadBultos * unidadesPorBulto;
  const costoLote = Number(data.costoLote) || 0;

  return {
    id: String(data.id || "").trim(),
    codigoBulto: String(data.codigoBulto || bulto?.codigo || "").trim(),
    unidadAsignada: String(bulto?.unidadAsignada || "").trim(),
    cantidadBultos,
    costoLote,
    unidadesContenidas,
    precioUnitario:
      unidadesContenidas > 0 ? Number((costoLote / unidadesContenidas).toFixed(2)) : 0,
    cantidadActual:
      data.cantidadActual !== undefined
        ? Number(data.cantidadActual) || 0
        : unidadesContenidas,
    fechaVencimiento: String(data.fechaVencimiento || ""),
    fechaIngreso: data.fechaIngreso || new Date().toISOString().slice(0, 10),
  };
}

// Consume unidades de los lotes de un producto, primero los que vencen antes (FEFO)
export function consumirLotesFEFO(codigoUnidadAsignada, cantidad) {
  let restante = Number(cantidad) || 0;
  if (restante <= 0) return;

  const lotesDelProducto = lotes
    .filter((l) => l.unidadAsignada === codigoUnidadAsignada && l.cantidadActual > 0)
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  for (const lote of lotesDelProducto) {
    if (restante <= 0) break;
    const descuento = Math.min(lote.cantidadActual, restante);
    lote.cantidadActual -= descuento;
    restante -= descuento;
  }
}

export function getRutasLotes() {
  return { LOTES_FILE, DATA_DIR };
}
