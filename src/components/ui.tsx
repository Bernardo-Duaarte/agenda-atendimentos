import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Componentes de servidor. O que precisa de interatividade mora em
   botao-submit.tsx — aqui é só marcação e classe. */

const entrada =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[15px] text-zinc-900 " +
  "placeholder:text-zinc-400 outline-none transition " +
  "focus:border-rose-400 focus:ring-2 focus:ring-rose-100 " +
  "disabled:bg-zinc-50 disabled:text-zinc-500";

export function Campo({
  rotulo,
  erro,
  dica,
  children,
}: {
  rotulo: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">{rotulo}</span>
      {children}
      {dica && !erro && <span className="mt-1 block text-xs text-zinc-500">{dica}</span>}
      {erro && <span className="mt-1 block text-xs font-medium text-rose-600">{erro}</span>}
    </label>
  );
}

export function Entrada({ erro, className = "", ...props }: ComponentProps<"input"> & { erro?: boolean }) {
  return <input {...props} className={`${entrada} ${erro ? "border-rose-400" : ""} ${className}`} />;
}

export function AreaTexto({ erro, className = "", ...props }: ComponentProps<"textarea"> & { erro?: boolean }) {
  return <textarea {...props} className={`${entrada} min-h-[80px] resize-y ${erro ? "border-rose-400" : ""} ${className}`} />;
}

export function Selecao({ erro, className = "", ...props }: ComponentProps<"select"> & { erro?: boolean }) {
  return <select {...props} className={`${entrada} ${erro ? "border-rose-400" : ""} ${className}`} />;
}

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{children}</h1>
      {acao}
    </div>
  );
}

export function BotaoLink({
  href,
  children,
  variante = "primario",
}: {
  href: string;
  children: ReactNode;
  variante?: "primario" | "secundario";
}) {
  const estilo =
    variante === "primario"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${estilo}`}
    >
      {children}
    </Link>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {children}
    </div>
  );
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao: string; acao?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-14 text-center">
      <p className="text-base font-medium text-zinc-800">{titulo}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">{descricao}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

export function Etiqueta({ children, tom = "neutro" }: { children: ReactNode; tom?: "neutro" | "alerta" | "ok" }) {
  const cores = {
    neutro: "bg-zinc-100 text-zinc-600",
    alerta: "bg-amber-100 text-amber-800",
    ok: "bg-emerald-100 text-emerald-800",
  }[tom];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cores}`}>{children}</span>;
}
