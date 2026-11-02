
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "./generated/prisma/client.ts";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const categories = [
  "Frutas",
  "Hortalizas y verduras",
  "Tubérculos y raíces",
  "Granos y cereales",
  "Café y cacao",
  "Productos pecuarios",
  "Lácteos y derivados",
  "Pescados y acuicultura",
];

async function main() {
  console.log("Iniciando carga de datos...");

  // 1. Crear categorías sin duplicarlas.
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2. Crear productor de demostración.
  const passwordHash = await bcrypt.hash("AgroRed2026!", 10);

  const producer = await prisma.user.upsert({
    where: {
      email: "productor@agrored.local",
    },
    update: {},
    create: {
      name: "Finca El Progreso",
      email: "productor@agrored.local",
      passwordHash,
      role: "PRODUCER",
      location: "Barrancabermeja, Santander",
      phone: "3000000000",
    },
  });

  // 3. Crear comprador de demostración.
  const buyerPasswordHash = await bcrypt.hash(
    "Comprador2026!",
    10
  );

  const buyer = await prisma.user.upsert({
    where: {
      email: "comprador@agrored.local",
    },
    update: {},
    create: {
      name: "Comprador Demo",
      email: "comprador@agrored.local",
      passwordHash: buyerPasswordHash,
      role: "BUYER",
      location: "Barrancabermeja, Santander",
      phone: "3010000000",
    },
  });

  // 4. Productos iniciales.
  const products = [
    {
      name: "Arroz blanco",
      description: "Arroz blanco de producción regional.",
      price: 3200,
      quantity: 500,
      unit: "kg",
      category: "Granos y cereales",
    },
    {
      name: "Plátano hartón",
      description: "Plátano fresco seleccionado para comercialización.",
      price: 2500,
      quantity: 300,
      unit: "kg",
      category: "Frutas",
    },
    {
      name: "Yuca fresca",
      description: "Yuca de cosecha regional.",
      price: 1800,
      quantity: 250,
      unit: "kg",
      category: "Tubérculos y raíces",
    },
  ];

  for (const item of products) {
    const category = await prisma.category.findUnique({
      where: { name: item.category },
    });

    if (!category) {
      throw new Error(`No se encontró la categoría: ${item.category}`);
    }

    const existing = await prisma.product.findFirst({
      where: {
        name: item.name,
        producerId: producer.id,
      },
    });

    if (!existing) {
      await prisma.product.create({
        data: {
          name: item.name,
          description: item.description,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          producerId: producer.id,
          categoryId: category.id,
          location: producer.location,
        },
      });
    }
  }

  // 5. Resumen de la carga.
  console.log("Categorías registradas:", categories.length);
  console.log("Productor de demostración:", producer.email);
  console.log("Comprador de demostración:", buyer.email);
  console.log("Productos de demostración procesados:", products.length);
  console.log("Carga de datos completada.");
}

main()
  .catch((error) => {
    console.error("Error al cargar datos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
