/* import express from "express";
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
            to: ("aztecaned@gmail.com"),
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
 */
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
            to: "aztecaned@gmail.com", // destinatario (podés poner varios)
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