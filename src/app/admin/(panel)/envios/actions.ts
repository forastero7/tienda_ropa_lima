"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { solesToCents } from "@/lib/money";

type State = { ok?: string; error?: string } | null;

export async function saveZone(_: State, form: FormData): Promise<State> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  try {
    const id = String(form.get("id") ?? "");
    const prefixes = String(form.get("prefixes") ?? "").split(",").map((p) => p.trim());
    if (prefixes.some((p) => !/^(\d{2}|\d{4}|\d{6})?$/.test(p))) throw new Error("Prefijos: 2, 4 o 6 dígitos de ubigeo (vacío = resto del país).");
    const free = String(form.get("freeOver") ?? "").trim();
    const data = {
      name: String(form.get("name")).trim(),
      ubigeoPrefixes: prefixes,
      feeCents: solesToCents(String(form.get("fee"))),
      perKgCents: form.get("perKg") ? solesToCents(String(form.get("perKg"))) : 0,
      freeOverCents: free ? solesToCents(free) : null,
      etaText: String(form.get("eta") ?? "").trim(),
      codAllowed: form.get("cod") === "on",
      active: form.get("active") === "on",
      position: Number(form.get("position")) || 0,
    };
    const zone = id ? await prisma.shippingZone.update({ where: { id }, data }) : await prisma.shippingZone.create({ data });
    await audit(prisma, { actorId: user.id, action: id ? "shipping.update" : "shipping.create", entity: "ShippingZone", entityId: zone.id, data });
    revalidatePath("/admin/envios");
    return { ok: "Zona guardada." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error" };
  }
}
