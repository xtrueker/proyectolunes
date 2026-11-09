import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Falta la variable DATABASE_URL en el archivo backend/.env");
}

if (databaseUrl.includes("[YOUR-PASSWORD]")) {
  throw new Error(
    "Debes reemplazar [YOUR-PASSWORD] en backend/.env con la contraseña real de tu base de datos Supabase."
  );
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export const prisma = new PrismaClient({ adapter });
