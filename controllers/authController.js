import dotenv from "dotenv";
dotenv.config();

// Función para cargar los usuarios desde .env
const cargarUsuarios = () => [
  {
    userName: process.env.USER1_USERNAME,
    password: process.env.USER1_PASSWORD,
    rol: process.env.USER1_ROLE,
  },
  {
    userName: process.env.USER2_USERNAME,
    password: process.env.USER2_PASSWORD,
    rol: process.env.USER2_ROLE,
  },
];

export const login = (req, res) => {
  try {
    const usuarios = cargarUsuarios();
    const { userName, password } = req.body;

    console.log("Intento de login con:", { userName, password });

    // Validación simple
    if (!userName || !password) {
      return res.status(400).json({ error: "Faltan credenciales" });
    }

    const usuario = usuarios.find(
      (u) =>
        u.userName.toLowerCase().trim() === userName.toLowerCase().trim() &&
        u.password === password.trim()
    );

    if (usuario) {
      return res.json({
        mensaje: "Login exitoso",
        rol: usuario.rol,
        userName: usuario.userName,
      });
    }

    console.log("Login fallido");
    return res.status(401).json({ error: "Credenciales inválidas" });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Registro deshabilitado
export const registrar = (req, res) => {
  return res.status(403).json({ error: "Registro deshabilitado en esta app" });
};
