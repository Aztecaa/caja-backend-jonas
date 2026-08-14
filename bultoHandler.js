import fs from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export let bultos = [];

const DATA_DIR = join(process.cwd(), "data");
const BULTOS_FILE = join(DATA_DIR, "bultos.json");

async function ensureDir() {
  if (!existsSync(DATA_DIR)) await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeAtomic(filePath, data) {
  const tmp = filePath + ".tmp";
  await fs.writeFile(tmp, data, "utf-8");
  await fs.rename(tmp, filePath);
}

export async function guardarBultos() {
  try {
    await ensureDir();
    await writeAtomic(BULTOS_FILE, JSON.stringify(bultos, null, 2));
    console.log(`💾 Bultos guardados (${bultos.length})`);
  } catch (err) {
    console.error("❌ Error guardando bultos:", err);
  }
}

export async function cargarBultosInicial() {
  try {
    await ensureDir();
    if (!existsSync(BULTOS_FILE)) {
      await writeAtomic(BULTOS_FILE, "[]");
      bultos.length = 0;
      return;
    }
    const data = await fs.readFile(BULTOS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return;
    bultos.length = 0;
    bultos.push(...parsed);
    console.log(`✅ Bultos cargados (${bultos.length})`);
  } catch (err) {
    console.error("❌ Error leyendo bultos.json:", err);
  }
}

export function normalizarBulto(data) {
  return {
    codigo: String(data.codigo || "").trim(),
    nombre: (data.nombre || "Sin nombre").trim(),
    unidadAsignada: String(data.unidadAsignada || "").trim(),
    unidadesPorBulto: Number(data.unidadesPorBulto) || 0,
  };
}

export function getRutasBultos() {
  return { BULTOS_FILE, DATA_DIR };
}
