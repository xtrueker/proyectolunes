import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    phone: user.phone,
  };
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET no está configurada.");
  }

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// REGISTRO
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, location, phone } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Nombre, correo y contraseña son obligatorios.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role || "BUYER";

    if (!["BUYER", "PRODUCER"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "El rol debe ser BUYER o PRODUCER.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Este correo ya está registrado.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole,
        location: location?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Cuenta registrada correctamente.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Error en registro:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible registrar la cuenta.",
    });
  }
});

// INICIO DE SESIÓN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Correo y contraseña son obligatorios.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectos.",
      });
    }

    return res.json({
      success: true,
      message: "Inicio de sesión correcto.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Error en inicio de sesión:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible iniciar sesión.",
    });
  }
});

// USUARIO AUTENTICADO
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        location: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "El usuario ya no existe.",
      });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("Error consultando usuario:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar el usuario.",
    });
  }
});
// ACTUALIZAR PERFIL
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const { name, location, phone } = req.body;

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "El nombre no puede estar vacío.",
      });
    }

    if (
      location !== undefined &&
      location !== null &&
      typeof location !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "La ubicación no es válida.",
      });
    }

    if (
      phone !== undefined &&
      phone !== null &&
      typeof phone !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "El teléfono no es válido.",
      });
    }

    const data = {};

    if (name !== undefined) data.name = name.trim();
    if (location !== undefined) data.location = location?.trim() || null;
    if (phone !== undefined) data.phone = phone?.trim() || null;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se enviaron datos para actualizar.",
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        location: true,
        phone: true,
      },
    });

    return res.json({
      success: true,
      message: "Perfil actualizado correctamente.",
      user,
    });
  } catch (error) {
    console.error("Error actualizando perfil:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible actualizar el perfil.",
    });
  }
});
export default router;
