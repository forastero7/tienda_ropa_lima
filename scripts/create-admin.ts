// Uso: npm run admin:create -- correo@dominio.pe "Nombre" OWNER
// La contraseña se pide por la entrada estándar para que no quede en el historial.
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";
import { PrismaClient, type AdminRole } from "@prisma/client";

async function main() {
  const [email, name, role = "ADMIN"] = process.argv.slice(2);
  if (!email || !name || !["OWNER", "ADMIN", "OPERATOR"].includes(role)) {
    console.error('Uso: npm run admin:create -- correo@dominio.pe "Nombre" [OWNER|ADMIN|OPERATOR]');
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = process.env.ADMIN_PASSWORD ?? (await rl.question("Contraseña (mín. 12 caracteres): "));
  rl.close();
  if (password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");
  const prisma = new PrismaClient();
  const user = await prisma.adminUser.upsert({
    where: { email: email.toLowerCase() },
    update: { name, role: role as AdminRole, passwordHash: await bcrypt.hash(password, 12) },
    create: { email: email.toLowerCase(), name, role: role as AdminRole, passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Administrador listo: ${user.email} (${user.role}). Al ingresar se pedirá configurar 2FA.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
