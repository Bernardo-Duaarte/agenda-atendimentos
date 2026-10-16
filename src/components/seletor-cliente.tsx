"use client";

import { useMemo, useRef, useState, type TouchEvent } from "react";
import Link from "next/link";
import { filtrarClientes } from "@/lib/busca";
import { formatarTelefone } from "@/lib/whatsapp";
import { Entrada } from "@/components/ui";

/**
 * Escolha de cliente por busca, no lugar de uma lista para rolar.
 *
 * Era um `<select>` com todas as clientes. Funcionava com seis; com as
 * centenas que vêm da importação de contatos, achar alguém no seletor do
 * iPhone significa girar uma roda enorme.
 *
 * O valor continua indo no formulário por um campo escondido, então o servidor
 * recebe exatamente o que recebia antes.
 */

export type ClienteParaEscolher = {
  id: string;
  nome: string;
  telefone: string;
};

/** Quantas sugestões aparecem de uma vez. O resto se alcança digitando mais. */
const MAXIMO_SUGESTOES = 8;

export function SeletorCliente({
  clientes,
  valor,
  onEscolher,
  erro,
}: {
  clientes: ClienteParaEscolher[];
  valor: string;
  onEscolher: (id: string) => void;
  erro?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  const escolhida = clientes.find((c) => c.id === valor);

  const encontradas = useMemo(
    () => filtrarClientes(clientes, busca).slice(0, MAXIMO_SUGESTOES),
    [clientes, busca],
  );
  const total = useMemo(() => filtrarClientes(clientes, busca).length, [clientes, busca]);

  function escolher(id: string) {
    onEscolher(id);
    setBusca("");
    setAberto(false);
  }

  /**
   * Escolher no toque, e não no clique.
   *
   * No celular, tocar num nome tira o foco do campo de busca, o teclado fecha e
   * a página se reorganiza para ocupar o espaço dele. Isso acontece ANTES de o
   * dedo levantar, então o nome sai de baixo do dedo — e o navegador só dispara
   * o clique se o dedo subir sobre o mesmo elemento onde desceu. O toque se
   * perdia, e nada era selecionado. No computador não há teclado para fechar,
   * por isso lá sempre funcionou.
   *
   * Resolvendo em `touchend` a escolha acontece antes de qualquer movimento.
   * O `preventDefault` cancela o clique sintetizado que viria depois; se o
   * navegador ignorar o cancelamento, `escolher` roda duas vezes com o mesmo
   * id, o que não muda nada.
   */
  const toqueComecou = useRef<{ x: number; y: number } | null>(null);
  const TOLERANCIA_PX = 10;

  function aoComecarToque(e: TouchEvent) {
    const t = e.touches[0];
    toqueComecou.current = t ? { x: t.clientX, y: t.clientY } : null;
  }

  function aoTerminarToque(e: TouchEvent, id: string) {
    const comeco = toqueComecou.current;
    toqueComecou.current = null;

    const t = e.changedTouches[0];
    if (!comeco || !t) return;

    // Arrastar o dedo para rolar a lista não é escolher.
    if (
      Math.abs(t.clientX - comeco.x) > TOLERANCIA_PX ||
      Math.abs(t.clientY - comeco.y) > TOLERANCIA_PX
    ) {
      return;
    }

    e.preventDefault();
    escolher(id);
  }

  // Já escolhida: mostra quem é e sai da frente. Trocar é um clique.
  if (escolhida && !aberto) {
    return (
      <>
        <input type="hidden" name="clienteId" value={escolhida.id} />
        <div
          className={`flex items-center gap-3 rounded-lg border bg-superficie px-3 py-2 ${
            erro ? "border-perigo" : "border-borda"
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-texto">
              {escolhida.nome}
            </span>
            <span className="block text-xs text-texto-fraco">
              {formatarTelefone(escolhida.telefone)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setAberto(true);
              // O campo de busca só existe depois deste render.
              requestAnimationFrame(() => campo.current?.focus());
            }}
            className="shrink-0 rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
          >
            Trocar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mantém o valor enviado mesmo com a busca aberta: reabrir para trocar
          e desistir não deve apagar quem já estava escolhida. */}
      <input type="hidden" name="clienteId" value={escolhida?.id ?? ""} />

      <Entrada
        ref={campo}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={(e) => {
          // Enter escolhe a primeira da lista: com o nome digitado, é ela.
          if (e.key === "Enter" && encontradas[0]) {
            e.preventDefault();
            escolher(encontradas[0].id);
          }
          if (e.key === "Escape" && escolhida) {
            setBusca("");
            setAberto(false);
          }
        }}
        placeholder="Digite o nome da cliente..."
        aria-label="Buscar cliente"
        autoComplete="off"
        erro={erro}
      />

      <div className="mt-2 overflow-hidden rounded-lg border border-borda">
        {encontradas.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-sm text-texto-fraco">
              {busca.trim() ? `Nenhuma cliente com “${busca.trim()}”.` : "Nenhuma cliente."}
            </p>
            <Link
              href={`/clientes/novo?${new URLSearchParams({ nome: busca.trim() })}`}
              // Mesmo motivo dos nomes da lista: sem isto o campo perde o foco,
              // o teclado fecha, a página se mexe e o toque erra o alvo.
              onMouseDown={(e) => e.preventDefault()}
              className="mt-2 inline-flex items-center touch-manipulation rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-marca transition hover:bg-superficie-suave"
            >
              Cadastrar {busca.trim() ? `“${busca.trim()}”` : "uma cliente"}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-borda-suave">
            {encontradas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  // No celular, resolve no toque. Ver `aoTerminarToque`.
                  onTouchStart={aoComecarToque}
                  onTouchEnd={(e) => aoTerminarToque(e, c.id)}
                  // No computador, impede o campo de perder o foco ao apertar o
                  // botão. Sem isto o teclado do iPad também fecharia aqui.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(c.id)}
                  className={`flex w-full touch-manipulation items-center gap-3 px-3 py-3 text-left transition hover:bg-superficie-suave ${
                    c.id === valor ? "bg-superficie-suave" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-texto">{c.nome}</span>
                    <span className="block text-xs text-texto-fraco">
                      {formatarTelefone(c.telefone)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {total > encontradas.length && (
        <p className="mt-1.5 text-xs text-texto-fraco">
          Mostrando {encontradas.length} de {total}. Digite mais para afinar.
        </p>
      )}
    </>
  );
}
