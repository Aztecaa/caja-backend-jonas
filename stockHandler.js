import fs from "fs/promises"
import { join } from "path"
import { productos } from "./routes/productos.js"

const STOCK_FILE = join(process.cwd(), "stock.json")

// === GUARDAR STOCK ===
export async function guardarStock() {
    try {
        await fs.writeFile(STOCK_FILE, JSON.stringify(productos, null, 2))
        console.log("💾 Stock guardado correctamente.")
    } catch (err) {
        console.error("❌ Error guardando stock:", err)
    }
}

// === CARGAR STOCK INICIAL ===
export async function cargarStockInicial() {
    try {
        await fs.access(STOCK_FILE).catch(async () => {
            console.log("⚠️ No existe stock.json, creando archivo vacío.")
            await fs.writeFile(STOCK_FILE, "[]")
        })

        const data = await fs.readFile(STOCK_FILE, "utf-8")
        const parsed = JSON.parse(data)

        if (Array.isArray(parsed)) {
            productos.splice(0, productos.length, ...parsed)
            console.log(`✅ Stock inicial cargado (${productos.length} productos).`)
        } else {
            console.warn("⚠️ stock.json no contiene un array válido. Se ignora contenido.")
        }
    } catch (err) {
        console.error("❌ Error leyendo stock.json:", err)
    }
}
