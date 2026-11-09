export const MAGDALENA_NODES = [
  {
    name: "Barrancabermeja",
    type: "MIXED_PORT",
    department: "Santander",
    latitude: 7.0653,
    longitude: -73.8547,
  },
  {
    name: "Puerto Wilches",
    type: "MIXED_PORT",
    department: "Santander",
    latitude: 7.3483,
    longitude: -73.8997,
  },
  {
    name: "Cantagallo",
    type: "FLUVIAL_PORT",
    department: "Bolívar",
    latitude: 7.3761,
    longitude: -73.9197,
  },
  {
    name: "San Pablo",
    type: "MIXED_PORT",
    department: "Bolívar",
    latitude: 7.4769,
    longitude: -73.9242,
  },
  {
    name: "Simití",
    type: "FLUVIAL_PORT",
    department: "Bolívar",
    latitude: 7.9547,
    longitude: -73.9469,
  },
  {
    name: "Yondó",
    type: "MIXED_PORT",
    department: "Antioquia",
    latitude: 7.0058,
    longitude: -73.9092,
  },
  {
    name: "Puerto Berrío",
    type: "MIXED_PORT",
    department: "Antioquia",
    latitude: 6.4906,
    longitude: -74.4033,
  },
  {
    name: "Gamarra",
    type: "MIXED_PORT",
    department: "Cesar",
    latitude: 8.3208,
    longitude: -73.7431,
  },
  {
    name: "Bucaramanga",
    type: "LAND_HUB",
    department: "Santander",
    latitude: 7.1193,
    longitude: -73.1227,
  },
  {
    name: "Aguachica",
    type: "LAND_HUB",
    department: "Cesar",
    latitude: 8.3081,
    longitude: -73.6167,
  },
];

// Tramos bidireccionales reales/representativos del corredor Río Magdalena + Ruta del Sol.
export const MAGDALENA_CORRIDORS = [
  // Corredor Fluvial Río Magdalena
  {
    from: "Puerto Berrío",
    to: "Yondó",
    mode: "FLUVIAL",
    distanceKm: 78,
    costPerTon: 95000,
    estimatedHours: 3.8,
    transferFee: 45000,
  },
  {
    from: "Yondó",
    to: "Barrancabermeja",
    mode: "FLUVIAL",
    distanceKm: 14,
    costPerTon: 48000,
    estimatedHours: 0.7,
    transferFee: 35000,
  },
  {
    from: "Barrancabermeja",
    to: "Puerto Wilches",
    mode: "FLUVIAL",
    distanceKm: 42,
    costPerTon: 68000,
    estimatedHours: 1.9,
    transferFee: 42000,
  },
  {
    from: "Puerto Wilches",
    to: "Cantagallo",
    mode: "FLUVIAL",
    distanceKm: 8,
    costPerTon: 38000,
    estimatedHours: 0.45,
    transferFee: 32000,
  },
  {
    from: "Cantagallo",
    to: "San Pablo",
    mode: "FLUVIAL",
    distanceKm: 18,
    costPerTon: 46000,
    estimatedHours: 0.85,
    transferFee: 35000,
  },
  {
    from: "San Pablo",
    to: "Simití",
    mode: "FLUVIAL",
    distanceKm: 64,
    costPerTon: 88000,
    estimatedHours: 2.9,
    transferFee: 45000,
  },
  {
    from: "Simití",
    to: "Gamarra",
    mode: "FLUVIAL",
    distanceKm: 58,
    costPerTon: 82000,
    estimatedHours: 2.6,
    transferFee: 48000,
  },

  // Corredor Terrestre Vial
  {
    from: "Puerto Berrío",
    to: "Barrancabermeja",
    mode: "TERRESTRE",
    distanceKm: 128,
    costPerTon: 195000,
    estimatedHours: 2.4,
    transferFee: 45000,
  },
  {
    from: "Yondó",
    to: "Barrancabermeja",
    mode: "TERRESTRE",
    distanceKm: 19,
    costPerTon: 78000,
    estimatedHours: 0.5,
    transferFee: 35000,
  },
  {
    from: "Barrancabermeja",
    to: "Puerto Wilches",
    mode: "TERRESTRE",
    distanceKm: 54,
    costPerTon: 132000,
    estimatedHours: 1.2,
    transferFee: 42000,
  },
  {
    from: "Barrancabermeja",
    to: "Bucaramanga",
    mode: "TERRESTRE",
    distanceKm: 116,
    costPerTon: 185000,
    estimatedHours: 2.5,
    transferFee: 45000,
  },
  {
    from: "Puerto Wilches",
    to: "Bucaramanga",
    mode: "TERRESTRE",
    distanceKm: 142,
    costPerTon: 215000,
    estimatedHours: 3.1,
    transferFee: 42000,
  },
  {
    from: "Barrancabermeja",
    to: "Aguachica",
    mode: "TERRESTRE",
    distanceKm: 172,
    costPerTon: 255000,
    estimatedHours: 3.0,
    transferFee: 48000,
  },
  {
    from: "San Pablo",
    to: "Aguachica",
    mode: "TERRESTRE",
    distanceKm: 135,
    costPerTon: 235000,
    estimatedHours: 3.3,
    transferFee: 42000,
  },
  {
    from: "Gamarra",
    to: "Aguachica",
    mode: "TERRESTRE",
    distanceKm: 16,
    costPerTon: 65000,
    estimatedHours: 0.4,
    transferFee: 48000,
  },
  {
    from: "Aguachica",
    to: "Bucaramanga",
    mode: "TERRESTRE",
    distanceKm: 168,
    costPerTon: 248000,
    estimatedHours: 3.4,
    transferFee: 45000,
  },
];

