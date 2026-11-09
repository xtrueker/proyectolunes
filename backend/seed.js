import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";
import {
  ensurePhase2Schema,
  seedLogisticsNetwork,
} from "./utils/ensurePhase2Schema.js";

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

  await ensurePhase2Schema(prisma);
  const nodesByName = await seedLogisticsNetwork(prisma);
  const barrancaNode = nodesByName.get("Barrancabermeja") || null;
  const cantagalloNode = nodesByName.get("Cantagallo") || null;
  const wilchesNode = nodesByName.get("Puerto Wilches") || null;
  const bucaramangaNode = nodesByName.get("Bucaramanga") || null;

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
    update: {
      originNodeId: barrancaNode?.id || null,
    },
    create: {
      name: "Finca El Progreso",
      email: "productor@agrored.local",
      passwordHash,
      role: "PRODUCER",
      location: "Barrancabermeja, Santander",
      phone: "3000000000",
      originNodeId: barrancaNode?.id || null,
    },
  });

  // 3. Crear comprador de demostración.
  const buyerPasswordHash = await bcrypt.hash("Comprador2026!", 10);

  const buyer = await prisma.user.upsert({
    where: {
      email: "comprador@agrored.local",
    },
    update: {
      originNodeId: bucaramangaNode?.id || null,
    },
    create: {
      name: "Comprador Demo",
      email: "comprador@agrored.local",
      passwordHash: buyerPasswordHash,
      role: "BUYER",
      location: "Bucaramanga, Santander",
      phone: "3010000000",
      originNodeId: bucaramangaNode?.id || null,
    },
  });

  // 4. Productos iniciales con sus nodos logísticos del Magdalena Medio.
  const products = [
    {
      name: "Arroz blanco",
      description: "Arroz blanco de producción regional.",
      price: 3200,
      quantity: 500,
      unit: "kg",
      category: "Granos y cereales",
      location: "Cantagallo, Bolívar",
      originNodeId: cantagalloNode?.id || barrancaNode?.id || null,
    },
    {
      name: "Plátano hartón",
      description: "Plátano fresco seleccionado para comercialización.",
      price: 2500,
      quantity: 300,
      unit: "kg",
      category: "Frutas",
      location: "Puerto Wilches, Santander",
      originNodeId: wilchesNode?.id || barrancaNode?.id || null,
    },
    {
      name: "Yuca fresca",
      description: "Yuca de cosecha regional.",
      price: 1800,
      quantity: 250,
      unit: "kg",
      category: "Tubérculos y raíces",
      location: "Barrancabermeja, Santander",
      originNodeId: barrancaNode?.id || null,
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
          location: item.location || producer.location,
          originNodeId: item.originNodeId,
        },
      });
    } else if (!existing.originNodeId && item.originNodeId) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          originNodeId: item.originNodeId,
          location: existing.location || item.location,
        },
      });
    }
  }

  // 5. Resumen de la carga.
  console.log("Categorías registradas:", categories.length);
  console.log("Nodos logísticos del Magdalena Medio:", nodesByName.size);
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
