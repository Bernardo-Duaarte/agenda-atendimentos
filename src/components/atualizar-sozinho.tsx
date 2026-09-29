"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantém a tela em dia sem você precisar recarregar.
 *
 * No iPhone, um app da tela de início não fecha quando você troca de
 * aplicativo: ele fica parado em memória. Ao voltar, a tela mostra o que havia
 * quando você saiu — um atendimento marcado no computador não aparece, e o
 * risco é marcar em cima.
 *
 * `router.refresh()` rebusca só os dados do servidor e mescla no que já está
 * na tela: o que você digitou num campo e a posição da rolagem continuam onde
 * estavam.
 */

/** Espaço mínimo entre atualizações, para alternar de app não virar enxurrada. */
const INTERVALO_MINIMO_MS = 30_000;

/** Com a tela aberta e parada, confere de tempos em tempos. */
const RELOGIO_MS = 5 * 60_000;

export function AtualizarSozinho() {
  const router = useRouter();

  useEffect(() => {
    let ultima = Date.now();

    function atualizar() {
      if (document.visibilityState !== "visible") return;

      // Não puxa o tapete de quem está preenchendo: mesmo preservando o
      // conteúdo do campo, ver a tela mudar no meio da digitação assusta.
      const foco = document.activeElement?.tagName;
      if (foco === "INPUT" || foco === "TEXTAREA" || foco === "SELECT") return;

      if (Date.now() - ultima < INTERVALO_MINIMO_MS) return;
      ultima = Date.now();
      router.refresh();
    }

    // visibilitychange cobre trocar de app no celular; focus cobre voltar
    // para a aba no computador.
    document.addEventListener("visibilitychange", atualizar);
    window.addEventListener("focus", atualizar);
    const relogio = setInterval(atualizar, RELOGIO_MS);

    return () => {
      document.removeEventListener("visibilitychange", atualizar);
      window.removeEventListener("focus", atualizar);
      clearInterval(relogio);
    };
  }, [router]);

  return null;
}
