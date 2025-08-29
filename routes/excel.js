// routes/excel.js
import express from 'express'
import multer from 'multer'
import nodemailer from 'nodemailer'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/send', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No se recibió ningún archivo' })
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail', // Cambia por el servicio que uses
            auth: {
                user: process.env.USER_EMAIL,
                pass: process.env.USER_PASSWORD,
            },
        })
        //logs
        console.log('Archivo recibido:', req.file);
        console.log('User y fecha:', req.body.user, req.body.fecha);
        console.log('Credenciales de mail:', process.env.USER_EMAIL ? 'ok' : 'missing', process.env.USER_PASSWORD ? 'ok' : 'missing');

        await transporter.sendMail({
            from: process.env.USER_EMAIL,
            to: 'aztecaned@gmail.com', // Cambiar al correo de destino
            subject: 'Reporte generado',
            text: `Se adjunta el archivo generado por ${req.body.user || 'usuario desconocido'} el ${req.body.fecha || 'fecha desconocida'}`,
            attachments: [
                {
                    filename: req.file.originalname,
                    content: req.file.buffer,
                },
            ],
        })

        res.json({ success: true, message: 'Correo enviado con éxito ✅' })
    } catch (err) {
        console.error('Error enviando correo:', err)
        res.status(500).json({ success: false, error: 'Error al enviar el correo' })
    }
})

export default router
