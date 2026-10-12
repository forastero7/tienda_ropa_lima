import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Db = Prisma.TransactionClient | typeof prisma;

export async function audit(
  db: Db,
  entry: { actorId?: string | null; action: string; entity: string; entityId?: string | null; data?: Prisma.InputJsonValue },
) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      data: entry.data,
    },
  });
}
