import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const allowedOrigins = [
  "http://localhost:5173", // Frontend local
  "https://cajerojonas.netlify.app", // Frontend producción
];

const app = express();
const server = createServer(app);

// Middleware CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman u otros
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

// Rutas API
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("API funcionando 🚀"));

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);
  socket.on("chat-message", (msg) => io.emit("chat-message", msg));
  socket.on("disconnect", () => console.log("❌ Cliente desconectado:", socket.id));
});

// Levantar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);
