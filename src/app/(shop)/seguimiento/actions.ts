"use server";

import { prisma } from "@/lib/db";
import { normalizePeruMobile } from "@/lib/documents";

export type TrackState = { error?: string; url?: string } | null;

// Pide código + correo o celular: el código por sí solo no revela datos del pedido.
export async function findOrder(_prev: TrackState, form: FormData): Promise<TrackState> {
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const contact = String(form.get("contact") ?? "").trim().toLowerCase();
  if (!code || !contact) return { error: "Ingresa el código y tu correo o celular." };
  const order = await prisma.order.findUnique({ where: { code } });
  const phone = normalizePeruMobile(contact);
  const matches = order && (order.email === contact || (phone !== null && order.phone === phone));
  if (!order || !matches) return { error: "No encontramos un pedido con esos datos." };
  return { url: `/pedido/${order.code}?t=${order.accessToken}` };
}
