import { z } from "zod";
import { isValidCe, isValidDni, isValidRuc, normalizePeruMobile } from "@/lib/documents";
import { getDistrict } from "@/lib/ubigeo";

export const cartLinesSchema = z
  .array(z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(50) }))
  .min(1, "El carrito está vacío.")
  .max(50);

export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    lines: cartLinesSchema,
    contact: z.object({
      fullName: z.string().trim().min(3, "Ingresa nombre y apellido.").max(120),
      email: z.string().trim().toLowerCase().email("Correo inválido.").max(160),
      phone: z.string().transform((v, ctx) => {
        const n = normalizePeruMobile(v);
        if (!n) ctx.addIssue({ code: "custom", message: "Ingresa un celular de 9 dígitos." });
        return n ?? "";
      }),
    }),
    delivery: z.object({
      ubigeo: z.string().regex(/^\d{6}$/, "Selecciona el distrito.").refine((v) => Boolean(getDistrict(v)), "Distrito inválido."),
      address: z.string().trim().min(5, "Ingresa la dirección.").max(200),
      reference: z.string().trim().max(200).default(""),
    }),
    document: z.object({
      type: z.enum(["BOLETA", "FACTURA"]),
      number: z.string().trim().max(15).default(""),
      businessName: z.string().trim().max(200).optional(),
    }),
    paymentMethod: z.string().min(1, "Elige un método de pago."),
    couponCode: z.string().trim().max(40).optional().nullable(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Debes aceptar los términos." }) }),
    marketingConsent: z.boolean().default(false),
    source: z.string().max(80).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    const n = v.document.number;
    if (v.document.type === "FACTURA") {
      if (!isValidRuc(n)) ctx.addIssue({ code: "custom", path: ["document", "number"], message: "RUC inválido." });
      if (!v.document.businessName || v.document.businessName.length < 3) {
        ctx.addIssue({ code: "custom", path: ["document", "businessName"], message: "Ingresa la razón social." });
      }
    } else if (n && !isValidDni(n) && !isValidCe(n)) {
      ctx.addIssue({ code: "custom", path: ["document", "number"], message: "DNI o CE inválido." });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
