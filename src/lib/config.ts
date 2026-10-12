// Lectura centralizada de configuración. Solo las variables NEXT_PUBLIC_* llegan al navegador.

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Datos del proveedor que la ley exige mostrar. Mientras el propietario no los entregue
// se muestra un marcador visible: nunca se inventan razón social, RUC ni domicilio.
const pending = (value: string | undefined, label: string) => value?.trim() || `[Pendiente: ${label}]`;

export const store = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Marca Demo",
  // Catálogo, precios y existencias ficticios hasta cargar el catálogo real.
  demoContent: process.env.NEXT_PUBLIC_DEMO_CONTENT !== "0",
  providerComplete: Boolean(process.env.NEXT_PUBLIC_LEGAL_NAME && process.env.NEXT_PUBLIC_RUC && process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  legalName: pending(process.env.NEXT_PUBLIC_LEGAL_NAME, "razón social"),
  ruc: pending(process.env.NEXT_PUBLIC_RUC, "RUC"),
  legalAddress: pending(process.env.NEXT_PUBLIC_LEGAL_ADDRESS, "domicilio"),
  supportEmail: pending(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, "correo de atención"),
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "",
};

export const checkoutConfig = {
  reservationMinutesOnline: () => int("RESERVATION_MINUTES_ONLINE", 30),
  reservationMinutesManual: () => int("RESERVATION_MINUTES_MANUAL", 1440),
  complaintResponseBusinessDays: () => int("COMPLAINT_RESPONSE_BUSINESS_DAYS", 15),
  maxQuantityPerLine: 10,
};
