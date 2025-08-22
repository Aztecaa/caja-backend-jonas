// authController.js
import dotenv from 'dotenv';
dotenv.config();

export const login = (req, res) => {
  const usuarios = [
    { userName: process.env.USER1_USERNAME, password: process.env.USER1_PASSWORD, rol: process.env.USER1_ROLE },
    { userName: process.env.USER2_USERNAME, password: process.env.USER2_PASSWORD, rol: process.env.USER2_ROLE },
  ];

  const { userName, password } = req.body;

  console.log('Intento de login con:', { userName, password });/*  */
  console.log('Usuarios autorizados:', usuarios);/*  */

  const usuario = usuarios.find(u => u.userName.toLowerCase() === userName.toLowerCase().trim() &&
    u.password === password.trim());

  if (usuario) {
    return res.json({
      mensaje: 'Login exitoso',
      rol: usuario.rol,
      userName: usuario.userName
    });
  }
  console.log('Login fallido');/*  */
  return res.status(401).json({ error: 'Credenciales inválidas' });
};

// Deshabilitamos el registro
export const registrar = (req, res) => {
  return res.status(403).json({ error: 'Registro deshabilitado en esta app' });
};