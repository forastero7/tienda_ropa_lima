"use client";

import Link from "next/link";
import { useActionState } from "react";
import { STATIC_DEMO } from "@/lib/base-path";
import { loginAction } from "./actions";

export default function AdminLogin() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-card p-6">
        <h1 className="text-xl font-bold">Panel de administración</h1>
        {STATIC_DEMO && (
          <p className="rounded-md bg-warn/10 p-3 text-sm text-warn">
            Versión de revisión: el acceso real exige contraseña y 2FA. <Link href="/admin" className="font-semibold underline">Ver el panel en modo lectura</Link>
          </p>
        )}
        <label className="label">Correo<input name="email" type="email" autoComplete="username" className="input mt-1" required /></label>
        <label className="label">Contraseña<input name="password" type="password" autoComplete="current-password" className="input mt-1" required /></label>
        <label className="label">
          Código de verificación (2FA)
          <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input mt-1" placeholder="Si ya lo configuraste" />
        </label>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</button>
      </form>
    </div>
  );
}
