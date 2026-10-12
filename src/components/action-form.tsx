"use client";

import { useActionState } from "react";

type State = { ok?: string; error?: string } | null;

// Formulario genérico para acciones de servidor del panel con mensaje de resultado.
export function ActionForm({
  action,
  children,
  submitLabel,
  confirmText,
  className = "",
  variant = "primary",
}: {
  action: (prev: State, form: FormData) => Promise<State>;
  children?: React.ReactNode;
  submitLabel: string;
  confirmText?: string;
  className?: string;
  variant?: "primary" | "ghost" | "danger";
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const btn = variant === "danger" ? "btn border border-bad text-bad hover:bg-bad/5" : variant === "ghost" ? "btn-ghost" : "btn-primary";
  return (
    <form
      action={formAction}
      className={`space-y-2 ${className}`}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
      <button className={`${btn} py-2`} disabled={pending}>{pending ? "Procesando…" : submitLabel}</button>
      {state?.ok && <p className="text-sm text-ok" role="status">{state.ok}</p>}
      {state?.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
    </form>
  );
}
