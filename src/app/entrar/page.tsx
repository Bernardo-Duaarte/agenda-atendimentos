import { redirect } from "next/navigation";
import { entrar } from "./acoes";
import { FormularioEntrar } from "./formulario";
import { Cartao } from "@/components/ui";
import { temSessao } from "@/lib/sessao";

export default async function PaginaEntrar() {
  // Quem já entrou não precisa ver esta tela de novo.
  if (await temSessao()) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight text-marca">
          Agenda
        </h1>
        <p className="mb-6 text-center text-sm text-texto-fraco">
          Sistema privado. Entre para continuar.
        </p>

        <Cartao className="p-6">
          <FormularioEntrar acao={entrar} />
        </Cartao>
      </div>
    </main>
  );
}
