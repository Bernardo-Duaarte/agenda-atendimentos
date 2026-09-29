"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { lerContatos } from "@/lib/vcard";
import { normalizarTelefone } from "@/lib/telefone";
import { formatarTelefone } from "@/lib/whatsapp";
import { Aviso, Cartao, Entrada, Etiqueta, Vazio } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { importarContatos, type ResultadoImportacao } from "./acoes";

/**
 * A leitura do arquivo acontece aqui, no navegador, de propósito.
 *
 * Sua agenda de telefone tem médico, banco, família — gente que não é cliente.
 * Enviando o arquivo para o servidor, tudo isso subiria e ficaria em log só para
 * você marcar vinte nomes. Lendo aqui, sai do aparelho apenas quem você marcou.
 */

type Candidato = {
  nome: string;
  /** Já em E.164 sem o '+', pronto para gravar. */
  telefone: string;
  jaExiste: boolean;
};

type Leitura = {
  candidatos: Candidato[];
  /** Contatos com nome e número que o sistema não soube aproveitar. */
  descartados: number;
  totalNoArquivo: number;
};

function ler(texto: string, jaCadastrados: Set<string>): Leitura {
  const contatos = lerContatos(texto);
  const candidatos: Candidato[] = [];
  const vistos = new Set<string>();
  let descartados = 0;

  for (const contato of contatos) {
    // Vale o primeiro número que dá para usar: numa agenda de telefone o
    // celular quase sempre vem antes do fixo do trabalho.
    const numero = contato.telefones.map(normalizarTelefone).find(Boolean);
    if (!numero) {
      descartados += 1;
      continue;
    }
    // O mesmo número em dois contatos ("Ana" e "Ana Noiva") viraria cliente
    // repetida: fica o primeiro.
    if (vistos.has(numero)) continue;
    vistos.add(numero);

    candidatos.push({
      nome: contato.nome,
      telefone: numero,
      jaExiste: jaCadastrados.has(numero),
    });
  }

  candidatos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return { candidatos, descartados, totalNoArquivo: contatos.length };
}

