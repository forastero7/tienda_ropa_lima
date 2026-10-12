"use server";

import { complaintSchema, registerComplaint } from "@/lib/complaints";

export type ComplaintState =
  | { ok: true; number: string; createdAt: string; dueAt: string; data: Record<string, string> }
  | { ok: false; error: string }
  | null;

export async function submitComplaint(_prev: ComplaintState, form: FormData): Promise<ComplaintState> {
  if (form.get("accept") !== "on") return { ok: false, error: "Debes confirmar que los datos son correctos." };
  const raw = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = complaintSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".");
    return { ok: false, error: `Revisa el campo: ${field}.` };
  }
  try {
    const c = await registerComplaint(parsed.data);
    return { ok: true, number: c.number, createdAt: c.createdAt.toISOString(), dueAt: c.responseDueAt.toISOString(), data: raw };
  } catch {
    return { ok: false, error: "Ocurrió un error al registrar. Intenta de nuevo." };
  }
}
