// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import excelExport from "./routes/excel.js";
import { createServer } from "http";
import initSocketServer from "./server.js"; // 👈 nuevo
import productosRoutes from "./routes/productos.js";

dotenv.config();

const allowedOrigins = [
  "http://localhost:5173",
  "https://cajerojonas.netlify.app",
  "https://caja-backend-jonas.onrender.com",
];

const app = express();

// Middleware CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.includes(origin)) {
        return callback(new Error("CORS no permite este origen: " + origin), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (req, res) => res.send("API funcionando 🚀"));
app.use("/api/auth", authRoutes);
app.use("/api/report", excelExport);
app.use("/api/productos", productosRoutes);

// Crear servidor HTTP
const server = createServer(app);

// 👉 inicializar socket.io en archivo separado
initSocketServer(server, allowedOrigins);

// Levantar el server
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);
