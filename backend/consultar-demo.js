
import { prisma } from "./prisma.js";

async function main() {
  console.log("Consultando registros de Agro-Red...\n");

  const buyer = await prisma.user.findUnique({
    where: {
      email: "comprador@agrored.local",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  const product = await prisma.product.findFirst({
    where: {
      name: "Arroz blanco",
    },
    select: {
      id: true,
      name: true,
      price: true,
      quantity: true,
      unit: true,
    },
  });

  console.log("COMPRADOR:");
  console.log(buyer);

  console.log("\nPRODUCTO:");
  console.log(product);

  if (!buyer) {
    console.log("\nERROR: No se encontró el comprador.");
  }

  if (!product) {
    console.log("\nERROR: No se encontró el producto.");
  }

  if (buyer && product) {
    console.log("\nVERIFICACIÓN: Los dos registros existen.");
  }
}

main()
  .catch((error) => {
    console.error("Error en la consulta:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
