"use client";

import { useState } from "react";

export function SandboxActions({ paymentId }: { paymentId: string }) {
  const [busy, setBusy] = useState(false);
  const run = async (outcome: "approve" | "decline") => {
    setBusy(true);
    const res = await fetch("/api/payments/sandbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId, outcome }) });
    const data = await res.json();
    window.location.assign(data.confirmationUrl ?? "/");
  };
  return (
    <div className="mt-6 grid gap-2">
      <button className="btn-primary" disabled={busy} onClick={() => run("approve")}>Simular pago aprobado</button>
      <button className="btn-ghost" disabled={busy} onClick={() => run("decline")}>Simular pago rechazado</button>
    </div>
  );
}
