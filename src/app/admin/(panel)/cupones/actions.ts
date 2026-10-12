"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { solesToCents } from "@/lib/money";

type State = { ok?: string; error?: string } | null;

const limaDate = (v: FormDataEntryValue | null, endOfDay = false) =>
  v ? new Date(`${v}T${endOfDay ? "23:59:59" : "00:00:00"}-05:00`) : null;

export async function createCoupon(_: State, form: FormData): Promise<State> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  try {
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error("Código: 3–40 letras, números, guion.");
    const type = form.get("type") === "FIXED" ? "FIXED" : "PERCENT";
    const raw = String(form.get("value") ?? "");
    const value = type === "PERCENT" ? Number.parseInt(raw, 10) : solesToCents(raw);
    if (!value || value < 1 || (type === "PERCENT" && value > 90)) throw new Error("Valor inválido (porcentaje máximo 90%).");
    const maxUses = Number.parseInt(String(form.get("maxUses") ?? ""), 10);
    const coupon = await prisma.coupon.create({
      data: {
        code,
        type,
        value,
        minSubtotalCents: form.get("min") ? solesToCents(String(form.get("min"))) : 0,
        maxUses: Number.isInteger(maxUses) && maxUses > 0 ? maxUses : null,
        startsAt: limaDate(form.get("startsAt") || null),
        endsAt: limaDate(form.get("endsAt") || null, true),
      },
    });
    await audit(prisma, { actorId: user.id, action: "coupon.create", entity: "Coupon", entityId: coupon.id, data: { code, type, value } });
    revalidatePath("/admin/cupones");
    return { ok: `Cupón ${code} creado.` };
  } catch (err) {
    return { error: err instanceof Error && !err.message.includes("Unique") ? err.message : "Ese código ya existe." };
  }
}

export async function toggleCoupon(form: FormData) {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const id = String(form.get("id"));
  const c = await prisma.coupon.findUniqueOrThrow({ where: { id } });
  await prisma.coupon.update({ where: { id }, data: { active: !c.active } });
  await audit(prisma, { actorId: user.id, action: c.active ? "coupon.disable" : "coupon.enable", entity: "Coupon", entityId: id });
  revalidatePath("/admin/cupones");
}
