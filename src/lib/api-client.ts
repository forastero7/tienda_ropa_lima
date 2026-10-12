"use client";

import { STATIC_DEMO, withBase } from "./base-path";

// Llamadas del navegador a /api/*. En la versión estática de revisión se resuelven
// localmente (demo-api.ts) porque no hay servidor.
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (STATIC_DEMO) {
    const { demoFetch } = await import("./demo-api");
    return demoFetch(path, init);
  }
  return fetch(withBase(path), init);
}