// Garantiza de forma idempotente en Supabase PostgreSQL que todas las tablas (Fase 1 + Fase 2 + Innovación),
// índices y columnas aditivas existan antes de operar o sembrar datos.
export async function ensurePhase2Schema(prisma) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LogisticsNode" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "department" TEXT NOT NULL,
      "latitude" DOUBLE PRECISION,
      "longitude" DOUBLE PRECISION,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsNode_name_key" ON "LogisticsNode"("name")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'BUYER',
      "location" TEXT,
      "phone" TEXT,
      "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "price" DOUBLE PRECISION NOT NULL,
      "quantity" DOUBLE PRECISION NOT NULL,
      "unit" TEXT NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "location" TEXT,
      "imageUrl" TEXT,
      "perishability" TEXT,
      "producerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RouteSegment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "originId" TEXT NOT NULL REFERENCES "LogisticsNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "destinationId" TEXT NOT NULL REFERENCES "LogisticsNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "mode" TEXT NOT NULL,
      "distanceKm" DOUBLE PRECISION NOT NULL,
      "costPerTon" DOUBLE PRECISION NOT NULL,
      "estimatedHours" DOUBLE PRECISION NOT NULL,
      "transferFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "RouteSegment_originId_destinationId_mode_key"
    ON "RouteSegment"("originId", "destinationId", "mode")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ShipmentPool" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "originNodeId" TEXT NOT NULL REFERENCES "LogisticsNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "destNodeId" TEXT NOT NULL REFERENCES "LogisticsNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "mode" TEXT NOT NULL,
      "departureDate" TIMESTAMP(3) NOT NULL,
      "maxCapacityKg" DOUBLE PRECISION NOT NULL,
      "currentWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalFreightCost" DOUBLE PRECISION NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PurchaseRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "quantity" DOUBLE PRECISION NOT NULL,
      "unitPriceAtRequest" DOUBLE PRECISION NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "origin" TEXT,
      "destination" TEXT,
      "transportType" TEXT,
      "notes" TEXT,
      "imageUrl" TEXT,
      "counterPrice" DOUBLE PRECISION,
      "counterDate" TIMESTAMP(3),
      "negotiationNotes" TEXT,
      "freightCostEstimated" DOUBLE PRECISION,
      "allocatedFreightCost" DOUBLE PRECISION,
      "escrowStatus" TEXT,
      "escrowTotalAmount" DOUBLE PRECISION,
      "escrowReleasedAmount" DOUBLE PRECISION DEFAULT 0,
      "escrowUpdatedAt" TIMESTAMP(3),
      "buyerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "destNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "poolId" TEXT REFERENCES "ShipmentPool"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrackingEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "purchaseRequestId" TEXT NOT NULL REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "stage" TEXT NOT NULL,
      "notes" TEXT,
      "evidenceImageUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Columnas aditivas idempotentes por si el esquema de Supabase ya tenía tablas Fase 1 previas
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "perishability" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE`);

  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "counterPrice" DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "counterDate" TIMESTAMP(3)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "negotiationNotes" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "freightCostEstimated" DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "allocatedFreightCost" DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "escrowStatus" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "escrowTotalAmount" DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "escrowReleasedAmount" DOUBLE PRECISION DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "escrowUpdatedAt" TIMESTAMP(3)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "destNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "poolId" TEXT REFERENCES "ShipmentPool"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
}

// Carga los nodos del Magdalena Medio, los tramos multimodales y pools demostrativos abiertos.
export async function seedLogisticsNetwork(prisma) {
  const nodesByName = new Map();

  for (const item of MAGDALENA_NODES) {
    const saved = await prisma.logisticsNode.upsert({
      where: { name: item.name },
      update: {
        type: item.type,
        department: item.department,
        latitude: item.latitude,
        longitude: item.longitude,
      },
      create: item,
    });
    nodesByName.set(saved.name, saved);
  }

  for (const corridor of MAGDALENA_CORRIDORS) {
    const fromNode = nodesByName.get(corridor.from);
    const toNode = nodesByName.get(corridor.to);
    if (!fromNode || !toNode) continue;

    const pairs = [
      { originId: fromNode.id, destinationId: toNode.id },
      { originId: toNode.id, destinationId: fromNode.id },
    ];

    for (const pair of pairs) {
      await prisma.routeSegment.upsert({
        where: {
          originId_destinationId_mode: {
            originId: pair.originId,
            destinationId: pair.destinationId,
            mode: corridor.mode,
          },
        },
        update: {
          distanceKm: corridor.distanceKm,
          costPerTon: corridor.costPerTon,
          estimatedHours: corridor.estimatedHours,
          transferFee: corridor.transferFee,
        },
        create: {
          originId: pair.originId,
          destinationId: pair.destinationId,
          mode: corridor.mode,
          distanceKm: corridor.distanceKm,
          costPerTon: corridor.costPerTon,
          estimatedHours: corridor.estimatedHours,
          transferFee: corridor.transferFee,
        },
      });
    }
  }

  // Vincular productos existentes sin originNodeId a Barrancabermeja por defecto si coinciden.
  const barranca = nodesByName.get("Barrancabermeja");
  const bucaramanga = nodesByName.get("Bucaramanga");
  const wilches = nodesByName.get("Puerto Wilches");
  const cantagallo = nodesByName.get("Cantagallo");

  if (barranca) {
    await prisma.product.updateMany({
      where: {
        originNodeId: null,
        location: { contains: "Barrancabermeja" },
      },
      data: { originNodeId: barranca.id },
    });
  }

  // Crear pools colaborativos abiertos iniciales si aún no hay ninguno abierto.
  const openPoolsCount = await prisma.shipmentPool.count({
    where: { status: "OPEN" },
  });

  if (openPoolsCount === 0 && barranca && bucaramanga && wilches && cantagallo) {
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const in36h = new Date(Date.now() + 36 * 60 * 60 * 1000);

    await prisma.shipmentPool.createMany({
      data: [
        {
          originNodeId: barranca.id,
          destNodeId: bucaramanga.id,
          mode: "TERRESTRE",
          departureDate: in24h,
          maxCapacityKg: 3500,
          currentWeightKg: 850,
          totalFreightCost: 647500,
          status: "OPEN",
        },
        {
          originNodeId: cantagallo.id,
          destNodeId: bucaramanga.id,
          mode: "HIBRIDO",
          departureDate: in36h,
          maxCapacityKg: 4000,
          currentWeightKg: 1200,
          totalFreightCost: 980000,
          status: "OPEN",
        },
        {
          originNodeId: wilches.id,
          destNodeId: barranca.id,
          mode: "FLUVIAL",
          departureDate: in24h,
          maxCapacityKg: 5000,
          currentWeightKg: 1500,
          totalFreightCost: 340000,
          status: "OPEN",
        },
      ],
    });
  }

  return nodesByName;
}