export function ListaImportacao({ jaCadastrados }: { jaCadastrados: string[] }) {
  const cadastrados = useMemo(() => new Set(jaCadastrados), [jaCadastrados]);

  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");

  const [resultado, enviar] = useActionState<ResultadoImportacao, FormData>(importarContatos, {
    ok: false,
  });

  async function escolherArquivo(arquivo: File | undefined) {
    setErroArquivo(null);
    setLeitura(null);
    if (!arquivo) return;

    const texto = await arquivo.text();
    if (!texto.includes("BEGIN:VCARD")) {
      setErroArquivo(
        "Esse arquivo não é uma lista de contatos. O que o iCloud exporta termina em .vcf.",
      );
      return;
    }

    const nova = ler(texto, cadastrados);
    setLeitura(nova);
    // Ninguém marcado de início: são centenas de nomes, e a escolha é sua.
    // Deixar tudo marcado convidaria a importar o dentista.
    setMarcados(new Set());
  }

  // Memorizado porque o filtro abaixo depende dele: sem isto, `novos` seria
  // uma lista nova a cada tecla digitada e a filtragem inteira refaria junto.
  const novos = useMemo(
    () => leitura?.candidatos.filter((c) => !c.jaExiste) ?? [],
    [leitura],
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return novos;
    const digitos = termo.replace(/\D/g, "");
    return novos.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (digitos.length >= 3 && c.telefone.includes(digitos)),
    );
  }, [novos, busca]);

  function alternar(telefone: string) {
    setMarcados((antes) => {
      const depois = new Set(antes);
      if (depois.has(telefone)) depois.delete(telefone);
      else depois.add(telefone);
      return depois;
    });
  }

  function marcarVisiveis(marcar: boolean) {
    setMarcados((antes) => {
      const depois = new Set(antes);
      for (const c of visiveis) {
        if (marcar) depois.add(c.telefone);
        else depois.delete(c.telefone);
      }
      return depois;
    });
  }

  const escolhidos = novos.filter((c) => marcados.has(c.telefone));

  if (resultado.ok) {
    return (
      <Cartao className="px-5 py-6">
        <p className="text-base font-medium text-texto">
          {resultado.criados === 0
            ? "Nenhuma cliente nova foi criada."
            : `${resultado.criados} cliente${resultado.criados === 1 ? "" : "s"} ${
                resultado.criados === 1 ? "cadastrada" : "cadastradas"
              }.`}
        </p>
        {resultado.jaExistiam ? (
          <p className="mt-1 text-sm text-texto-fraco">
            {resultado.jaExistiam} {resultado.jaExistiam === 1 ? "já estava" : "já estavam"} no
            cadastro e {resultado.jaExistiam === 1 ? "foi deixada" : "foram deixadas"} como {" "}
            {resultado.jaExistiam === 1 ? "está" : "estão"}.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/clientes"
            className="inline-flex items-center rounded-lg bg-acao px-4 py-2 text-sm font-medium text-acao-texto transition hover:bg-acao-forte"
          >
            Ver clientes
          </Link>
          <button
            type="button"
            onClick={() => {
              setLeitura(null);
              setMarcados(new Set());
              setBusca("");
            }}
            className="inline-flex items-center rounded-lg border border-borda px-4 py-2 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
          >
            Importar outro arquivo
          </button>
        </div>
      </Cartao>
    );
  }

  return (
    <>
      {resultado.erro && <Aviso>{resultado.erro}</Aviso>}
      {erroArquivo && <Aviso>{erroArquivo}</Aviso>}

      <Cartao className="mb-5 px-5 py-5">
        <h2 className="text-sm font-semibold text-texto">Como pegar o arquivo no iPhone</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-texto-fraco">
          <li>
            No Safari, abra <span className="font-medium text-texto-suave">icloud.com/contacts</span>{" "}
            e entre com seu Apple ID.
          </li>
          <li>Toque no ícone de engrenagem e escolha “Selecionar todos”.</li>
          <li>Na engrenagem de novo, escolha “Exportar vCard”.</li>
          <li>Salve em Arquivos e volte aqui para escolher esse arquivo.</li>
        </ol>
        <p className="mt-3 text-xs text-texto-fraco">
          O arquivo é lido dentro do seu aparelho. Só sai daqui o que você marcar.
        </p>
      </Cartao>

      <Cartao className="mb-5 px-5 py-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-texto-suave">
            Arquivo de contatos (.vcf)
          </span>
          <input
            type="file"
            accept=".vcf,text/vcard,text/x-vcard,text/directory"
            onChange={(e) => void escolherArquivo(e.target.files?.[0])}
            className="w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-sm text-texto-suave file:mr-3 file:rounded-md file:border-0 file:bg-superficie-suave file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-texto-suave"
          />
        </label>
      </Cartao>

      {leitura && (
        <>
          <p className="mb-4 text-sm text-texto-fraco">
            {leitura.totalNoArquivo} contato{leitura.totalNoArquivo === 1 ? "" : "s"} no arquivo ·{" "}
            {novos.length} {novos.length === 1 ? "pode virar cliente" : "podem virar clientes"}
            {leitura.candidatos.length - novos.length > 0 &&
              ` · ${leitura.candidatos.length - novos.length} já cadastrad${
                leitura.candidatos.length - novos.length === 1 ? "a" : "as"
              }`}
            {leitura.descartados > 0 &&
              ` · ${leitura.descartados} sem número do Brasil, fora da lista`}
          </p>

          {novos.length === 0 ? (
            <Vazio
              titulo="Nada novo neste arquivo"
              descricao="Todos os contatos com número brasileiro já estão no seu cadastro."
            />
          ) : (
            <form action={enviar}>
              <input
                type="hidden"
                name="escolhidos"
                value={JSON.stringify(
                  escolhidos.map((c) => ({ nome: c.nome, telefone: c.telefone })),
                )}
              />

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="min-w-50 flex-1">
                  <Entrada
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Filtrar por nome ou número..."
                    aria-label="Filtrar contatos"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => marcarVisiveis(true)}
                  className="rounded-lg border border-borda px-3 py-2 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
                >
                  Marcar {busca ? "os filtrados" : "todos"}
                </button>
                <button
                  type="button"
                  onClick={() => marcarVisiveis(false)}
                  className="rounded-lg border border-borda px-3 py-2 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
                >
                  Desmarcar
                </button>
              </div>

              <Cartao className="divide-y divide-borda-suave">
                {visiveis.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-texto-fraco">
                    Nenhum contato bate com “{busca}”.
                  </p>
                ) : (
                  visiveis.map((c) => (
                    <label
                      key={c.telefone}
                      className="flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-superficie-suave"
                    >
                      <input
                        type="checkbox"
                        checked={marcados.has(c.telefone)}
                        onChange={() => alternar(c.telefone)}
                        className="size-4 shrink-0 accent-acao"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-texto">
                          {c.nome}
                        </span>
                        <span className="block text-sm text-texto-fraco">
                          {formatarTelefone(c.telefone)}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </Cartao>

              {/* Fica colado no rodapé: com duzentos nomes na tela, um botão no
                  fim da lista obrigaria a rolar tudo de volta para enviar. */}
              <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borda bg-superficie/95 px-4 py-3 shadow-sm backdrop-blur">
                <span className="text-sm text-texto-suave">
                  {escolhidos.length === 0
                    ? "Nenhum marcado"
                    : `${escolhidos.length} marcad${escolhidos.length === 1 ? "o" : "os"}`}
                </span>
                {escolhidos.length > 0 ? (
                  <BotaoSubmit enviando="Importando...">
                    Importar {escolhidos.length}
                  </BotaoSubmit>
                ) : (
                  <Etiqueta>Marque quem você quer cadastrar</Etiqueta>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </>
  );
}
