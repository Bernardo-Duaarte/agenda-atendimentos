"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AreaTexto, Aviso, Campo, Cartao, Entrada } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

export type ClienteEmEdicao = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  dataNascimento: string | null;
  tomPele: string | null;
  alergias: string | null;
  observacoes: string | null;
  enderecoPadrao: string | null;
};

export function FormularioCliente({
  acao,
  cliente,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  cliente?: ClienteEmEdicao;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const erro = (campo: string) => estado.erros?.[campo];

  // O telefone é guardado em E.164 (5511999999999). Na tela mostramos só
  // DDD + número, que é como se digita.
  const telefoneVisivel = cliente?.telefone.replace(/^55/, "") ?? "";

  return (
    <form action={enviar} className="space-y-6">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}

      <Cartao className="space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Contato</h2>

        <Campo rotulo="Nome" erro={erro("nome")}>
          <Entrada name="nome" defaultValue={cliente?.nome} erro={!!erro("nome")} autoFocus placeholder="Maria Silva" />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Telefone" erro={erro("telefone")} dica="Com DDD. É por aqui que sai o lembrete no WhatsApp.">
            <Entrada
              name="telefone"
              defaultValue={telefoneVisivel}
              erro={!!erro("telefone")}
              inputMode="tel"
              placeholder="(11) 99999-9999"
            />
          </Campo>

          <Campo rotulo="Data de nascimento" erro={erro("dataNascimento")} dica="Opcional.">
            <Entrada type="date" name="dataNascimento" defaultValue={cliente?.dataNascimento ?? ""} />
          </Campo>
        </div>

        <Campo rotulo="E-mail" erro={erro("email")} dica="Opcional.">
          <Entrada type="email" name="email" defaultValue={cliente?.email ?? ""} placeholder="maria@email.com" />
        </Campo>

        <Campo rotulo="Endereço" erro={erro("enderecoPadrao")} dica="Sugerido automaticamente nos atendimentos em domicílio.">
          <Entrada name="enderecoPadrao" defaultValue={cliente?.enderecoPadrao ?? ""} placeholder="Rua, número, bairro" />
        </Campo>
      </Cartao>

      <Cartao className="space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Ficha técnica</h2>
          <p className="mt-1 text-sm text-zinc-500">É o que você quer ver antes de começar o atendimento.</p>
        </div>

        <Campo rotulo="Tom de pele" erro={erro("tomPele")}>
          <Entrada name="tomPele" defaultValue={cliente?.tomPele ?? ""} placeholder="Ex: bege médio, subtom quente" />
        </Campo>

        <Campo rotulo="Alergias e sensibilidades" erro={erro("alergias")}>
          <AreaTexto name="alergias" defaultValue={cliente?.alergias ?? ""} placeholder="Ex: não usar cola de cílios com látex" />
        </Campo>

        <Campo rotulo="Observações" erro={erro("observacoes")}>
          <AreaTexto name="observacoes" defaultValue={cliente?.observacoes ?? ""} placeholder="Prefere make leve, chega sempre adiantada..." />
        </Campo>
      </Cartao>

      <div className="flex items-center gap-3">
        <BotaoSubmit>{cliente ? "Salvar alterações" : "Cadastrar cliente"}</BotaoSubmit>
        <Link href="/clientes" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
