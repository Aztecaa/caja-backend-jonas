import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";

import authRoutes from "./routes/auth.js";
import excelExport from "./routes/excel.js";
import productosRoutes from "./routes/productos.js";
import stockIORoutes from "./routes/stockIO.js";
import initSocketServer from "./server.js";

dotenv.config();

const app = express();
const isLocal = !process.env.NODE_ENV || process.env.NODE_ENV === "development";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://cajerosuper.netlify.app",
  "https://caja-backend-jonas.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (isLocal) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS bloqueado: " + origin), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📥 [${req.method}] ${req.originalUrl}`);
  next();
});

app.get("/", (req, res) =>
  res.json({
    ok: true,
    msg: "API Caja funcionando",
    modo: isLocal ? "local/exe" : "server",
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/report", excelExport);
app.use("/api/productos", productosRoutes);
app.use("/api/stock", stockIORoutes);

const server = createServer(app);

(async () => {
  try {
    const io = await initSocketServer(server, isLocal ? true : allowedOrigins);

    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📁 Datos en: ${process.cwd()}/data/`);
    });
  } catch (err) {
    console.error("❌ Error iniciando servidor:", err);
    process.exit(1);
  }
})();

app.use((err, req, res, next) => {
  console.error("❌ Error global:", err.message);
  res.status(500).json({ success: false, error: "Error interno del servidor" });
});