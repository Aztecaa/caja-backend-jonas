import express from "express";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

console.log("📁 [excel.js] Módulo de reporte Excel cargado correctamente.");

// Configurar SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Ruta para recibir archivo Excel y enviarlo por correo
router.post("/", upload.single("file"), async (req, res) => {
    console.log("📨 Petición recibida en /api/report");
    console.log("📦 req.body:", req.body);
    console.log("📄 req.file:", req.file?.originalname);

    if (!req.file) {
        return res.status(400).json({ error: "Archivo no recibido" });
    }

    try {
        const msg = {
            to: "superjonas202@gmail.com", // destinatario (podés poner varios)
            from: process.env.USER_EMAIL, // remitente verificado en SendGrid
            subject: `📘 Reporte Excel - ${req.body.user}`,
            text: `Adjunto el reporte de cierre de caja del ${req.body.fecha}.`,
            attachments: [
                {
                    content: req.file.buffer.toString("base64"), // convertir a base64
                    filename: req.file.originalname,
                    type: req.file.mimetype,
                    disposition: "attachment",
                },
            ],
        };

        console.log("⏳ Intentando enviar correo con SendGrid...");
        await sgMail.send(msg);
        console.log("✅ Correo enviado correctamente");

        res.json({ success: true, message: "Correo enviado correctamente" });
    } catch (error) {
        console.error("❌ Error enviando correo:", error.response?.body || error);
        res.status(500).json({
            error: "Error enviando correo",
            details: error.message || error.response?.body,
        });
    }
});

export default router;