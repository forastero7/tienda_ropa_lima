"use client";

import { useState } from "react";

export function RetryPayment({ code, token }: { code: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retry = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${code}/retry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const data = await res.json();
    if (res.ok && data.next?.type === "redirect") window.location.assign(data.next.url);
    else if (res.ok) window.location.reload();
    else {
      setError(data.error ?? "No se pudo reintentar.");
      setBusy(false);
    }
  };
  return (
    <div>
      <button className="btn-primary" onClick={retry} disabled={busy}>{busy ? "Abriendo pasarela…" : "Reintentar pago"}</button>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
