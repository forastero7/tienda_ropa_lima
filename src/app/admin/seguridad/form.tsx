"use client";

import { useActionState } from "react";
import { enableTotp } from "./actions";

export function EnableForm() {
  const [error, action, pending] = useActionState(enableTotp, null);
  return (
    <form action={action} className="mt-6 flex gap-2">
      <input name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" className="input" placeholder="123456" required />
      <button className="btn-primary" disabled={pending}>Activar</button>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </form>
  );
}
