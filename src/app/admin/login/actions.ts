"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth/admin";

export async function loginAction(_prev: string | null, form: FormData): Promise<string | null> {
  const result = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""), String(form.get("code") ?? ""));
  if (!result.ok) return result.error;
  redirect(result.needsEnrollment ? "/admin/seguridad" : "/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}
