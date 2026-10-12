"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_KEY } from "@/lib/analytics";

// Las tecnologías no esenciales (Analytics, píxeles) solo se cargan si el usuario acepta.
export function ConsentBanner({ gaId }: { gaId?: string }) {
  const [choice, setChoice] = useState<"granted" | "denied" | null | undefined>(undefined);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CONSENT_KEY);
      setChoice(v === "granted" || v === "denied" ? v : null);
    } catch {
      setChoice(null);
    }
  }, []);

  const decide = (v: "granted" | "denied") => {
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {}
    setChoice(v);
  };

  return (
    <>
      {choice === "granted" && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      {choice === null && (
        <div
          role="dialog"
          aria-label="Preferencias de cookies"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-line bg-card p-4 text-sm shadow-lg"
        >
          <p>
            Usamos cookies necesarias para que la tienda funcione y, con tu permiso, cookies de medición para mejorarla.{" "}
            <Link href="/legal/cookies" className="underline">
              Más información
            </Link>
          </p>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary py-2" onClick={() => decide("granted")}>
              Aceptar
            </button>
            <button className="btn-ghost py-2" onClick={() => decide("denied")}>
              Solo necesarias
            </button>
          </div>
        </div>
      )}
    </>
  );
}
