import fs from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export let productos = [];

const DATA_DIR = join(process.cwd(), "data");
const STOCK_FILE = join(DATA_DIR, "stock.json");
const BACKUP_DIR = join(DATA_DIR, "backups");

async function ensureDirs() {
  for (const dir of [DATA_DIR, BACKUP_DIR]) {
    if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });
  }
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function ahora() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeAtomic(filePath, data) {
  const tmp = filePath + ".tmp";
  await fs.writeFile(tmp, data, "utf-8");
  await fs.rename(tmp, filePath);
}

export async function guardarStock() {
  try {
    await ensureDirs();
    await writeAtomic(STOCK_FILE, JSON.stringify(productos, null, 2));
    console.log(`💾 Stock guardado (${productos.length} productos)`);
  } catch (err) {
    console.error("❌ Error guardando stock:", err);
    try {
      const emergency = join(DATA_DIR, `stock-EMERGENCY-${ahora()}.json`);
      await fs.writeFile(emergency, JSON.stringify(productos, null, 2));
      console.error("⚠️ Guardado de emergencia en:", emergency);
    } catch (e2) {
      console.error("💀 Falló guardado de emergencia:", e2);
    }
  }
}

export async function hacerBackupDiario() {
  try {
    await ensureDirs();
    if (!existsSync(STOCK_FILE)) return;
    const backupPath = join(BACKUP_DIR, `stock-${hoy()}.json`);
    await fs.copyFile(STOCK_FILE, backupPath);
    console.log(`📦 Backup diario: stock-${hoy()}.json`);
    await limpiarBackupsAntiguos(30);
  } catch (err) {
    console.error("❌ Error backup diario:", err);
  }
}

async function limpiarBackupsAntiguos(dias = 30) {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
    for (const file of files) {
      if (!file.startsWith("stock-") || !file.endsWith(".json")) continue;
      const full = join(BACKUP_DIR, file);
      const stat = await fs.stat(full);
      if (stat.mtimeMs < limite) {
        await fs.unlink(full);
        console.log(`🗑️ Backup antiguo eliminado: ${file}`);
      }
    }
  } catch (err) {
    console.error("Error limpiando backups:", err);
  }
}

export async function cargarStockInicial() {
  try {
    await ensureDirs();

    const oldPath = join(process.cwd(), "stock.json");
    if (existsSync(oldPath) && !existsSync(STOCK_FILE)) {
      await fs.rename(oldPath, STOCK_FILE);
      console.log("📦 Migrado stock.json → data/stock.json");
    }

    if (!existsSync(STOCK_FILE)) {
      console.log("⚠️ No existe stock.json, creando vacío.");
      await writeAtomic(STOCK_FILE, "[]");
      productos.length = 0;
      return;
    }

    const data = await fs.readFile(STOCK_FILE, "utf-8");
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      console.error("❌ stock.json corrupto. Recuperando backup...");
      const recuperado = await recuperarDesdeBackup();
      if (recuperado) {
        productos.length = 0;
        productos.push(...recuperado);
        await guardarStock();
        return;
      }
      throw new Error("No se pudo recuperar el stock");
    }

    if (!Array.isArray(parsed)) {
      console.warn("⚠️ stock.json no es un array.");
      return;
    }

    const normalizados = parsed.map((p) => ({
      codigo: String(p.codigo || ""),
      nombre: p.nombre || "Sin nombre",
      precioCosto: Number(p.precioCosto ?? p.costo ?? 0) || 0,
      precioVenta: Number(p.precioVenta ?? p.precio ?? 0) || 0,
      cantidadUnidadesSueltas: Number(p.cantidadUnidadesSueltas ?? p.cantidad ?? 0) || 0,
      enPromocion: Boolean(p.enPromocion),
      precio: Number(p.precioVenta ?? p.precio ?? 0) || 0,
    }));

    productos.length = 0;
    productos.push(...normalizados);
    console.log(`✅ Stock cargado (${productos.length} productos)`);
    await hacerBackupDiario();
  } catch (err) {
    console.error("❌ Error leyendo stock.json:", err);
  }
}

async function recuperarDesdeBackup() {
  try {
    const files = (await fs.readdir(BACKUP_DIR))
      .filter((f) => f.startsWith("stock-") && f.endsWith(".json"))
      .sort()
      .reverse();
    for (const file of files) {
      try {
        const raw = await fs.readFile(join(BACKUP_DIR, file), "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          console.log(`✅ Recuperado desde backup: ${file}`);
          return parsed;
        }
      } catch {
        continue;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export async function exportarStockJSON() {
  await ensureDirs();
  return JSON.stringify(productos, null, 2);
}

export async function importarStockJSON(jsonString, { reemplazar = false } = {}) {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error("El archivo no contiene un array de productos");
  }

  const normalizados = parsed
    .map((p) => ({
      codigo: String(p.codigo || "").trim(),
      nombre: (p.nombre || "Sin nombre").trim(),
      precioCosto: Number(p.precioCosto ?? p.costo ?? 0) || 0,
      precioVenta: Number(p.precioVenta ?? p.precio ?? 0) || 0,
      cantidadUnidadesSueltas: Number(p.cantidadUnidadesSueltas ?? p.cantidad ?? 0) || 0,
      enPromocion: Boolean(p.enPromocion),
      precio: Number(p.precioVenta ?? p.precio ?? 0) || 0,
    }))
    .filter((p) => p.codigo);

  if (reemplazar) {
    await hacerBackupDiario();
    const preImport = join(BACKUP_DIR, `pre-import-${ahora()}.json`);
    await fs.writeFile(preImport, JSON.stringify(productos, null, 2));
    productos.length = 0;
    productos.push(...normalizados);
  } else {
    for (const nuevo of normalizados) {
      const idx = productos.findIndex((p) => p.codigo === nuevo.codigo);
      if (idx >= 0) productos[idx] = { ...productos[idx], ...nuevo };
      else productos.push(nuevo);
    }
  }

  await guardarStock();
  await hacerBackupDiario();
  return productos;
}

export function getRutas() {
  return { STOCK_FILE, BACKUP_DIR, DATA_DIR };
}