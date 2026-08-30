"use client";

import { useSyncExternalStore } from "react";

export type Tema = "sistema" | "claro" | "escuro";

/** Cores da barra do Safari, iguais às do globals.css. */
const BARRA = { claro: "#ffffff", escuro: "#09090b" } as const;

/**
 * Script que roda antes da página pintar.
 *
 * Sem ele, o navegador desenharia o tema do aparelho e só depois o React
 * corrigiria para a escolha salva — a tela piscaria branca antes de ficar
 * escura. Por isso é inline e síncrono, e não um efeito do React.
 *
 * É uma string fixa, escrita por mim, sem nada vindo de fora — não há por
 * onde injetar conteúdo aqui.
 */
export const SCRIPT_ANTI_PISCADA = `(function(){try{var t=localStorage.getItem('tema');if(t==='claro'||t==='escuro'){document.documentElement.setAttribute('data-tema',t)}}catch(e){}})()`;

function aplicarNoDocumento(tema: Tema) {
  const raiz = document.documentElement;

  if (tema === "sistema") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", tema);

  // A barra do Safari tem duas metas com media query, que seguem o aparelho.
  // Numa escolha manual elas apontariam para o lado errado, então as duas
  // recebem a cor escolhida; voltando para "sistema", cada uma volta à sua.
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m) => {
    if (tema === "sistema") {
      m.content = m.media.includes("dark") ? BARRA.escuro : BARRA.claro;
    } else {
      m.content = BARRA[tema];
    }
  });
}

const PROXIMO: Record<Tema, Tema> = { sistema: "claro", claro: "escuro", escuro: "sistema" };
const ROTULO: Record<Tema, string> = {
  sistema: "Tema: seguindo o aparelho",
  claro: "Tema: claro",
  escuro: "Tema: escuro",
};

/**
 * O tema escolhido vive no localStorage, que é um estado fora do React. Em vez
 * de copiá-lo para dentro com um efeito — o que renderiza duas vezes e o React
 * 19 desaconselha —, o componente lê direto da fonte e se inscreve para saber
 * quando muda.
 */
const ouvintes = new Set<() => void>();

function inscrever(avisar: () => void) {
  ouvintes.add(avisar);
  return () => void ouvintes.delete(avisar);
}

function lerDoNavegador(): Tema {
  try {
    const salvo = localStorage.getItem("tema");
    return salvo === "claro" || salvo === "escuro" ? salvo : "sistema";
  } catch {
    // Navegação privada pode recusar o armazenamento. Segue no padrão.
    return "sistema";
  }
}

/** No servidor não existe escolha salva: o padrão é seguir o aparelho. */
const lerNoServidor = (): Tema => "sistema";

export function BotaoTema() {
  const tema = useSyncExternalStore(inscrever, lerDoNavegador, lerNoServidor);

  function trocar() {
    const novo = PROXIMO[tema];
    aplicarNoDocumento(novo);
    try {
      if (novo === "sistema") localStorage.removeItem("tema");
      else localStorage.setItem("tema", novo);
    } catch {
      // Sem armazenamento a escolha não persiste, mas a tela já mudou.
    }
    ouvintes.forEach((avisar) => avisar());
  }

  return (
    <button
      type="button"
      onClick={trocar}
      title={`${ROTULO[tema]} — toque para mudar`}
      aria-label={ROTULO[tema]}
      className="rounded-lg p-2 text-texto-fraco transition hover:bg-superficie-suave hover:text-texto"
    >
      {tema === "claro" && <IconeSol />}
      {tema === "escuro" && <IconeLua />}
      {tema === "sistema" && <IconeAutomatico />}
    </button>
  );
}

const svg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconeSol() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg {...svg}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

/** Metade clara, metade escura: "o que o aparelho mandar". */
function IconeAutomatico() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
    </svg>
  );
}
