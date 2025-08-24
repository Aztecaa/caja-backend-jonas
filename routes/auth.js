//auth.js
import { Router } from "express";
import { login, registrar } from "../controllers/authController.js";

const router = Router();

router.post("/api/auth/login", login);
router.post("/register", registrar); // opcional, aunque deshabilitado

export default router;