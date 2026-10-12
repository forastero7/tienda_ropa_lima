import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkoutConfig } from "@/lib/config";
import { solesToCents } from "@/lib/money";

export const complaintSchema = z.object({
  type: z.enum(["RECLAMO", "QUEJA"]),
  fullName: z.string().trim().min(3).max(120),
  documentType: z.enum(["DNI", "CE", "PASAPORTE"]),
  documentNumber: z.string().trim().min(6).max(15),
  address: z.string().trim().min(5).max(200),
  phone: z.string().trim().min(6).max(20),
  email: z.string().trim().toLowerCase().email(),
  guardianName: z.string().trim().max(120).optional(),
  goodType: z.enum(["PRODUCTO", "SERVICIO"]),
  orderCode: z.string().trim().max(20).optional(),
  amount: z.string().trim().max(12).optional(),
  goodDescription: z.string().trim().min(3).max(500),
  detail: z.string().trim().min(10).max(3000),
  request: z.string().trim().min(5).max(2000),
});

// Fecha límite en días hábiles (lunes a viernes). No descuenta feriados:
// validar el plazo exacto con la normativa vigente.
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

export async function registerComplaint(input: z.infer<typeof complaintSchema>) {
  return prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const counter = await tx.counter.upsert({
      where: { key: `complaint:${year}` },
      update: { value: { increment: 1 } },
      create: { key: `complaint:${year}`, value: 1 },
    });
    const { amount, ...rest } = input;
    return tx.complaint.create({
      data: {
        ...rest,
        guardianName: rest.guardianName || null,
        orderCode: rest.orderCode || null,
        amountCents: amount ? solesToCents(amount) : null,
        number: `${year}-${String(counter.value).padStart(6, "0")}`,
        responseDueAt: addBusinessDays(new Date(), checkoutConfig.complaintResponseBusinessDays()),
      },
    });
  });
}
