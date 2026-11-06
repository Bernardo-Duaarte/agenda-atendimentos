import { redirect } from "next/navigation";
import { entrar } from "./acoes";
import { FormularioEntrar } from "./formulario";
import { temSessao } from "@/lib/sessao";
import { IMAGENS, variavelCss } from "@/lib/imagens";

export default async function PaginaEntrar() {
  // Quem já entrou não precisa ver esta tela de novo.
  if (await temSessao()) redirect("/");

  return (
    /* Escura nos dois temas: a foto por baixo não muda de cor, e uma coluna
       clara ao lado dela brigaria com a imagem. */
    <main className="entrada-vidro relative flex min-h-dvh flex-col justify-end px-4 pb-12 sm:justify-center sm:pb-0">
      {/* As três camadas do fundo: cor base, foto e véu. O véu é o que mantém
          o texto legível sobre qualquer parte da imagem. */}
      <div className="entrada-base" aria-hidden />
      {IMAGENS.retrato && (
        <>
          <div className="entrada-foto" style={variavelCss("--img-retrato", IMAGENS.retrato)} aria-hidden />
          <div className="entrada-veu" aria-hidden />
        </>
      )}

      <div className="w-full max-w-sm sm:ml-[8vw] md:ml-[10vw]">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight text-white drop-shadow-sm">
          Agenda
        </h1>
        <p className="mb-6 text-sm text-white/70">Sistema privado. Entre para continuar.</p>

        {/* Vidro, e não o cartão comum: sobre a foto, um retângulo opaco
            recortaria a imagem em vez de repousar sobre ela. */}
        <div className="entrada-vidro rounded-2xl border border-white/15 bg-black/35 p-6 shadow-2xl backdrop-blur-xl">
          <FormularioEntrar acao={entrar} />
        </div>
      </div>
    </main>
  );
}
