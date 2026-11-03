import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "./generated/prisma/client.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Falta la variable DATABASE_URL en el archivo .env");
}

const adapter = new PrismaLibSql({
  url: databaseUrl,
});

export const prisma = new PrismaClient({ adapter });