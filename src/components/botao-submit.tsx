"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * useFormStatus lê o estado do <form> pai. Precisa ser um componente separado
 * e cliente — se estivesse dentro do próprio form, não enxergaria o envio.
 */
export function BotaoSubmit({
  children,
  enviando = "Salvando...",
}: {
  children: ReactNode;
  enviando?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
    >
      {pending ? enviando : children}
    </button>
  );
}
