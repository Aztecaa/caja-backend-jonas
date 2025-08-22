// routes/auth.js
import { Router } from "express"

const router = Router()

// ejemplo de usuario hardcodeado
const users = [
    { userName: "admin", password: "1234", rol: "supervisor" },
    { userName: "cajero", password: "1234", rol: "caja" }
]

router.post("/login", (req, res) => {
    const { userName, password } = req.body
    const user = users.find(u => u.userName === userName && u.password === password)

    if (!user) return res.status(401).json({ error: "Usuario o contraseña incorrectos" })

    // devolver datos mínimos
    return res.json({ userName: user.userName, rol: user.rol })
})

export default router
