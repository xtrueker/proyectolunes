-- CreateTable LogisticsNode
CREATE TABLE IF NOT EXISTS "LogisticsNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable RouteSegment
CREATE TABLE IF NOT EXISTS "RouteSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originId" TEXT NOT NULL REFERENCES "LogisticsNode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "destinationId" TEXT NOT NULL REFERENCES "LogisticsNode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "mode" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "costPerTon" DOUBLE PRECISION NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "transferFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable ShipmentPool
CREATE TABLE IF NOT EXISTS "ShipmentPool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originNodeId" TEXT NOT NULL REFERENCES "LogisticsNode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "destNodeId" TEXT NOT NULL REFERENCES "LogisticsNode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "mode" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "maxCapacityKg" DOUBLE PRECISION NOT NULL,
    "currentWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFreightCost" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable TrackingEvent
CREATE TABLE IF NOT EXISTS "TrackingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseRequestId" TEXT NOT NULL REFERENCES "PurchaseRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "stage" TEXT NOT NULL,
    "notes" TEXT,
    "evidenceImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsNode_name_key" ON "LogisticsNode"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "RouteSegment_originId_destinationId_mode_key" ON "RouteSegment"("originId", "destinationId", "mode");

-- AlterTable User, Product & PurchaseRequest (Phase 2 + Innovation additive columns)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "perishability" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "counterPrice" DOUBLE PRECISION;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "counterDate" TIMESTAMP(3);
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "negotiationNotes" TEXT;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "freightCostEstimated" DOUBLE PRECISION;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "allocatedFreightCost" DOUBLE PRECISION;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "escrowStatus" TEXT;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "escrowTotalAmount" DOUBLE PRECISION;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "escrowReleasedAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "escrowUpdatedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "originNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "destNodeId" TEXT REFERENCES "LogisticsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "poolId" TEXT REFERENCES "ShipmentPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
