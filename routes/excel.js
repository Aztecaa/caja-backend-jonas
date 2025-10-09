import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

console.log("📁 [excel.js] Módulo de reporte Excel cargado correctamente.");

// Ruta para recibir archivo Excel y enviarlo por correo
router.post("/", upload.single("file"), async (req, res) => {
    console.log("📨 Petición recibida en /api/report");
    console.log("📦 req.body:", req.body);
    console.log("📄 req.file:", req.file?.originalname);

    if (!req.file) return res.status(400).json({ error: "Archivo no recibido" });

    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.USER_EMAIL,
                pass: process.env.USER_PASSWORD,
            },
            connectionTimeout: 8000,
        });

        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: ("mariojonas972@hotmail.es", "aztecaned@gmail.com"),
            subject: `📘 Reporte Excel - ${req.body.user}`,
            text: "Adjunto el reporte de cierre de caja en formato Excel.",
            attachments: [
                {
                    filename: req.file.originalname,
                    content: req.file.buffer,
                    contentType: req.file.mimetype,
                },
            ],
        };

        console.log("⏳ Intentando enviar correo...");
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Correo enviado:", info.response);

        res.json({ success: true, message: "Correo enviado correctamente" });
    } catch (error) {
        console.error("❌ Error enviando correo:", error);
        res.status(500).json({ error: "Error enviando correo", details: error.message });
    }
});

export default router;
