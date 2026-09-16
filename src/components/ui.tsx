import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Componentes de servidor. O que precisa de interatividade mora em
   botao-submit.tsx — aqui é só marcação e classe. */

const entrada =
  "w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-[15px] text-texto " +
  "placeholder:text-texto-fraco outline-none transition " +
  "focus:border-marca focus:ring-2 focus:ring-marca-anel " +
  "disabled:bg-superficie-suave disabled:text-texto-fraco";

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
      <span className="mb-1.5 block text-sm font-medium text-texto-suave">{rotulo}</span>
      {children}
      {dica && !erro && <span className="mt-1 block text-xs text-texto-fraco">{dica}</span>}
      {erro && <span className="mt-1 block text-xs font-medium text-perigo">{erro}</span>}
    </label>
  );
}

export function Entrada({ erro, className = "", ...props }: ComponentProps<"input"> & { erro?: boolean }) {
  return <input {...props} className={`${entrada} ${erro ? "border-perigo" : ""} ${className}`} />;
}

export function AreaTexto({ erro, className = "", ...props }: ComponentProps<"textarea"> & { erro?: boolean }) {
  return <textarea {...props} className={`${entrada} min-h-[80px] resize-y ${erro ? "border-perigo" : ""} ${className}`} />;
}

export function Selecao({ erro, className = "", ...props }: ComponentProps<"select"> & { erro?: boolean }) {
  return <select {...props} className={`${entrada} ${erro ? "border-perigo" : ""} ${className}`} />;
}

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-borda bg-superficie shadow-sm ${className}`}>{children}</div>
  );
}

export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-texto">{children}</h1>
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
      ? "bg-acao text-acao-texto hover:bg-acao-forte"
      : "border border-borda bg-superficie text-texto-suave hover:bg-superficie-suave";
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
    <div className="mb-4 rounded-lg border border-perigo-borda bg-perigo-fundo px-4 py-3 text-sm text-perigo-texto">
      {children}
    </div>
  );
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao: string; acao?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-borda bg-superficie-suave/50 px-6 py-14 text-center">
      <p className="text-base font-medium text-texto">{titulo}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-texto-fraco">{descricao}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

export function Etiqueta({ children, tom = "neutro" }: { children: ReactNode; tom?: "neutro" | "alerta" | "ok" }) {
  const cores = {
    neutro: "bg-superficie-suave text-texto-suave",
    alerta: "bg-atencao-fundo text-atencao-texto",
    ok: "bg-positivo-fundo text-positivo-texto",
  }[tom];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cores}`}>{children}</span>;
}

/**
 * Aparência de cada estado do atendimento, num lugar só.
 *
 * Estava duplicada na tela do dia e na do atendimento, o que já tinha feito
 * as duas divergirem ao acrescentar o pré-agendamento.
 */
const STATUS = {
  PRE_AGENDAMENTO: { rotulo: "pré-agendamento", tom: "neutro" },
  PENDENTE: { rotulo: "aguardando sinal", tom: "alerta" },
  CONFIRMADO: { rotulo: "confirmado", tom: "ok" },
  CONCLUIDO: { rotulo: "concluído", tom: "neutro" },
  CANCELADO: { rotulo: "cancelado", tom: "neutro" },
  FALTOU: { rotulo: "não veio", tom: "alerta" },
} as const;

export type StatusAgendamento = keyof typeof STATUS;

export const rotuloStatus = (s: StatusAgendamento) => STATUS[s].rotulo;

export function EtiquetaStatus({ status }: { status: StatusAgendamento }) {
  return <Etiqueta tom={STATUS[status].tom}>{STATUS[status].rotulo}</Etiqueta>;
}
