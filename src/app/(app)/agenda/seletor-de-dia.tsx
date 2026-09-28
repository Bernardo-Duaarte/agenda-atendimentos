"use client";

import { useRouter } from "next/navigation";
import { Entrada } from "@/components/ui";

/**
 * Escolher o dia pelo calendário do aparelho, e não só de um em um.
 *
 * Navegar até um sábado de dois meses à frente com "próximo dia" são sessenta
 * toques. O mesmo seletor de data do formulário de agendamento resolve em um —
 * e no iPhone abre o calendário nativo, já conhecido.
 */
export function SeletorDeDia({ dia }: { dia: string }) {
  const router = useRouter();

  return (
    <Entrada
      type="date"
      value={dia}
      aria-label="Escolher o dia"
      onChange={(e) => {
        const novo = e.target.value;
        // O campo fica vazio enquanto se apaga a data; ir para /agenda?d=
        // mostraria um dia inválido.
        if (novo) router.push(`/agenda?d=${novo}`);
      }}
      className="w-auto"
    />
  );
}
