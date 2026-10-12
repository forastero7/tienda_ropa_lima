// Lectura centralizada de configuración. Solo las variables NEXT_PUBLIC_* llegan al navegador.

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const store = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Tienda Lima",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || "",
  ruc: process.env.NEXT_PUBLIC_RUC || "",
  legalAddress: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "",
};

export const checkoutConfig = {
  reservationMinutesOnline: () => int("RESERVATION_MINUTES_ONLINE", 30),
  reservationMinutesManual: () => int("RESERVATION_MINUTES_MANUAL", 1440),
  complaintResponseBusinessDays: () => int("COMPLAINT_RESPONSE_BUSINESS_DAYS", 15),
  maxQuantityPerLine: 10,
};
