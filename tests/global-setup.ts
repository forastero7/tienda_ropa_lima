import { execSync } from "node:child_process";

// Aplica las migraciones a la base de pruebas (nunca a la de desarrollo).
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://tienda:tienda@localhost:5432/tienda_test";
  if (!/test/.test(url)) throw new Error("TEST_DATABASE_URL debe apuntar a una base de pruebas");
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: url },
  });
}
