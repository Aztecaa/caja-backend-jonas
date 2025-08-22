// index.js
import express from "express"
import cors from "cors"
import authRoutes from "./routes/auth.js"
import { createServer } from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const server = createServer(app) // ✅ un solo servidor HTTP

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://tu-app.netlify.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Middlewares
app.use(express.json())
app.use(cors({
  origin: ["http://localhost:5173", "https://tu-app.netlify.app"],
  credentials: true,
}))

// Rutas API
app.use("/api/auth", authRoutes)

app.get("/", (req, res) => {
  res.send("API funcionando correctamente 🚀")
})

// Eventos de Socket.IO
io.on("connection", (socket) => {
  console.log("🔌 Nuevo cliente conectado:", socket.id)

  socket.on("chat-message", (msg) => {
    console.log("📨 Mensaje recibido:", msg)
    // reenvía a todos los clientes (incluido el emisor si querés)
    io.emit("chat-message", msg)
  })

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id)
  })
})

// Levantar el servidor en un solo lugar
const PORT = process.env.PORT || 3000
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})
