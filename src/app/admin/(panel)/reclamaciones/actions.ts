"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export async function answerComplaint(_: { ok?: string; error?: string } | null, form: FormData) {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const id = String(form.get("id"));
  const response = String(form.get("response") ?? "").trim();
  if (response.length < 10) return { error: "Escribe la respuesta enviada al consumidor." };
  await prisma.complaint.update({ where: { id }, data: { response, status: "ANSWERED", respondedAt: new Date() } });
  await audit(prisma, { actorId: user.id, action: "complaint.answer", entity: "Complaint", entityId: id });
  revalidatePath("/admin/reclamaciones");
  return { ok: "Respuesta registrada. Envíala también al correo del consumidor." };
}
