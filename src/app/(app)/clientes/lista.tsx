"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatarTelefone, linkWhatsApp } from "@/lib/whatsapp";
import { filtrarClientes } from "@/lib/busca";
import { Cartao, Entrada, Etiqueta, Vazio } from "@/components/ui";

/**
 * Lista de clientes com busca que filtra enquanto se digita.
 *
 * Era uma busca no banco, a cada envio do formulário. Virou filtro aqui por
 * dois motivos: a lista responde na hora, e — o que importa mais — a regra de
 * comparação passa a ignorar acento, coisa que o Postgres não faz sozinho.
 *
 * Carregar todas as clientes de uma vez é barato nessa escala: nome, telefone e
 * contagem de algumas centenas de linhas são alguns kilobytes. Se um dia a
 * lista chegar aos milhares, a busca volta para o banco.
 */

export type ClienteNaLista = {
  id: string;
  nome: string;
  telefone: string;
  tomPele: string | null;
  alergias: string | null;
  atendimentos: number;
};

export function ListaClientes({
  clientes,
  buscaInicial,
}: {
  clientes: ClienteNaLista[];
  /** Vem de ?q= na URL, para um link compartilhado continuar funcionando. */
  buscaInicial: string;
}) {
  const [busca, setBusca] = useState(buscaInicial);

  const visiveis = useMemo(() => filtrarClientes(clientes, busca), [clientes, busca]);
  const termo = busca.trim();

  // Se o que você digitou tem dígito, é telefone; senão é nome. Isso decide
  // qual campo do cadastro já vem preenchido.
  const digitado = termo.replace(/\D/g, "");
  const pareceTelefone = digitado.length >= 3;
  const linkCadastro = termo
    ? `/clientes/novo?${new URLSearchParams(
        pareceTelefone ? { telefone: digitado } : { nome: termo },
      )}`
    : "/clientes/novo";

  if (clientes.length === 0) {
    return (
      <Vazio
        titulo="Nenhuma cliente cadastrada"
        descricao="Cadastre a primeira e ela já fica disponível na hora de marcar um atendimento. Se suas clientes já estão nos contatos do telefone, dá para trazer de lá."
        acao={
          <div className="flex flex-wrap justify-center gap-2">
            <BotaoCadastrar href="/clientes/novo">Cadastrar cliente</BotaoCadastrar>
            <Link
              href="/clientes/importar"
              className="inline-flex items-center rounded-lg border border-borda bg-superficie px-4 py-2 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
            >
              Importar contatos
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-5">
        <Entrada
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          aria-label="Buscar cliente"
          autoComplete="off"
        />
        {termo && (
          <p className="mt-1.5 text-xs text-texto-fraco">
            {visiveis.length === 0
              ? "Nenhuma cliente encontrada"
              : `${visiveis.length} de ${clientes.length}`}
          </p>
        )}
      </div>

      {visiveis.length === 0 ? (
        /* O caminho mais provável depois de não achar alguém é cadastrá-la, e
           o nome que você acabou de digitar já vai preenchido. */
        <Vazio
          titulo={`Nenhuma cliente com “${termo}”`}
          descricao={
            pareceTelefone
              ? "Esse número não está no cadastro. Dá para cadastrar agora, já com ele preenchido."
              : "Dá para cadastrar agora, já com esse nome preenchido."
          }
          acao={
            <div className="flex flex-wrap justify-center gap-2">
              <BotaoCadastrar href={linkCadastro}>
                {pareceTelefone ? "Cadastrar com esse número" : `Cadastrar “${termo}”`}
              </BotaoCadastrar>
              <button
                type="button"
                onClick={() => setBusca("")}
                className="inline-flex items-center rounded-lg border border-borda bg-superficie px-4 py-2 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
              >
                Limpar busca
              </button>
            </div>
          }
        />
      ) : (
        <Cartao className="divide-y divide-borda-suave">
          {visiveis.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="font-medium text-texto hover:text-marca"
                  >
                    {c.nome}
                  </Link>
                  {c.alergias && <Etiqueta tom="alerta">alergia</Etiqueta>}
                  {c.atendimentos > 0 && (
                    <Etiqueta>
                      {c.atendimentos} atendimento{c.atendimentos > 1 ? "s" : ""}
                    </Etiqueta>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-texto-fraco">
                  {formatarTelefone(c.telefone)}
                  {c.tomPele && ` · ${c.tomPele}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/agenda/novo?cliente=${c.id}`}
                  className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
                >
                  Agendar
                </Link>
                <a
                  href={linkWhatsApp(c.telefone, `Oi, ${c.nome.split(" ")[0]}!`)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          ))}
        </Cartao>
      )}
    </>
  );
}

/** Mesma aparência do BotaoLink primário, usável dentro deste componente. */
function BotaoCadastrar({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg bg-acao px-4 py-2 text-sm font-medium text-acao-texto transition hover:bg-acao-forte"
    >
      {children}
    </Link>
  );
}
